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

module.exports = router;
