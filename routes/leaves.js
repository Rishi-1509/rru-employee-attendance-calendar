const express = require('express');
const db = require('../database/db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/leaves?month=MM&year=YYYY — get all leaves for a month
router.get('/', requireAuth, async (req, res) => {
    try {
        const { month, year } = req.query;

        if (!month || !year) {
            return res.status(400).json({ error: 'Month and year are required.' });
        }

        const mm = String(month).padStart(2, '0');
        const startDate = `${year}-${mm}-01`;
        
        // Calculate the first day of the NEXT month to use as a non-inclusive upper bound
        let nextYear = parseInt(year);
        let nextMonth = parseInt(month) + 1;
        if (nextMonth > 12) {
            nextMonth = 1;
            nextYear++;
        }
        const nextMonthStr = String(nextMonth).padStart(2, '0');
        const endDateBound = `${nextYear}-${nextMonthStr}-01`;

        const result = await db.query(`
            SELECT l.id, l.faculty_id, TO_CHAR(l.leave_date::DATE, 'YYYY-MM-DD') as leave_date, l.leave_type, l.reason,
                   l.created_at, l.updated_at,
                   COALESCE(u.full_name, 'Unknown Faculty') AS faculty_name, u.department, u.designation,
                   COALESCE(m.full_name, 'Unknown Admin') AS marked_by_name,
                   h1.full_name AS alt_h1_name, h2.full_name AS alt_h2_name,
                   h3.full_name AS alt_h3_name, h4.full_name AS alt_h4_name,
                   h5.full_name AS alt_h5_name
            FROM leaves l
            JOIN users u ON l.faculty_id = u.id
            LEFT JOIN users m ON l.marked_by = m.id
            LEFT JOIN users h1 ON l.alt_h1 = h1.id
            LEFT JOIN users h2 ON l.alt_h2 = h2.id
            LEFT JOIN users h3 ON l.alt_h3 = h3.id
            LEFT JOIN users h4 ON l.alt_h4 = h4.id
            LEFT JOIN users h5 ON l.alt_h5 = h5.id
            WHERE l.leave_date::DATE >= $1::DATE AND l.leave_date::DATE < $2::DATE
            ORDER BY l.leave_date ASC, u.full_name ASC
        `, [startDate, endDateBound]);

        console.log(`[API/leaves/GET] Fetched ${result.rows.length} records for period ${startDate} to ${endDateBound}`);
        res.json({ leaves: result.rows });
    } catch (err) {
        console.error('Leaves fetch error:', err);
        res.status(500).json({ error: 'Failed to fetch leave records.' });
    }
});

// GET /api/leaves/date/:date — get all absentees on a specific date
router.get('/date/:date', requireAuth, async (req, res) => {
    try {
        const { date } = req.params;

        const result = await db.query(`
            SELECT l.id, l.faculty_id, TO_CHAR(l.leave_date::DATE, 'YYYY-MM-DD') as leave_date, l.leave_type, l.reason,
                   l.created_at, l.updated_at,
                   u.full_name AS faculty_name, u.department, u.designation,
                   h1.full_name AS alt_h1_name, h2.full_name AS alt_h2_name,
                   h3.full_name AS alt_h3_name, h4.full_name AS alt_h4_name,
                   h5.full_name AS alt_h5_name
            FROM leaves l
            JOIN users u ON l.faculty_id = u.id
            LEFT JOIN users h1 ON l.alt_h1 = h1.id
            LEFT JOIN users h2 ON l.alt_h2 = h2.id
            LEFT JOIN users h3 ON l.alt_h3 = h3.id
            LEFT JOIN users h4 ON l.alt_h4 = h4.id
            LEFT JOIN users h5 ON l.alt_h5 = h5.id
            WHERE l.leave_date::DATE = $1::DATE
            ORDER BY u.full_name ASC
        `, [date]);

        const leaves = result.rows;
        res.json({ leaves, date, total_absent: leaves.length });
    } catch (err) {
        console.error('Date leaves error:', err);
        res.status(500).json({ error: 'Failed to fetch leave records for this date.' });
    }
});

// POST /api/leaves — mark faculty as absent (admin only)
router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const { faculty_id, leave_date, leave_type, reason, alt_h1, alt_h2, alt_h3, alt_h4, alt_h5 } = req.body;

        if (!faculty_id || !leave_date || !leave_type) {
            return res.status(400).json({ error: 'faculty_id, leave_date, and leave_type are required.' });
        }

        // Validate faculty exists
        const facultyRes = await db.query('SELECT id FROM users WHERE id = $1 AND role = $2', [faculty_id, 'faculty']);
        if (facultyRes.rows.length === 0) {
            return res.status(404).json({ error: 'Faculty member not found.' });
        }

        // Check for duplicate
        const existingRes = await db.query('SELECT id FROM leaves WHERE faculty_id = $1 AND leave_date = $2', [faculty_id, leave_date]);
        if (existingRes.rows.length > 0) {
            return res.status(409).json({ error: 'Leave already recorded for this faculty on this date.' });
        }

        const insertRes = await db.query(`
            INSERT INTO leaves (
                faculty_id, leave_date, leave_type, reason, marked_by,
                alt_h1, alt_h2, alt_h3, alt_h4, alt_h5
            )
            VALUES ($1, TO_DATE($2, 'YYYY-MM-DD'), $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id
        `, [
            faculty_id, leave_date, leave_type, reason || '', req.session.user.id,
            alt_h1 || null, alt_h2 || null, alt_h3 || null, alt_h4 || null, alt_h5 || null
        ]);

        res.status(201).json({
            message: 'Leave recorded successfully.',
            leave_id: insertRes.rows[0].id
        });
    } catch (err) {
        console.error('Leave create error:', err);
        res.status(500).json({ error: 'Failed to record leave.' });
    }
});

// POST /api/leaves/bulk — mark multiple faculty as absent on a date (admin only)
router.post('/bulk', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const { faculty_ids, leave_date, leave_type, reason, alt_h1, alt_h2, alt_h3, alt_h4, alt_h5 } = req.body;
        
        if (!faculty_ids || !Array.isArray(faculty_ids) || faculty_ids.length === 0 || !leave_date || !leave_type) {
            return res.status(400).json({ error: 'faculty_ids (array), leave_date, and leave_type are required.' });
        }

        const insertQuery = `
            INSERT INTO leaves (
                faculty_id, leave_date, leave_type, reason, marked_by,
                alt_h1, alt_h2, alt_h3, alt_h4, alt_h5
            )
            VALUES ($1, TO_DATE($2, 'YYYY-MM-DD'), $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (faculty_id, leave_date) DO NOTHING RETURNING id
        `;

        console.log(`[API/leaves/bulk] Saving leaves for date: "${leave_date}", faculty_count: ${faculty_ids.length}, type: ${leave_type}`);

        let insertedCount = 0;
        
        for (const fid of faculty_ids) {
            const insertRes = await db.query(insertQuery, [
                fid, leave_date, leave_type, reason || '', req.session.user.id,
                alt_h1 || null, alt_h2 || null, alt_h3 || null, alt_h4 || null, alt_h5 || null
            ]);
            if (insertRes.rowCount > 0) {
                insertedCount++;
            }
        }

        res.status(201).json({
            message: `${insertedCount} leave record(s) created successfully.`,
            inserted: insertedCount
        }); 
    } catch (err) {
        console.error('Bulk leave error:', err);
        res.status(500).json({ error: 'Failed to record bulk leaves.' });
    }
});

// PUT /api/leaves/:id — update a leave record (admin only)
router.put('/:id', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const { 
            leave_type, reason,
            alt_h1, alt_h2, alt_h3, alt_h4, alt_h5 
        } = req.body;
        const { id } = req.params;

        const existingRes = await db.query('SELECT * FROM leaves WHERE id = $1', [id]);
        if (existingRes.rows.length === 0) {
            return res.status(404).json({ error: 'Leave record not found.' });
        }

        await db.query(`
            UPDATE leaves
            SET leave_type = COALESCE($1, leave_type),
                reason = COALESCE($2, reason),
                alt_h1 = COALESCE($3, alt_h1),
                alt_h2 = COALESCE($4, alt_h2),
                alt_h3 = COALESCE($5, alt_h3),
                alt_h4 = COALESCE($6, alt_h4),
                alt_h5 = COALESCE($7, alt_h5),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $8
        `, [
            leave_type || null, 
            reason !== undefined ? reason : null,
            alt_h1 || null, alt_h2 || null, alt_h3 || null, alt_h4 || null, alt_h5 || null,
            id
        ]);

        res.json({ message: 'Leave record updated successfully.' });
    } catch (err) {
        console.error('Leave update error:', err);
        res.status(500).json({ error: 'Failed to update leave record.' });
    }
});

// DELETE /api/leaves/:id — remove a leave record (admin only)
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const { id } = req.params;

        const existingRes = await db.query('SELECT * FROM leaves WHERE id = $1', [id]);
        if (existingRes.rows.length === 0) {
            return res.status(404).json({ error: 'Leave record not found.' });
        }

        await db.query('DELETE FROM leaves WHERE id = $1', [id]);

        res.json({ message: 'Leave record deleted successfully.' });
    } catch (err) {
        console.error('Leave delete error:', err);
        res.status(500).json({ error: 'Failed to delete leave record.' });
    }
});

// DELETE /api/leaves/date/:date/faculty/:facultyId — remove leave by date & faculty (admin only)
router.delete('/date/:date/faculty/:facultyId', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const { date, facultyId } = req.params;

        const existingRes = await db.query('SELECT * FROM leaves WHERE leave_date = $1 AND faculty_id = $2', [date, facultyId]);
        if (existingRes.rows.length === 0) {
            return res.status(404).json({ error: 'Leave record not found.' });
        }

        await db.query('DELETE FROM leaves WHERE leave_date = $1 AND faculty_id = $2', [date, facultyId]);

        res.json({ message: 'Leave record removed successfully.' });
    } catch (err) {
        console.error('Leave remove error:', err);
        res.status(500).json({ error: 'Failed to remove leave record.' });
    }
});

module.exports = router;
