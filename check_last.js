const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function check() {
    try {
        console.log("Checking last 10 records...");
        const result = await pool.query("SELECT l.*, TO_CHAR(l.leave_date, 'YYYY-MM-DD') as fmt FROM leaves l ORDER BY id DESC LIMIT 10");
        console.log(JSON.stringify(result.rows, null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

check();
