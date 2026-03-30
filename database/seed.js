const { pool } = require('./db');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

async function seed() {
    console.log('Starting database seed for PostgreSQL...');
    try {
        // Run schema
        const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
        // Removed DROP TABLE IF EXISTS for safety.
        await pool.query(schema);
        console.log('Schema created successfully.');

        // Hash password
        const hash = bcrypt.hashSync('password123', 10);

        // Insert admin user
        const insertUserQuery = `
            INSERT INTO users (username, password_hash, full_name, role, department, designation, email)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (username) DO UPDATE SET
                full_name = EXCLUDED.full_name,
                role = EXCLUDED.role,
                department = EXCLUDED.department,
                designation = EXCLUDED.designation,
                email = EXCLUDED.email
            RETURNING id
        `;

        await pool.query(insertUserQuery, ['admin', hash, 'System Administrator', 'admin', 'Administration', 'Admin', 'admin@university.edu']);
        console.log('Admin user created: admin / password123');

        // Insert authority users 
        await pool.query(insertUserQuery, ['py_director', hash, 'G Arsh', 'authority', 'Criminology', 'Director', '']);
        await pool.query(insertUserQuery, ['py_ad', hash, 'Subash.I Nethaji', 'authority', 'Criminology', 'Assitant Director', '']);
        console.log('Authority users created: py_director, py_ad / password123');

        // Insert 20 faculty members
        const facultyMembers = [
            { username: 'faculty1', name: 'Chakravarthi Midhun', dept: 'Criminology', designation: 'Research officer' },
            { username: 'faculty2', name: 'P.Suriya', dept: 'Cybersecurity', designation: 'TCRO-IT' },
            { username: 'faculty3', name: 'DR S.Abarna', dept: 'Cybersecurity', designation: 'Assistant Professor' },
            { username: 'faculty4', name: 'Shankar Sharuhasa', dept: 'Corporate Security', designation: 'Assistant Professor' },
            { username: 'faculty5', name: 'Sarathkumar', dept: 'non tecaching faculty', designation: 'Professor' },
            { username: 'faculty6', name: 'Subash.I Nethaji', dept: 'Criminology', designation: 'Assistant Professor' },
            { username: 'faculty7', name: 'G Arsh', dept: 'Criminology', designation: 'Associate Professor' },
            { username: 'faculty8', name: 'Emima Royal', dept: 'Library& IA', designation: 'Librarian' },
            { username: 'faculty9', name: 'Ram Kumar', dept: 'non teaching faculty', designation: 'Junior Engineer' },
            { username: 'faculty10', name: 'Mahendran', dept: 'Administration', designation: 'Admin' },
            { username: 'faculty11', name: 'N.Rajesh', dept: 'Administration', designation: 'Admin' },
            { username: 'faculty12', name: 'Nidhya', dept: 'Sports', designation: 'STO' },
            { username: 'faculty13', name: 'Srinivasan', dept: 'non teaching faculty', designation: 'Electrician&plumber' },
            { username: 'faculty14', name: 'ttttttt', dept: 'English', designation: 'Professor' },
            { username: 'faculty15', name: 'ttttttt', dept: 'English', designation: 'Assistant Professor' },
            { username: 'faculty16', name: 'ttttttt', dept: 'English', designation: 'Associate Professor' },
            { username: 'faculty17', name: 'ttttttt', dept: 'Economics', designation: 'Professor' },
            { username: 'faculty18', name: 'ttttttt', dept: 'Economics', designation: 'Assistant Professor' },
            { username: 'faculty19', name: 'ttttttt', dept: 'Economics', designation: 'Associate Professor' },
            { username: 'faculty20', name: 'ttttttt', dept: 'History', designation: 'Professor' },
        ];

        for (const m of facultyMembers) {
            await pool.query(insertUserQuery, [m.username, hash, m.name, 'faculty', m.dept, m.designation, `${m.username}@university.edu`]);
        }
        console.log(`${facultyMembers.length} faculty members created (faculty1..faculty20 / password123)`);

        // Insert some sample leave records for demo
        const insertLeaveQuery = `
            INSERT INTO leaves (faculty_id, leave_date, leave_type, reason, marked_by)
            VALUES ($1, $2, $3, $4, $5)
        `;

        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth(); // 0-indexed

        // Use ID 1 for admin 'marked_by' (assuming serial sequences generated sequential IDs)
        // Adjusting IDs slightly for demo (faculties started from ID 4 in original script)

        const leavesData = [
            [4, `${year}-${String(month + 1).padStart(2, '0')}-05`, 'casual', 'Personal work', 1],
            [7, `${year}-${String(month + 1).padStart(2, '0')}-05`, 'medical', 'Doctor appointment', 1],
            [12, `${year}-${String(month + 1).padStart(2, '0')}-05`, 'casual', 'Family function', 1],
            [4, `${year}-${String(month + 1).padStart(2, '0')}-10`, 'earned', 'Vacation', 1],
            [9, `${year}-${String(month + 1).padStart(2, '0')}-10`, 'duty', 'Conference attendance', 1],
            [15, `${year}-${String(month + 1).padStart(2, '0')}-15`, 'casual', 'Personal work', 1],
            [18, `${year}-${String(month + 1).padStart(2, '0')}-15`, 'medical', 'Health checkup', 1],
            [6, `${year}-${String(month + 1).padStart(2, '0')}-15`, 'other', 'Workshop', 1],
            [4, `${year}-${String(month + 1).padStart(2, '0')}-20`, 'casual', 'Personal work', 1],
            [11, `${year}-${String(month + 1).padStart(2, '0')}-20`, 'earned', 'Family vacation', 1],
            [16, `${year}-${String(month + 1).padStart(2, '0')}-20`, 'medical', 'Surgery recovery', 1],
            [20, `${year}-${String(month + 1).padStart(2, '0')}-20`, 'duty', 'Exam duty at other center', 1]
        ];

        for (const l of leavesData) {
            await pool.query(insertLeaveQuery, l);
        }

        console.log('Sample leave records created for current month.');

        console.log('\nDatabase seeded successfully!');
    } catch (err) {
        console.error('Seeding error:', err);
    } finally {
        await pool.end();
    }
}

seed();
