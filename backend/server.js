// ============================================================
// TMS Backend — Express Server Bootstrap
// ============================================================
'use strict';

require('dotenv').config();

const express   = require('express');
const cors      = require('cors');
const connectDB = require('./config/database');

// ── App Setup ────────────────────────────────────────────────
const app = express();

// Connect to MongoDB before anything else
connectDB();

// ── CORS ─────────────────────────────────────────────────────
// Allow all origins in development mode
const corsConfig = {
  origin: function allowAll(origin, cb) {
    // Permit requests with no origin (e.g. curl, mobile)
    if (!origin) return cb(null, true);
    cb(null, true);
  },
  credentials: true,
};
app.use(cors(corsConfig));

// ── Body Parsing ─────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Route Mounting ───────────────────────────────────────────
const mountRoute = (path, file) => app.use(path, require(file));

mountRoute('/api/auth',        './routes/auth');
mountRoute('/api/users',       './routes/users');
mountRoute('/api/properties',  './routes/properties');
mountRoute('/api/complaints',  './routes/complaints');
mountRoute('/api/maintenance', './routes/maintenance');
mountRoute('/api/payments',    './routes/payments');
mountRoute('/api/leases',      './routes/leases');

// ── Utility Endpoints ────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'OK', time: new Date().toISOString() });
});

// ── Error Handlers ───────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});
app.use((serverErr, _req, res, _next) => {
  res.status(500).json({ success: false, message: 'Server error.' });
});

// ── Start Listening ──────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 TMS Backend running on http://localhost:${PORT}`);
  console.log(`📍 API: http://localhost:${PORT}/api`);
  console.log(`🔑 Admin: ${process.env.ADMIN_EMAIL}`);
  console.log(`✅ Routes: auth, users, properties, complaints, maintenance, payments, leases`);
});
