const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function check() {
    try {
        console.log("Checking for March 2026 records...");
        const result = await pool.query("SELECT id, leave_date, TO_CHAR(leave_date, 'YYYY-MM-DD') as formatted, faculty_id FROM leaves WHERE TO_CHAR(leave_date, 'YYYY-MM') = '2026-03'");
        console.log(JSON.stringify(result.rows, null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

check();
