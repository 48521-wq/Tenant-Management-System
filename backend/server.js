// ═══════════════════════════════════════════════════════════════
//  TMS Backend  —  server.js
//  Tenant Management System  |  Node.js + Express + MongoDB Atlas
//
//  Responsibilities:
//    - Bootstrap Express application
//    - Connect to MongoDB Atlas via Mongoose
//    - Configure CORS, body parsing, and request limits
//    - Mount all API route handlers
//    - Provide health check, 404, and global error endpoints
//    - Start HTTP server on configured PORT
//
//  Start: node server.js  or  npm start
// ═══════════════════════════════════════════════════════════════

// ── Environment variables ─────────────────────────────────────
// Must be loaded before any other module reads process.env
require('dotenv').config();

// ── Core dependencies ─────────────────────────────────────────
const express   = require('express');
const cors      = require('cors');
const connectDB = require('./config/database');

// ── Route modules ─────────────────────────────────────────────
// Imported once here to keep the mount section clean and readable
const authRoutes        = require('./routes/auth');
const userRoutes        = require('./routes/users');
const propertyRoutes    = require('./routes/properties');
const complaintRoutes   = require('./routes/complaints');
const maintenanceRoutes = require('./routes/maintenance');
const paymentRoutes     = require('./routes/payments');
const leaseRoutes       = require('./routes/leases');

// ── Create Express application ────────────────────────────────
const app = express();

// ── Connect to MongoDB Atlas ──────────────────────────────────
// Runs on startup — process exits automatically on connection failure
connectDB();

// ── CORS Configuration ────────────────────────────────────────
// Allows cross-origin requests from the frontend (HTML files
// opened via file:// or a local dev server on a different port).
//
// ⚠  In production: replace the wildcard with your actual domain:
//    origin: 'https://your-domain.com'
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin header (Postman, curl, mobile apps)
    if (!origin) return callback(null, true);

    // Allow all origins in development mode
    callback(null, true);
  },
  credentials: true,
};
app.use(cors(corsOptions));

// ── Body parsers ──────────────────────────────────────────────
// Parse incoming JSON payloads (limit prevents large-payload attacks)
app.use(express.json({ limit: '10mb' }));

// Parse URL-encoded form data (extended: true allows nested objects)
app.use(express.urlencoded({ extended: true }));

// ── API Route Handlers ────────────────────────────────────────
// Each route module is mounted under its own /api/* namespace.
// All route files live in ./routes/ and export an Express router.

app.use('/api/auth',        authRoutes);        // login, register, Google OAuth
app.use('/api/users',       userRoutes);        // admin user management
app.use('/api/properties',  propertyRoutes);    // property CRUD + 3D config
app.use('/api/complaints',  complaintRoutes);   // tenant complaints
app.use('/api/maintenance', maintenanceRoutes); // maintenance requests
app.use('/api/payments',    paymentRoutes);     // rent payment records
app.use('/api/leases',      leaseRoutes);       // lease agreements

// ── Health Check ──────────────────────────────────────────────
// Quick endpoint to verify the server is up and responding.
// Useful for uptime monitors and deployment checks.
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    time:   new Date().toISOString(),
  });
});

// ── 404 Handler ───────────────────────────────────────────────
// Catches any request that didn't match a registered route.
// Must be defined AFTER all routes.
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found.',
  });
});

// ── Global Error Handler ──────────────────────────────────────
// Catches any unhandled errors thrown inside route handlers.
// Express identifies this as an error handler via the 4-argument signature.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message || err);
  res.status(500).json({
    success: false,
    message: 'Server error.',
  });
});

// ── Start HTTP Server ─────────────────────────────────────────
// Falls back to port 5000 if PORT is not set in .env
const PORT    = process.env.PORT || 5000;
const BASE    = `http://localhost:${PORT}`;
const ROUTES  = ['auth', 'users', 'properties', 'complaints', 'maintenance', 'payments', 'leases'];

app.listen(PORT, () => {
  console.log(`🚀 TMS Backend running on ${BASE}`);
  console.log(`📍 API Base:  ${BASE}/api`);
  console.log(`❤️  Health:   ${BASE}/api/health`);
  console.log(`🔑 Admin:     ${process.env.ADMIN_EMAIL}`);
  console.log(`✅ Routes:    ${ROUTES.join(', ')}`);
});
