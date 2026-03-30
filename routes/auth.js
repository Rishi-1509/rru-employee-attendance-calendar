const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../database/db');

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required.' });
        }

        const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password.' });
        }

        const valid = bcrypt.compareSync(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid username or password.' });
        }

        // Store user in session (exclude password)
        req.session.user = {
            id: user.id,
            username: user.username,
            full_name: user.full_name,
            role: user.role,
            department: user.department,
            designation: user.designation
        };

        res.json({
            message: 'Login successful',
            user: req.session.user
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
    if (req.session) {
        req.session.destroy((err) => {
            if (err) {
                return res.status(500).json({ error: 'Logout failed.' });
            }
            res.json({ message: 'Logged out successfully.' });
        });
    } else {
        res.json({ message: 'No active session.' });
    }
});

// POST /api/auth/change-password
router.post('/change-password', async (req, res) => {
    try {
        if (!req.session || !req.session.user) {
            return res.status(401).json({ error: 'Not authenticated.' });
        }

        const { oldPassword, newPassword } = req.body;
        const userId = req.session.user.id;

        if (!oldPassword || !newPassword) {
            return res.status(400).json({ error: 'Old and new passwords are required.' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
        }

        // Get user from DB to check current password
        const result = await db.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
        const user = result.rows[0];

        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const valid = bcrypt.compareSync(oldPassword, user.password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Incorrect current password.' });
        }

        // Hash new password and update
        const hash = bcrypt.hashSync(newPassword, 10);
        await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, userId]);

        res.json({ message: 'Password updated successfully.' });
    } catch (err) {
        console.error('Change password error:', err);
        res.status(500).json({ error: 'Failed to update password.' });
    }
});

// GET /api/auth/me
router.get('/me', (req, res) => {
    if (!req.session || !req.session.user) {
        return res.status(401).json({ error: 'Not authenticated.' });
    }
    res.json({ user: req.session.user });
});

module.exports = router;
