/**
 * @file server.js
 * @description TMS Backend entry point — Node.js + Express + MongoDB Atlas.
 *
 * Responsibilities:
 *   - Load environment variables from .env
 *   - Bootstrap the Express application
 *   - Connect to MongoDB Atlas via Mongoose
 *   - Configure CORS, JSON body parsing, and request size limits
 *   - Mount all API route handlers under /api/*
 *   - Provide health-check, 404, and global error-handler endpoints
 *   - Start the HTTP server on the configured PORT
 *
 * Start:
 *   node server.js
 *   npm start
 */

require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const initDB  = require('./config/database');

// Application constants
const DEFAULT_PORT       = 5000;
const BODY_SIZE_LIMIT    = '10mb';
const API_PREFIX         = '/api';
const HEALTH_ROUTE       = `${API_PREFIX}/health`;

const app = express();

// Initialise database connection
initDB();

// ── CORS Configuration ─────────────────────────────────────────
// ⚠️  Production: restrict origin to your actual domain.
const corsConfig = {
  origin: function allowAll(requestOrigin, cb) {
    // Allow requests with no Origin header (Postman, curl, mobile apps)
    if (!requestOrigin) return cb(null, true);
    cb(null, true);
  },
  credentials: true,
};
app.use(cors(corsConfig));

// ── Body Parsers ───────────────────────────────────────────────
app.use(express.json({ limit: BODY_SIZE_LIMIT }));
app.use(express.urlencoded({ extended: true }));

// ── Route Registration ─────────────────────────────────────────
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

// ── Health Check ───────────────────────────────────────────────
app.get(HEALTH_ROUTE, (req, res) => {
  res.json({
    status: 'OK',
    time:   new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())}s`,
  });
});

// ── 404 Handler ────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found.',
  });
});

// ── Global Error Handler ───────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message || err);
  res.status(500).json({
    success: false,
    message: 'Server error.',
  });
});

// ── Start Server ───────────────────────────────────────────────
const SERVER_PORT = process.env.PORT || DEFAULT_PORT;
const SERVER_URL  = `http://localhost:${SERVER_PORT}`;

app.listen(SERVER_PORT, () => {
  console.log(`\n🚀 TMS Backend running on ${SERVER_URL}`);
  console.log(`📍 API Base:  ${SERVER_URL}${API_PREFIX}`);
  console.log(`❤️  Health:   ${SERVER_URL}${HEALTH_ROUTE}`);
  console.log(`🔑 Admin:     ${process.env.ADMIN_EMAIL}`);
  console.log(`✅ Routes:    auth, users, properties, complaints, maintenance, payments, leases\n`);
});
