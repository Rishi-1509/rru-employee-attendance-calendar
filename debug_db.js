const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function check() {
    try {
        console.log("Users in DB:");
        const res = await pool.query("SELECT id, username, full_name, role FROM users LIMIT 20");
        console.log(JSON.stringify(res.rows, null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

check();
