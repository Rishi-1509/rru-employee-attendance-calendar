-- Faculty Leave Calendar Database Schema

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'faculty', 'authority')),
    department TEXT DEFAULT 'General',
    designation TEXT DEFAULT '',
    email TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS leaves (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    faculty_id INTEGER NOT NULL,
    leave_date TEXT NOT NULL,
    leave_type TEXT NOT NULL CHECK(leave_type IN ('casual', 'medical', 'earned', 'duty', 'other')),
    reason TEXT DEFAULT '',
    marked_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (faculty_id) REFERENCES users(id),
    FOREIGN KEY (marked_by) REFERENCES users(id),
    UNIQUE(faculty_id, leave_date)
);

CREATE INDEX IF NOT EXISTS idx_leaves_date ON leaves(leave_date);
CREATE INDEX IF NOT EXISTS idx_leaves_faculty ON leaves(faculty_id);
CREATE INDEX IF NOT EXISTS idx_leaves_date_faculty ON leaves(leave_date, faculty_id);
