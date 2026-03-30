const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function check() {
    try {
        console.log("Checking exact column info for 'leaves'...");
        const res = await pool.query(`
            SELECT table_name, column_name, data_type, udt_name 
            FROM information_schema.columns 
            WHERE table_name = 'leaves' AND column_name = 'leave_date'
        `);
        console.log(JSON.stringify(res.rows, null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

check();
