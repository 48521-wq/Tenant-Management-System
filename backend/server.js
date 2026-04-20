// ============================================================
// TMS Backend — Main Server Entry Point
// ============================================================
require('dotenv').config();
const express      = require('express');
const cors         = require('cors');
const connectDB    = require('./config/database');

// Initialize express app and connect to MongoDB
const app = express();
connectDB();

// ─── CORS — allow all origins in development ────────────────
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    callback(null, true);
  },
  credentials: true,
};
app.use(cors(corsOptions));

// ─── Body Parsers ───────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── API Routes ─────────────────────────────────────────────
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/users',       require('./routes/users'));
app.use('/api/properties',  require('./routes/properties'));
app.use('/api/complaints',  require('./routes/complaints'));
app.use('/api/maintenance', require('./routes/maintenance'));
app.use('/api/payments',    require('./routes/payments'));
app.use('/api/leases',      require('./routes/leases'));

// ─── Health Check ───────────────────────────────────────────
app.get('/api/health', (req, res) =>
  res.json({ status: 'OK', time: new Date().toISOString() })
);

// ─── 404 & Global Error Handlers ────────────────────────────
app.use((req, res) =>
  res.status(404).json({ success: false, message: 'Route not found.' })
);
app.use((err, req, res, next) =>
  res.status(500).json({ success: false, message: 'Server error.' })
);

// ─── Start Server ────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 TMS Backend running on http://localhost:${PORT}`);
  console.log(`📍 API: http://localhost:${PORT}/api`);
  console.log(`🔑 Admin: ${process.env.ADMIN_EMAIL}`);
  console.log(`✅ Routes: auth, users, properties, complaints, maintenance, payments, leases`);
});
