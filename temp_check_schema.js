const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function check() {
    try {
        console.log("Checking constraints for 'leaves' table...");
        const res = await pool.query(`
            SELECT 
                conname as constraint_name, 
                pg_get_constraintdef(c.oid) as constraint_definition
            FROM pg_constraint c
            JOIN pg_class t ON c.conrelid = t.oid
            WHERE t.relname = 'leaves'
        `);
        console.log(JSON.stringify(res.rows, null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

check();
