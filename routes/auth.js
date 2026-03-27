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
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Logout failed.' });
        }
        res.json({ message: 'Logged out successfully.' });
    });
});

// GET /api/auth/me
router.get('/me', (req, res) => {
    if (!req.session || !req.session.user) {
        return res.status(401).json({ error: 'Not authenticated.' });
    }
    res.json({ user: req.session.user });
});

module.exports = router;
