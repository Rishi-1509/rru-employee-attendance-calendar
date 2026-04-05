const express = require('express');
const cookieSession = require('cookie-session');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const facultyRoutes = require('./routes/faculty');
const leavesRoutes = require('./routes/leaves');
const reportsRoutes = require('./routes/reports');

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Trust proxy (Vercel, Nginx, etc.)
app.set('trust proxy', 1);

// Security headers
app.use(helmet({
    contentSecurityPolicy: false,       // Allow inline scripts in HTML pages
    crossOriginEmbedderPolicy: false    // Allow loading resources from CDNs
}));

// Request logging
app.use(morgan(isProduction ? 'combined' : 'dev'));

// Rate limiting — login endpoint (strict: 10 attempts per 15 min)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many login attempts. Please try again after 15 minutes.' }
});

// Rate limiting — general API (200 requests per 15 min)
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please try again later.' }
});

// CORS — restrict in production, allow all in development
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
    : [];

app.use(cors({
    origin: isProduction
        ? (origin, callback) => {
            // Allow requests with no origin (same-origin, Postman, etc.)
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        }
        : true,
    credentials: true
}));

// Body parsing with size limits to prevent large payload attacks
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Session configuration — secret from environment variable
const sessionSecret = process.env.SESSION_SECRET;
if (isProduction && !sessionSecret) {
    console.error('🚨 FATAL: SESSION_SECRET is not set! Set it in Vercel Environment Variables.');
    process.exit(1);
}

app.use(cookieSession({
    name: 'session',
    keys: [sessionSecret || 'dev-only-secret-change-in-production'],
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax'
}));

// Compatibility: cookie-session doesn't have .destroy()
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

// Apply rate limiters
app.use('/api/auth/login', authLimiter);
app.use('/api', apiLimiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/leaves', leavesRoutes);
app.use('/api/reports', reportsRoutes);

// Health check endpoint (for monitoring & load balancers)
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime())
    });
});

// Serve SPA pages
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/reports', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'reports.html'));
});

// Catch-all: serve login page
app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
});

// Global error handler — catches unhandled errors
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err.message);
    res.status(500).json({ error: 'An unexpected error occurred.' });
});

app.listen(PORT, () => {
    console.log(`\n  🗓️  Faculty Leave Calendar Server`);
    console.log(`  ─────────────────────────────────`);
    console.log(`  Local:   http://localhost:${PORT}`);
    console.log(`  Mode:    ${isProduction ? '🔒 Production' : '🔧 Development'}`);
    console.log(`  Status:  Ready\n`);
});

// Export for Vercel serverless deployment
module.exports = app;
