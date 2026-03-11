// ═══════════════════════════════════════════════
//  TMS Backend Server
//  Stack: Node.js + Express + MongoDB Atlas
// ═══════════════════════════════════════════════
require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const connectDB = require('./config/database');

const app = express();

// ── Connect to MongoDB Atlas ─────────────────────────
connectDB();

// ── Middleware ───────────────────────────────────────
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile, Postman, file://)
    if (!origin) return callback(null, true);
    const allowed = [
      'http://localhost:3000',
      'http://localhost:5500',
      'http://localhost:5501',
      'http://127.0.0.1:5500',
      'http://127.0.0.1:5501',
      'http://127.0.0.1:3000',
      process.env.FRONTEND_URL
    ].filter(Boolean);
    if (allowed.includes(origin) || origin.startsWith('file://')) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all in development
    }
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Routes ───────────────────────────────────────────
app.use('/api/auth',  require('./routes/auth'));
app.use('/api/users', require('./routes/users'));

// ── Health check ─────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'TMS Backend Running', time: new Date().toISOString() });
});

// ── 404 Handler ──────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

// ── Error Handler ────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error.' });
});

// ── Start Server ─────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 TMS Backend running on http://localhost:${PORT}`);
  console.log(`📍 API Base: http://localhost:${PORT}/api`);
  console.log(`🔑 Admin: ${process.env.ADMIN_EMAIL}`);
});
