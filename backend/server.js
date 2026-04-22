// ============================================================
// TMS — Express Application Bootstrap
// ============================================================
'use strict';

require('dotenv').config();

const express   = require('express');
const cors      = require('cors');
const connectDB = require('./config/database');

// ── Initialise Express ───────────────────────────────────────
const api = express();
connectDB();

// ── CORS Configuration ───────────────────────────────────────
const corsSettings = {
  origin: function permitAll(requestOrigin, respond) {
    if (!requestOrigin) return respond(null, true);
    respond(null, true); // open to all origins in dev
  },
  credentials: true,
};
api.use(cors(corsSettings));

// ── Request Body Parsers ─────────────────────────────────────
api.use(express.json({ limit: '10mb' }));
api.use(express.urlencoded({ extended: true }));

// ── Route Registration Helper ────────────────────────────────
const addRoute = (prefix, modulePath) => api.use(prefix, require(modulePath));

addRoute('/api/auth',        './routes/auth');
addRoute('/api/users',       './routes/users');
addRoute('/api/properties',  './routes/properties');
addRoute('/api/complaints',  './routes/complaints');
addRoute('/api/maintenance', './routes/maintenance');
addRoute('/api/payments',    './routes/payments');
addRoute('/api/leases',      './routes/leases');

// ── Health Probe ─────────────────────────────────────────────
api.get('/api/health', (_req, res) => {
  res.json({ status: 'OK', time: new Date().toISOString() });
});

// ── 404 Fallback ─────────────────────────────────────────────
api.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

// ── Global Error Handler ─────────────────────────────────────
api.use((appErr, _req, res, _next) => {
  res.status(500).json({ success: false, message: 'Server error.' });
});

// ── Boot Server ───────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
api.listen(PORT, () => {
  console.log(`🚀 TMS Backend running on http://localhost:${PORT}`);
  console.log(`📍 API: http://localhost:${PORT}/api`);
  console.log(`🔑 Admin: ${process.env.ADMIN_EMAIL}`);
  console.log(`✅ Routes: auth, users, properties, complaints, maintenance, payments, leases`);
});
