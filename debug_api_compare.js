const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function fetchMonth(month, year) {
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

    const result = await pool.query(`
        SELECT l.id, l.faculty_id, TO_CHAR(l.leave_date::DATE, 'YYYY-MM-DD') as leave_date, l.leave_type, l.reason,
               COALESCE(u.full_name, 'Unknown Faculty') AS faculty_name, u.department, u.designation
        FROM leaves l
        JOIN users u ON l.faculty_id = u.id
        WHERE l.leave_date::DATE >= $1::DATE AND l.leave_date::DATE < $2::DATE
        ORDER BY l.leave_date ASC
    `, [startDate, endDateBound]);
    
    return result.rows;
}

async function compare() {
    try {
        const year = '2026';
        const march = await fetchMonth(3, year);
        const april = await fetchMonth(4, year);

        console.log(`March (Odd): Found ${march.length} records. First record: ${JSON.stringify(march[0])}`);
        console.log(`April (Even): Found ${april.length} records. First record: ${JSON.stringify(april[0])}`);

        // Check for any formatting differences
        if (march.length > 0 && april.length > 0) {
            console.log(`\nMarch leave_date type: ${typeof march[0].leave_date}, value: "${march[0].leave_date}"`);
            console.log(`April leave_date type: ${typeof april[0].leave_date}, value: "${april[0].leave_date}"`);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

compare();
