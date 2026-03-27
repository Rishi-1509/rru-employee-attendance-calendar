const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
const db = new Database(path.join(__dirname, '..', 'database', 'leave_calendar.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// GET /api/leaves?month=MM&year=YYYY — get all leaves for a month
router.get('/', requireAuth, (req, res) => {
    try {
        const { month, year } = req.query;

        if (!month || !year) {
            return res.status(400).json({ error: 'Month and year are required.' });
        }

        const mm = String(month).padStart(2, '0');
        const startDate = `${year}-${mm}-01`;
        const endDate = `${year}-${mm}-31`;

        const leaves = db.prepare(`
            SELECT l.id, l.faculty_id, l.leave_date, l.leave_type, l.reason,
                   l.created_at, l.updated_at,
                   u.full_name AS faculty_name, u.department, u.designation,
                   m.full_name AS marked_by_name
            FROM leaves l
            JOIN users u ON l.faculty_id = u.id
            JOIN users m ON l.marked_by = m.id
            WHERE l.leave_date >= ? AND l.leave_date <= ?
            ORDER BY l.leave_date ASC, u.full_name ASC
        `).all(startDate, endDate);

        res.json({ leaves });
    } catch (err) {
        console.error('Leaves fetch error:', err);
        res.status(500).json({ error: 'Failed to fetch leave records.' });
    }
});

// GET /api/leaves/date/:date — get all absentees on a specific date
router.get('/date/:date', requireAuth, (req, res) => {
    try {
        const { date } = req.params;

        const leaves = db.prepare(`
            SELECT l.id, l.faculty_id, l.leave_date, l.leave_type, l.reason,
                   l.created_at, l.updated_at,
                   u.full_name AS faculty_name, u.department, u.designation
            FROM leaves l
            JOIN users u ON l.faculty_id = u.id
            WHERE l.leave_date = ?
            ORDER BY u.full_name ASC
        `).all(date);

        res.json({ leaves, date, total_absent: leaves.length });
    } catch (err) {
        console.error('Date leaves error:', err);
        res.status(500).json({ error: 'Failed to fetch leave records for this date.' });
    }
});

// POST /api/leaves — mark faculty as absent (admin only)
router.post('/', requireAuth, requireRole('admin'), (req, res) => {
    try {
        const { faculty_id, leave_date, leave_type, reason } = req.body;

        if (!faculty_id || !leave_date || !leave_type) {
            return res.status(400).json({ error: 'faculty_id, leave_date, and leave_type are required.' });
        }

        // Validate faculty exists
        const faculty = db.prepare('SELECT id FROM users WHERE id = ? AND role = ?').get(faculty_id, 'faculty');
        if (!faculty) {
            return res.status(404).json({ error: 'Faculty member not found.' });
        }

        // Check for duplicate
        const existing = db.prepare('SELECT id FROM leaves WHERE faculty_id = ? AND leave_date = ?').get(faculty_id, leave_date);
        if (existing) {
            return res.status(409).json({ error: 'Leave already recorded for this faculty on this date.' });
        }

        const result = db.prepare(`
            INSERT INTO leaves (faculty_id, leave_date, leave_type, reason, marked_by)
            VALUES (?, ?, ?, ?, ?)
        `).run(faculty_id, leave_date, leave_type, reason || '', req.session.user.id);

        res.status(201).json({
            message: 'Leave recorded successfully.',
            leave_id: result.lastInsertRowid
        });
    } catch (err) {
        console.error('Leave create error:', err);
        res.status(500).json({ error: 'Failed to record leave.' });
    }
});

// POST /api/leaves/bulk — mark multiple faculty as absent on a date (admin only)
router.post('/bulk', requireAuth, requireRole('admin'), (req, res) => {
    try {
        const { faculty_ids, leave_date, leave_type, reason } = req.body;

        if (!faculty_ids || !Array.isArray(faculty_ids) || faculty_ids.length === 0 || !leave_date || !leave_type) {
            return res.status(400).json({ error: 'faculty_ids (array), leave_date, and leave_type are required.' });
        }

        const insertStmt = db.prepare(`
            INSERT OR IGNORE INTO leaves (faculty_id, leave_date, leave_type, reason, marked_by)
            VALUES (?, ?, ?, ?, ?)
        `);

        const insertMany = db.transaction((ids) => {
            let inserted = 0;
            for (const fid of ids) {
                const result = insertStmt.run(fid, leave_date, leave_type, reason || '', req.session.user.id);
                if (result.changes > 0) inserted++;
            }
            return inserted;
        });

        const count = insertMany(faculty_ids);

        res.status(201).json({
            message: `${count} leave record(s) created successfully.`,
            inserted: count
        });
    } catch (err) {
        console.error('Bulk leave error:', err);
        res.status(500).json({ error: 'Failed to record bulk leaves.' });
    }
});

// PUT /api/leaves/:id — update a leave record (admin only)
router.put('/:id', requireAuth, requireRole('admin'), (req, res) => {
    try {
        const { leave_type, reason } = req.body;
        const { id } = req.params;

        const existing = db.prepare('SELECT * FROM leaves WHERE id = ?').get(id);
        if (!existing) {
            return res.status(404).json({ error: 'Leave record not found.' });
        }

        db.prepare(`
            UPDATE leaves
            SET leave_type = COALESCE(?, leave_type),
                reason = COALESCE(?, reason),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(leave_type || null, reason !== undefined ? reason : null, id);

        res.json({ message: 'Leave record updated successfully.' });
    } catch (err) {
        console.error('Leave update error:', err);
        res.status(500).json({ error: 'Failed to update leave record.' });
    }
});

// DELETE /api/leaves/:id — remove a leave record (admin only)
router.delete('/:id', requireAuth, requireRole('admin'), (req, res) => {
    try {
        const { id } = req.params;

        const existing = db.prepare('SELECT * FROM leaves WHERE id = ?').get(id);
        if (!existing) {
            return res.status(404).json({ error: 'Leave record not found.' });
        }

        db.prepare('DELETE FROM leaves WHERE id = ?').run(id);

        res.json({ message: 'Leave record deleted successfully.' });
    } catch (err) {
        console.error('Leave delete error:', err);
        res.status(500).json({ error: 'Failed to delete leave record.' });
    }
});

// DELETE /api/leaves/date/:date/faculty/:facultyId — remove leave by date & faculty (admin only)
router.delete('/date/:date/faculty/:facultyId', requireAuth, requireRole('admin'), (req, res) => {
    try {
        const { date, facultyId } = req.params;

        const existing = db.prepare('SELECT * FROM leaves WHERE leave_date = ? AND faculty_id = ?').get(date, facultyId);
        if (!existing) {
            return res.status(404).json({ error: 'Leave record not found.' });
        }

        db.prepare('DELETE FROM leaves WHERE leave_date = ? AND faculty_id = ?').run(date, facultyId);

        res.json({ message: 'Leave record removed successfully.' });
    } catch (err) {
        console.error('Leave remove error:', err);
        res.status(500).json({ error: 'Failed to remove leave record.' });
    }
});

module.exports = router;
