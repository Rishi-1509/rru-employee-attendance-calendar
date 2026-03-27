-- Faculty Leave Calendar Database Schema (PostgreSQL)

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK(role IN ('admin', 'faculty', 'authority')),
    department VARCHAR(100) DEFAULT 'General',
    designation VARCHAR(100) DEFAULT '',
    email VARCHAR(255) DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS leaves (
    id SERIAL PRIMARY KEY,
    faculty_id INTEGER NOT NULL REFERENCES users(id),
    leave_date DATE NOT NULL,
    leave_type VARCHAR(50) NOT NULL CHECK(leave_type IN ('casual', 'medical', 'earned', 'duty', 'other')),
    reason TEXT DEFAULT '',
    marked_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(faculty_id, leave_date)
);

CREATE INDEX IF NOT EXISTS idx_leaves_date ON leaves(leave_date);
CREATE INDEX IF NOT EXISTS idx_leaves_faculty ON leaves(faculty_id);
CREATE INDEX IF NOT EXISTS idx_leaves_date_faculty ON leaves(leave_date, faculty_id);
