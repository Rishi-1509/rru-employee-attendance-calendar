const db = require('./database/db');

async function migrate() {
    try {
        console.log('Migrating database: Adding alternative faculty columns (H1-H5)...');
        
        await db.query(`
            ALTER TABLE leaves 
            ADD COLUMN IF NOT EXISTS alt_h1 INTEGER REFERENCES users(id),
            ADD COLUMN IF NOT EXISTS alt_h2 INTEGER REFERENCES users(id),
            ADD COLUMN IF NOT EXISTS alt_h3 INTEGER REFERENCES users(id),
            ADD COLUMN IF NOT EXISTS alt_h4 INTEGER REFERENCES users(id),
            ADD COLUMN IF NOT EXISTS alt_h5 INTEGER REFERENCES users(id)
        `);
        
        console.log('Migration successful: Columns added.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        process.exit();
    }
}

migrate();
