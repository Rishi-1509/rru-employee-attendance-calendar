const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function check() {
    try {
        console.log("Checking for records that might be missing 'marked_by' user...");
        const missingUsers = await pool.query(`
            SELECT l.id, l.marked_by 
            FROM leaves l 
            LEFT JOIN users m ON l.marked_by = m.id 
            WHERE m.id IS NULL
        `);
        console.log("Orphaned leaves (no matching 'marked_by' user):");
        console.log(JSON.stringify(missingUsers.rows, null, 2));

        console.log("\nChecking for records that might be missing 'faculty' user...");
        const missingFaculty = await pool.query(`
            SELECT l.id, l.faculty_id 
            FROM leaves l 
            LEFT JOIN users u ON l.faculty_id = u.id 
            WHERE u.id IS NULL
        `);
        console.log("Orphaned leaves (no matching 'faculty' user):");
        console.log(JSON.stringify(missingFaculty.rows, null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

check();
