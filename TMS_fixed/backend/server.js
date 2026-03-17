// ═══════════════════════════════════════════════════════════════
//  TMS Backend  —  Express Server Entry Point
//  Tenant Management System  |  Node.js + Express + MongoDB
// ═══════════════════════════════════════════════════════════════

require('dotenv').config();

const express   = require('express');
const cors      = require('cors');
const connectDB = require('./config/database');

// ── Create app ───────────────────────────────────────────────────
const app = express();

// ── Connect to database ──────────────────────────────────────────
connectDB();

// ── CORS Configuration ───────────────────────────────────────────
// In development we allow all origins; tighten this in production
const corsOptions = {
  origin: function(origin, callback) {
    // Allow requests with no origin (e.g. mobile apps, Postman, curl)
    if (!origin) return callback(null, true);
    // Allow all origins in dev mode
    callback(null, true);
  },
  credentials: true,
};
app.use(cors(corsOptions));

// ── Body parsers ─────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── API Routes ───────────────────────────────────────────────────
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/users',       require('./routes/users'));
app.use('/api/properties',  require('./routes/properties'));
app.use('/api/complaints',  require('./routes/complaints'));
app.use('/api/maintenance', require('./routes/maintenance'));
app.use('/api/payments',    require('./routes/payments'));
app.use('/api/leases',      require('./routes/leases'));

// ── Health check ─────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', time: new Date().toISOString() });
});

// ── 404 Handler ──────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

// ── Global Error Handler ─────────────────────────────────────────
app.use((err, req, res, next) => {
  res.status(500).json({ success: false, message: 'Server error.' });
});

// ── Start server ─────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 TMS Backend running on http://localhost:${PORT}`);
  console.log(`📍 API: http://localhost:${PORT}/api`);
  console.log(`🔑 Admin: ${process.env.ADMIN_EMAIL}`);
  console.log(`✅ Routes: auth, users, properties, complaints, maintenance, payments, leases`);
});
