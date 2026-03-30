const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function check() {
    try {
        const year = '2026';
        const mm = '06'; // Testing June since I saw records there
        const startDate = `${year}-${mm}-01`;
        const nextYear = '2026';
        const nextMonthStr = '07';
        const endDateBound = `${nextYear}-${nextMonthStr}-01`;

        console.log(`Checking June 2026: ${startDate} to ${endDateBound}`);
        
        const result = await pool.query(`
            SELECT l.id, l.faculty_id, TO_CHAR(l.leave_date, 'YYYY-MM-DD') as leave_date, l.leave_type, l.reason,
                   l.created_at, l.updated_at,
                   u.full_name AS faculty_name, u.department, u.designation,
                   m.full_name AS marked_by_name
            FROM leaves l
            JOIN users u ON l.faculty_id = u.id
            LEFT JOIN users m ON l.marked_by = m.id
            WHERE l.leave_date >= $1 AND l.leave_date < $2
            ORDER BY l.leave_date ASC, u.full_name ASC
        `, [startDate, endDateBound]);

        console.log(`Query found ${result.rows.length} records.`);
        console.log(JSON.stringify(result.rows, null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

check();
