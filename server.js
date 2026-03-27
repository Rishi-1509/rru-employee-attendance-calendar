const express = require('express');
const cookieSession = require('cookie-session');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const facultyRoutes = require('./routes/faculty');
const leavesRoutes = require('./routes/leaves');
const reportsRoutes = require('./routes/reports');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cookieSession({
    name: 'session',
    keys: ['faculty-leave-calendar-secret-key-2026'],
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
}));

// Compatibility adapter for req.session.destroy used in logout
app.use((req, res, next) => {
    if (req.session && !req.session.destroy) {
        req.session.destroy = (cb) => {
            req.session = null;
            if (cb) cb();
        };
    }
    next();
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/leaves', leavesRoutes);
app.use('/api/reports', reportsRoutes);

// Serve SPA pages
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/reports', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'reports.html'));
});

// Catch-all: redirect to login
app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
});

app.listen(PORT, () => {
    console.log(`\n  🗓️  Faculty Leave Calendar Server`);
    console.log(`  ─────────────────────────────────`);
    console.log(`  Local:   http://localhost:${PORT}`);
    console.log(`  Status:  Ready\n`);
});

// Export the app for serverless deployment (e.g., Vercel)
module.exports = app;
