const express = require('express');
const db = require('../database/db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/faculty — list all faculty members
router.get('/', requireAuth, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT id, username, full_name, department, designation, email
            FROM users
            WHERE role = 'faculty'
            ORDER BY full_name ASC
        `);

        res.json({ faculty: result.rows });
    } catch (err) {
        console.error('Faculty list error:', err);
        res.status(500).json({ error: 'Failed to fetch faculty list.' });
    }
});

// GET /api/faculty/:id — get single faculty member
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT id, username, full_name, department, designation, email
            FROM users
            WHERE id = $1 AND role = 'faculty'
        `, [req.params.id]);

        const faculty = result.rows[0];

        if (!faculty) {
            return res.status(404).json({ error: 'Faculty member not found.' });
        }

        res.json({ faculty });
    } catch (err) {
        console.error('Faculty detail error:', err);
        res.status(500).json({ error: 'Failed to fetch faculty details.' });
    }
});

// GET /api/faculty/me/summary — get attendance stats for logged-in faculty
router.get('/me/summary', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const currentYear = new Date().getFullYear();

        // 1. Get user's annual allotment and personal details
        const userResult = await db.query(`
            SELECT id, full_name, role, department, designation, total_leaves
            FROM users 
            WHERE id = $1
        `, [userId]);

        const user = userResult.rows[0];
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // 2. Count total leaves taken in the current year
        const leavesResult = await db.query(`
            SELECT COUNT(*) as taken_count 
            FROM leaves 
            WHERE faculty_id = $1 
            AND EXTRACT(YEAR FROM leave_date) = $2
        `, [userId, currentYear]);

        const takenCount = parseInt(leavesResult.rows[0].taken_count);
        const annualTotal = user.total_leaves || 25; // Fallback to 25
        const remainingLeaves = Math.max(0, annualTotal - takenCount);

        res.json({
            full_name: user.full_name,
            total_taken_this_year: takenCount,
            remaining_leaves: remainingLeaves,
            annual_total: annualTotal
        });
    } catch (err) {
        console.error('Personal summary error:', err);
        res.status(500).json({ error: 'Failed to fetch personal leave summary.' });
    }
});

module.exports = router;
