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

const express   = require('express');
const cors      = require('cors');
const connectDB = require('./config/database');

// ── Application constants ──────────────────────────────────────
const DEFAULT_PORT        = 5000;
const JSON_PAYLOAD_LIMIT  = '10mb';
const API_BASE_PATH       = '/api';
const HEALTH_CHECK_PATH   = `${API_BASE_PATH}/health`;

const app = express();

// Initialise database connection
connectDB();

// ── CORS Configuration ─────────────────────────────────────────
// ⚠️  Production: restrict origin to your actual domain.
const corsOptions = {
  origin: function (requestOrigin, callback) {
    // Allow requests with no Origin header (Postman, curl, mobile apps)
    if (!requestOrigin) return callback(null, true);
    callback(null, true);
  },
  credentials: true,
};
app.use(cors(corsOptions));

// ── Body Parsers ───────────────────────────────────────────────
app.use(express.json({ limit: JSON_PAYLOAD_LIMIT }));
app.use(express.urlencoded({ extended: true }));

// ── Route Registration ─────────────────────────────────────────
const routes = [
  { path: `${API_BASE_PATH}/auth`,        handler: require('./routes/auth')        },
  { path: `${API_BASE_PATH}/users`,       handler: require('./routes/users')       },
  { path: `${API_BASE_PATH}/properties`,  handler: require('./routes/properties')  },
  { path: `${API_BASE_PATH}/complaints`,  handler: require('./routes/complaints')  },
  { path: `${API_BASE_PATH}/maintenance`, handler: require('./routes/maintenance') },
  { path: `${API_BASE_PATH}/payments`,    handler: require('./routes/payments')    },
  { path: `${API_BASE_PATH}/leases`,      handler: require('./routes/leases')      },
];

routes.forEach(({ path, handler }) => app.use(path, handler));

// ── Health Check ───────────────────────────────────────────────
app.get(HEALTH_CHECK_PATH, (req, res) => {
  res.json({
    status:  'OK',
    time:    new Date().toISOString(),
    uptime:  `${Math.floor(process.uptime())}s`,
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
const BASE_URL    = `http://localhost:${SERVER_PORT}`;

app.listen(SERVER_PORT, () => {
  console.log(`\n🚀 TMS Backend running on ${BASE_URL}`);
  console.log(`📍 API Base:  ${BASE_URL}${API_BASE_PATH}`);
  console.log(`❤️  Health:   ${BASE_URL}${HEALTH_CHECK_PATH}`);
  console.log(`🔑 Admin:     ${process.env.ADMIN_EMAIL}`);
  console.log(`✅ Routes:    auth, users, properties, complaints, maintenance, payments, leases\n`);
});
