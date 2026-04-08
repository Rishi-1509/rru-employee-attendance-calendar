const { Pool } = require('pg');
require('dotenv').config();

// Build connection string with libpq compatibility for Supabase pooler
let connectionString = process.env.DATABASE_URL || '';
if (connectionString && !connectionString.includes('uselibpqcompat')) {
    const separator = connectionString.includes('?') ? '&' : '?';
    connectionString += `${separator}uselibpqcompat=true`;
}

const pool = new Pool({
    connectionString,
    ssl: {
        rejectUnauthorized: false
    }
});

// Helper for simple queries
module.exports = {
    query: (text, params) => pool.query(text, params),
    pool: pool
};
