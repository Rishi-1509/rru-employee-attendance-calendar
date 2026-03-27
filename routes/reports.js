const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
const db = new Database(path.join(__dirname, '..', 'database', 'leave_calendar.db'));
db.pragma('journal_mode = WAL');

// GET /api/reports/summary?from=YYYY-MM-DD&to=YYYY-MM-DD
// Returns leave summary for all faculty within a date range
router.get('/summary', requireAuth, requireRole('admin', 'authority'), (req, res) => {
    try {
        const { from, to } = req.query;

        if (!from || !to) {
            return res.status(400).json({ error: '"from" and "to" date parameters are required.' });
        }

        const summary = db.prepare(`
            SELECT
                u.id,
                u.full_name,
                u.department,
                u.designation,
                COUNT(l.id) AS total_leaves,
                SUM(CASE WHEN l.leave_type = 'casual' THEN 1 ELSE 0 END) AS casual_leaves,
                SUM(CASE WHEN l.leave_type = 'medical' THEN 1 ELSE 0 END) AS medical_leaves,
                SUM(CASE WHEN l.leave_type = 'earned' THEN 1 ELSE 0 END) AS earned_leaves,
                SUM(CASE WHEN l.leave_type = 'duty' THEN 1 ELSE 0 END) AS duty_leaves,
                SUM(CASE WHEN l.leave_type = 'other' THEN 1 ELSE 0 END) AS other_leaves
            FROM users u
            LEFT JOIN leaves l ON u.id = l.faculty_id
                AND l.leave_date >= ? AND l.leave_date <= ?
            WHERE u.role = 'faculty'
            GROUP BY u.id
            ORDER BY u.full_name ASC
        `).all(from, to);

        // Calculate working days in range (approx, excluding weekends)
        const start = new Date(from);
        const end = new Date(to);
        let workingDays = 0;
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const day = d.getDay();
            if (day !== 0 && day !== 6) workingDays++;
        }

        const enriched = summary.map(s => ({
            ...s,
            working_days: workingDays,
            present_days: workingDays - s.total_leaves,
            attendance_percentage: workingDays > 0
                ? Math.round(((workingDays - s.total_leaves) / workingDays) * 100 * 10) / 10
                : 100
        }));

        res.json({ summary: enriched, from, to, working_days: workingDays });
    } catch (err) {
        console.error('Report summary error:', err);
        res.status(500).json({ error: 'Failed to generate report summary.' });
    }
});

// GET /api/reports/faculty/:id?from=YYYY-MM-DD&to=YYYY-MM-DD
// Returns individual leave history for a faculty member
router.get('/faculty/:id', requireAuth, (req, res) => {
    try {
        const { id } = req.params;
        const { from, to } = req.query;

        // Faculty can only view their own
        if (req.session.user.role === 'faculty' && req.session.user.id !== parseInt(id)) {
            return res.status(403).json({ error: 'You can only view your own leave history.' });
        }

        const faculty = db.prepare(`
            SELECT id, full_name, department, designation
            FROM users WHERE id = ? AND role = 'faculty'
        `).get(id);

        if (!faculty) {
            return res.status(404).json({ error: 'Faculty member not found.' });
        }

        let query = `
            SELECT l.id, l.leave_date, l.leave_type, l.reason, l.created_at,
                   m.full_name AS marked_by_name
            FROM leaves l
            JOIN users m ON l.marked_by = m.id
            WHERE l.faculty_id = ?
        `;
        const params = [id];

        if (from && to) {
            query += ' AND l.leave_date >= ? AND l.leave_date <= ?';
            params.push(from, to);
        }

        query += ' ORDER BY l.leave_date DESC';

        const leaves = db.prepare(query).all(...params);

        res.json({ faculty, leaves, total: leaves.length });
    } catch (err) {
        console.error('Faculty report error:', err);
        res.status(500).json({ error: 'Failed to generate faculty report.' });
    }
});

module.exports = router;
