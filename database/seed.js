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
        console.log('Schema created/verified successfully.');

        // Migration: Add total_leaves column if it doesn't exist
        try {
            await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS total_leaves INTEGER DEFAULT 25');
            console.log('Total leaves column verified/added.');
        } catch (e) {
            console.log('Note: total_leaves column already exists or error adding it');
        }

        // Hash password
        const hash = bcrypt.hashSync('password123', 10);

        // Insert admin user
        const insertUserQuery = `
            INSERT INTO users (username, password_hash, full_name, role, department, designation, email, total_leaves)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (username) DO UPDATE SET
                full_name = EXCLUDED.full_name,
                role = EXCLUDED.role,
                department = EXCLUDED.department,
                designation = EXCLUDED.designation,
                email = EXCLUDED.email,
                total_leaves = EXCLUDED.total_leaves
            RETURNING id
        `;

        await pool.query(insertUserQuery, ['admin', hash, 'System Administrator', 'admin', 'Administration', 'Admin', 'admin@university.edu', 30]);
        console.log('Admin user created: admin / password123');

        // Insert authority users 
        await pool.query(insertUserQuery, ['py_director', hash, 'G Arsh', 'authority', 'Criminology', 'Director', '', 30]);
        await pool.query(insertUserQuery, ['py_ad', hash, 'Subash.I Nethaji', 'authority', 'Criminology', 'Assitant Director', '', 30]);
        console.log('Authority users created: py_director, py_ad / password123');

        // Insert 45 faculty members
        const facultyMembers = [
            { username: 'faculty1', name: 'Chakravarthi Midhun', dept: 'Criminology', designation: 'Research officer', totalLeaves: 25 },
            { username: 'faculty2', name: 'P.Suriya', dept: 'Cybersecurity', designation: 'TCRO-IT', totalLeaves: 22 },
            { username: 'faculty3', name: 'DR S.Abarna', dept: 'Cybersecurity', designation: 'Assistant Professor', totalLeaves: 24 },
            { username: 'faculty4', name: 'Shankar Sharuhasa', dept: 'Corporate Security', designation: 'Assistant Professor', totalLeaves: 20 },
            { username: 'faculty5', name: 'Sarathkumar', dept: 'non tecaching faculty', designation: 'Professor', totalLeaves: 18 },
            { username: 'faculty6', name: 'Subash.I Nethaji', dept: 'Criminology', designation: 'Assistant Professor', totalLeaves: 25 },
            { username: 'faculty7', name: 'G Arsh', dept: 'Criminology', designation: 'Associate Professor', totalLeaves: 25 },
            { username: 'faculty8', name: 'Emima Royal', dept: 'Library& IA', designation: 'Librarian', totalLeaves: 22 },
            { username: 'faculty9', name: 'Ram Kumar', dept: 'non teaching faculty', designation: 'Junior Engineer', totalLeaves: 20 },
            { username: 'faculty10', name: 'Mahendran', dept: 'Administration', designation: 'Admin', totalLeaves: 25 },
            { username: 'faculty11', name: 'N.Rajesh', dept: 'Administration', designation: 'Admin', totalLeaves: 25 },
            { username: 'faculty12', name: 'Nidhya', dept: 'Sports', designation: 'STO', totalLeaves: 25 },
            { username: 'faculty13', name: 'Srinivasan', dept: 'non teaching faculty', designation: 'Electrician&plumber', totalLeaves: 20 },
            { username: 'faculty14', name: 'Faculty 14', dept: 'English', designation: 'Professor', totalLeaves: 25 },
            { username: 'faculty15', name: 'Faculty 15', dept: 'English', designation: 'Assistant Professor', totalLeaves: 25 },
            { username: 'faculty16', name: 'Faculty 16', dept: 'English', designation: 'Associate Professor', totalLeaves: 25 },
            { username: 'faculty17', name: 'Faculty 17', dept: 'Economics', designation: 'Professor', totalLeaves: 25 },
            { username: 'faculty18', name: 'Faculty 18', dept: 'Economics', designation: 'Assistant Professor', totalLeaves: 25 },
            { username: 'faculty19', name: 'Faculty 19', dept: 'Economics', designation: 'Associate Professor', totalLeaves: 25 },
            { username: 'faculty20', name: 'Faculty 20', dept: 'History', designation: 'Professor', totalLeaves: 25 },
            { username: 'faculty21', name: 'Faculty 21', dept: 'Law', designation: 'Assistant Professor', totalLeaves: 25 },
            { username: 'faculty22', name: 'Faculty 22', dept: 'Law', designation: 'Associate Professor', totalLeaves: 25 },
            { username: 'faculty23', name: 'Faculty 23', dept: 'Psychology', designation: 'Professor', totalLeaves: 25 },
            { username: 'faculty24', name: 'Faculty 24', dept: 'Psychology', designation: 'Assistant Professor', totalLeaves: 25 },
            { username: 'faculty25', name: 'Faculty 25', dept: 'Sociology', designation: 'Professor', totalLeaves: 25 },
            { username: 'faculty26', name: 'Faculty 26', dept: 'Sociology', designation: 'Assistant Professor', totalLeaves: 25 },
            { username: 'faculty27', name: 'Faculty 27', dept: 'Political Science', designation: 'Professor', totalLeaves: 25 },
            { username: 'faculty28', name: 'Faculty 28', dept: 'Political Science', designation: 'Assistant Professor', totalLeaves: 25 },
            { username: 'faculty29', name: 'Faculty 29', dept: 'Languages', designation: 'Professor', totalLeaves: 25 },
            { username: 'faculty30', name: 'Faculty 30', dept: 'Languages', designation: 'Assistant Professor', totalLeaves: 25 },
            { username: 'faculty31', name: 'Faculty 31', dept: 'Police Science', designation: 'Professor', totalLeaves: 25 },
            { username: 'faculty32', name: 'Faculty 32', dept: 'Police Science', designation: 'Assistant Professor', totalLeaves: 25 },
            { username: 'faculty33', name: 'Faculty 33', dept: 'Digital Forensics', designation: 'Professor', totalLeaves: 25 },
            { username: 'faculty34', name: 'Faculty 34', dept: 'Digital Forensics', designation: 'Assistant Professor', totalLeaves: 25 },
            { username: 'faculty35', name: 'Faculty 35', dept: 'Forensic Science', designation: 'Professor', totalLeaves: 25 },
            { username: 'faculty36', name: 'Faculty 36', dept: 'Forensic Science', designation: 'Assistant Professor', totalLeaves: 25 },
            { username: 'faculty37', name: 'Faculty 37', dept: 'Criminology', designation: 'Assistant Professor', totalLeaves: 25 },
            { username: 'faculty38', name: 'Faculty 38', dept: 'Cybersecurity', designation: 'Professor', totalLeaves: 25 },
            { username: 'faculty39', name: 'Faculty 39', dept: 'Information Security', designation: 'Professor', totalLeaves: 25 },
            { username: 'faculty40', name: 'Faculty 40', dept: 'Information Security', designation: 'Assistant Professor', totalLeaves: 25 },
            { username: 'faculty41', name: 'Faculty 41', dept: 'Coastal Security', designation: 'Professor', totalLeaves: 25 },
            { username: 'faculty42', name: 'Faculty 42', dept: 'Coastal Security', designation: 'Assistant Professor', totalLeaves: 25 },
            { username: 'faculty43', name: 'Faculty 43', dept: 'Physical Education', designation: 'Director', totalLeaves: 25 },
            { username: 'faculty44', name: 'Faculty 44', dept: 'Library', designation: 'Assistant Librarian', totalLeaves: 25 },
            { username: 'faculty45', name: 'Faculty 45', dept: 'Administration', designation: 'Registrar', totalLeaves: 30 },
        ];

        for (const m of facultyMembers) {
            await pool.query(insertUserQuery, [m.username, hash, m.name, 'faculty', m.dept, m.designation, `${m.username}@university.edu`, m.totalLeaves || 25]);
        }
        console.log(`${facultyMembers.length} faculty members created (faculty1..faculty45 / password123)`);

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
