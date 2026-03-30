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
        const month = '4'; // April
        const mm = String(month).padStart(2, '0');
        const startDate = `${year}-${mm}-01`;
        
        let nextYear = parseInt(year);
        let nextMonth = parseInt(month) + 1;
        if (nextMonth > 12) {
            nextMonth = 1;
            nextYear++;
        }
        const nextMonthStr = String(nextMonth).padStart(2, '0');
        const endDateBound = `${nextYear}-${nextMonthStr}-01`;

        console.log(`Checking ${year}-${mm} (April): ${startDate} to ${endDateBound}`);
        
        const result = await pool.query(`
            SELECT l.id, l.faculty_id, TO_CHAR(l.leave_date::DATE, 'YYYY-MM-DD') as leave_date, 
                   u.full_name AS faculty_name, u.department, u.designation
            FROM leaves l
            JOIN users u ON l.faculty_id = u.id
            WHERE l.leave_date::DATE >= $1::DATE AND l.leave_date::DATE < $2::DATE
            ORDER BY l.leave_date ASC
        `, [startDate, endDateBound]);
        
        console.log(`Found ${result.rows.length} records.`);
        console.log(JSON.stringify(result.rows, null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

check();
