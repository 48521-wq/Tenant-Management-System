/**
 * @file server.js
 * @description TMS Backend entry point — Node.js + Express + MongoDB Atlas.
 *
 * Responsibilities:
 *   - Load environment variables via dotenv
 *   - Initialise the Express application
 *   - Connect to MongoDB Atlas through Mongoose
 *   - Apply CORS, JSON body-parsing and request-size middleware
 *   - Register all API route handlers under /api/*
 *   - Expose health-check, 404 fallback and global error-handler middleware
 *   - Bind the HTTP server to the configured PORT
 *
 * Usage:
 *   node server.js
 *   npm start
 */

'use strict';

require('dotenv').config();

const express   = require('express');
const cors      = require('cors');
const connectDB = require('./config/database');

// ── Application-level constants ────────────────────────────────
const PORT            = process.env.PORT || 5000;
const PAYLOAD_LIMIT   = '10mb';
const API_PREFIX      = '/api';
const HEALTH_ENDPOINT = `${API_PREFIX}/health`;
const BASE_URL        = `http://localhost:${PORT}`;

const app = express();

// Establish MongoDB Atlas connection before registering routes
connectDB();

// ── CORS ───────────────────────────────────────────────────────
// TODO (production): restrict `origin` to your deployed domain.
const corsConfig = {
  origin: (incomingOrigin, cb) => {
    // Allow requests that carry no Origin header (Postman, mobile, curl)
    if (!incomingOrigin) return cb(null, true);
    cb(null, true);
  },
  credentials: true,
};
app.use(cors(corsConfig));

// ── Body parsing ───────────────────────────────────────────────
app.use(express.json({ limit: PAYLOAD_LIMIT }));
app.use(express.urlencoded({ extended: true }));

// ── Route registration ─────────────────────────────────────────
// Each entry maps a URL prefix to its dedicated route module.
const apiRoutes = [
  { path: `${API_PREFIX}/auth`,        handler: require('./routes/auth')        },
  { path: `${API_PREFIX}/users`,       handler: require('./routes/users')       },
  { path: `${API_PREFIX}/properties`,  handler: require('./routes/properties')  },
  { path: `${API_PREFIX}/complaints`,  handler: require('./routes/complaints')  },
  { path: `${API_PREFIX}/maintenance`, handler: require('./routes/maintenance') },
  { path: `${API_PREFIX}/payments`,    handler: require('./routes/payments')    },
  { path: `${API_PREFIX}/leases`,      handler: require('./routes/leases')      },
];

apiRoutes.forEach(({ path, handler }) => app.use(path, handler));

// ── Health check ───────────────────────────────────────────────
// Returns basic liveness information — useful for uptime monitors.
app.get(HEALTH_ENDPOINT, (_req, res) => {
  res.json({
    status: 'OK',
    time:   new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())}s`,
  });
});

// ── 404 fallback ───────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found.',
  });
});

// ── Global error handler ───────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err.message || err);
  res.status(500).json({
    success: false,
    message: 'Server error.',
  });
});

// ── Start HTTP server ──────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 TMS Backend running on ${BASE_URL}`);
  console.log(`📍 API Base:  ${BASE_URL}${API_PREFIX}`);
  console.log(`❤️  Health:   ${BASE_URL}${HEALTH_ENDPOINT}`);
  console.log(`🔑 Admin:     ${process.env.ADMIN_EMAIL}`);
  console.log(`✅ Routes:    auth, users, properties, complaints, maintenance, payments, leases\n`);
});
