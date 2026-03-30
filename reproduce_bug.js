const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function reproduce() {
    try {
        const facultyId = 15;
        const date = '2026-04-30'; // Last day of an "even month" (April)
        
        console.log(`Step 1: Checking existing leave for Faculty ${facultyId} on ${date}...`);
        const existing = await pool.query('SELECT * FROM leaves WHERE faculty_id = $1 AND leave_date = $2', [facultyId, date]);
        console.log(`Existing record: ${JSON.stringify(existing.rows[0])}`);

        if (existing.rows.length === 0) {
             console.log("No record found for April 30th. Creating one...");
             await pool.query("INSERT INTO leaves (faculty_id, leave_date, leave_type, marked_by) VALUES ($1, $2, 'casual', 1)", [facultyId, date]);
        }

        console.log("\nStep 2: Attempting to UPDATE using the 'bulk' strategy (what the UI does)...");
        // The UI sends POST /api/leaves/bulk with ON CONFLICT DO NOTHING
        const resBulk = await pool.query(`
            INSERT INTO leaves (faculty_id, leave_date, leave_type, reason, marked_by)
            VALUES ($1, TO_DATE($2, 'YYYY-MM-DD'), $3, $4, $5)
            ON CONFLICT (faculty_id, leave_date) DO NOTHING RETURNING id
        `, [facultyId, date, 'medical', 'Reproduction Test', 1]);
        
        console.log(`Bulk result (returned ID): ${resBulk.rows[0]?.id || 'None (Conflict triggered DO NOTHING)'}`);

        const verified = await pool.query('SELECT * FROM leaves WHERE faculty_id = $1 AND leave_date = $2', [facultyId, date]);
        console.log(`After Bulk "Update": Type is ${verified.rows[0].leave_type} (expected 'medical' if updated, 'casual' if not)`);

        if (verified.rows[0].leave_type === 'casual') {
            console.log("\n[CONFIRMED] Bulk operation failed to update existing record.");
        }

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

reproduce();
