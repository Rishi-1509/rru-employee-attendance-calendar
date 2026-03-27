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
            VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id
        `;

        await pool.query(insertUserQuery, ['admin', hash, 'System Administrator', 'admin', 'Administration', 'Admin', 'admin@university.edu']);
        console.log('Admin user created: admin / password123');

        // Insert authority users
        await pool.query(insertUserQuery, ['hod_cs', hash, 'Dr. Rajesh Kumar', 'authority', 'Computer Science', 'Head of Department', 'rajesh.kumar@university.edu']);
        await pool.query(insertUserQuery, ['hr_manager', hash, 'Mrs. Priya Sharma', 'authority', 'Human Resources', 'HR Manager', 'priya.sharma@university.edu']);
        console.log('Authority users created: hod_cs, hr_manager / password123');

        // Insert 20 faculty members
        const facultyMembers = [
            { username: 'faculty1', name: 'Dr. Ananya Patel', dept: 'Computer Science', designation: 'Associate Professor' },
            { username: 'faculty2', name: 'Prof. Vikram Singh', dept: 'Computer Science', designation: 'Professor' },
            { username: 'faculty3', name: 'Dr. Meera Nair', dept: 'Computer Science', designation: 'Assistant Professor' },
            { username: 'faculty4', name: 'Dr. Suresh Menon', dept: 'Computer Science', designation: 'Associate Professor' },
            { username: 'faculty5', name: 'Prof. Lakshmi Iyer', dept: 'Mathematics', designation: 'Professor' },
            { username: 'faculty6', name: 'Dr. Arjun Reddy', dept: 'Mathematics', designation: 'Assistant Professor' },
            { username: 'faculty7', name: 'Dr. Kavitha Rao', dept: 'Mathematics', designation: 'Associate Professor' },
            { username: 'faculty8', name: 'Prof. Deepak Joshi', dept: 'Physics', designation: 'Professor' },
            { username: 'faculty9', name: 'Dr. Sneha Gupta', dept: 'Physics', designation: 'Assistant Professor' },
            { username: 'faculty10', name: 'Dr. Ramesh Verma', dept: 'Physics', designation: 'Associate Professor' },
            { username: 'faculty11', name: 'Prof. Sunita Das', dept: 'Chemistry', designation: 'Professor' },
            { username: 'faculty12', name: 'Dr. Anil Kapoor', dept: 'Chemistry', designation: 'Assistant Professor' },
            { username: 'faculty13', name: 'Dr. Pooja Sharma', dept: 'Chemistry', designation: 'Associate Professor' },
            { username: 'faculty14', name: 'Prof. Manoj Tiwari', dept: 'English', designation: 'Professor' },
            { username: 'faculty15', name: 'Dr. Nisha Agarwal', dept: 'English', designation: 'Assistant Professor' },
            { username: 'faculty16', name: 'Dr. Sanjay Mishra', dept: 'English', designation: 'Associate Professor' },
            { username: 'faculty17', name: 'Prof. Rekha Bhat', dept: 'Economics', designation: 'Professor' },
            { username: 'faculty18', name: 'Dr. Amit Saxena', dept: 'Economics', designation: 'Assistant Professor' },
            { username: 'faculty19', name: 'Dr. Divya Krishnan', dept: 'Economics', designation: 'Associate Professor' },
            { username: 'faculty20', name: 'Prof. Ganesh Pillai', dept: 'History', designation: 'Professor' },
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
