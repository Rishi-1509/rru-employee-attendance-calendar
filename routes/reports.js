const express = require('express');
const db = require('../database/db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/reports/summary?from=YYYY-MM-DD&to=YYYY-MM-DD
// Returns leave summary for all faculty within a date range
router.get('/summary', requireAuth, requireRole('admin', 'authority'), async (req, res) => {
    try {
        const { from, to } = req.query;

        if (!from || !to) {
            return res.status(400).json({ error: '"from" and "to" date parameters are required.' });
        }

        const currentYear = new Date().getFullYear();
        const result = await db.query(`
            SELECT
                u.id,
                u.full_name,
                u.department,
                u.designation,
                u.total_leaves AS annual_total,
                (SELECT COUNT(*)::int FROM leaves l2 WHERE l2.faculty_id = u.id AND EXTRACT(YEAR FROM l2.leave_date) = $3) AS total_taken_this_year,
                COUNT(l.id)::int AS leaves_in_period,
                SUM(CASE WHEN l.leave_type = 'casual' THEN 1 ELSE 0 END)::int AS casual_leaves_period,
                SUM(CASE WHEN l.leave_type = 'medical' THEN 1 ELSE 0 END)::int AS medical_leaves_period,
                SUM(CASE WHEN l.leave_type = 'earned' THEN 1 ELSE 0 END)::int AS earned_leaves_period,
                SUM(CASE WHEN l.leave_type = 'duty' THEN 1 ELSE 0 END)::int AS duty_leaves_period,
                SUM(CASE WHEN l.leave_type = 'other' THEN 1 ELSE 0 END)::int AS other_leaves_period
            FROM users u
            LEFT JOIN leaves l ON u.id = l.faculty_id
                AND l.leave_date >= $1 AND l.leave_date <= $2
            WHERE u.role = 'faculty'
            GROUP BY u.id, u.full_name, u.department, u.designation, u.total_leaves
            ORDER BY u.full_name ASC
        `, [from, to, currentYear]);

        const summary = result.rows;

        // Calculate working days in range (approx, excluding weekends)
        const start = new Date(from);
        const end = new Date(to);
        let workingDays = 0;
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const day = d.getDay();
            if (day !== 0 && day !== 6) workingDays++;
        }

        const enriched = summary.map(s => {
            const leavesInPeriod = parseInt(s.leaves_in_period) || 0;
            const annualTotal = parseInt(s.annual_total) || 0;
            const takenThisYear = parseInt(s.total_taken_this_year) || 0;
            
            return {
                ...s,
                leaves_in_period: leavesInPeriod,
                annual_total: annualTotal,
                total_taken_this_year: takenThisYear,
                remaining_leaves: Math.max(0, annualTotal - takenThisYear),
                casual_leaves: parseInt(s.casual_leaves_period) || 0,
                medical_leaves: parseInt(s.medical_leaves_period) || 0,
                earned_leaves: parseInt(s.earned_leaves_period) || 0,
                duty_leaves: parseInt(s.duty_leaves_period) || 0,
                other_leaves: parseInt(s.other_leaves_period) || 0,
                working_days: workingDays,
                present_days: workingDays - leavesInPeriod,
                attendance_percentage: workingDays > 0
                    ? Math.round(((workingDays - leavesInPeriod) / workingDays) * 100 * 10) / 10
                    : 100
            };
        });

        res.json({ summary: enriched, from, to, working_days: workingDays });
    } catch (err) {
        console.error('Report summary error:', err);
        res.status(500).json({ error: 'Failed to generate report summary.' });
    }
});

// GET /api/reports/faculty/:id?from=YYYY-MM-DD&to=YYYY-MM-DD
// Returns individual leave history for a faculty member
router.get('/faculty/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { from, to } = req.query;

        // Faculty can only view their own
        if (req.session.user.role === 'faculty' && req.session.user.id !== parseInt(id)) {
            return res.status(403).json({ error: 'You can only view your own leave history.' });
        }

        const facultyRes = await db.query(`
            SELECT id, full_name, department, designation
            FROM users WHERE id = $1 AND role = 'faculty'
        `, [id]);

        const faculty = facultyRes.rows[0];

        if (!faculty) {
            return res.status(404).json({ error: 'Faculty member not found.' });
        }

        let query = `
            SELECT l.id, TO_CHAR(l.leave_date, 'YYYY-MM-DD') as leave_date, l.leave_type, l.reason, l.created_at,
                   m.full_name AS marked_by_name,
                   h1.full_name AS alt_h1_name, h2.full_name AS alt_h2_name,
                   h3.full_name AS alt_h3_name, h4.full_name AS alt_h4_name,
                   h5.full_name AS alt_h5_name
            FROM leaves l
            JOIN users m ON l.marked_by = m.id
            LEFT JOIN users h1 ON l.alt_h1 = h1.id
            LEFT JOIN users h2 ON l.alt_h2 = h2.id
            LEFT JOIN users h3 ON l.alt_h3 = h3.id
            LEFT JOIN users h4 ON l.alt_h4 = h4.id
            LEFT JOIN users h5 ON l.alt_h5 = h5.id
            WHERE l.faculty_id = $1
        `;
        const params = [id];

        if (from && to) {
            query += ' AND l.leave_date >= $2 AND l.leave_date <= $3';
            params.push(from, to);
        }

        query += ' ORDER BY l.leave_date DESC';

        const leavesRes = await db.query(query, params);
        const leaves = leavesRes.rows;

        res.json({ faculty, leaves, total: leaves.length });
    } catch (err) {
        console.error('Faculty report error:', err);
        res.status(500).json({ error: 'Failed to generate faculty report.' });
    }
});

module.exports = router;
