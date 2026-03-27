const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
const db = new Database(path.join(__dirname, '..', 'database', 'leave_calendar.db'));
db.pragma('journal_mode = WAL');

// GET /api/faculty — list all faculty members
router.get('/', requireAuth, (req, res) => {
    try {
        const faculty = db.prepare(`
            SELECT id, username, full_name, department, designation, email
            FROM users
            WHERE role = 'faculty'
            ORDER BY full_name ASC
        `).all();

        res.json({ faculty });
    } catch (err) {
        console.error('Faculty list error:', err);
        res.status(500).json({ error: 'Failed to fetch faculty list.' });
    }
});

// GET /api/faculty/:id — get single faculty member
router.get('/:id', requireAuth, (req, res) => {
    try {
        const faculty = db.prepare(`
            SELECT id, username, full_name, department, designation, email
            FROM users
            WHERE id = ? AND role = 'faculty'
        `).get(req.params.id);

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
