<<<<<<< HEAD
// ============================================================
// TMS Backend — Express Server Bootstrap
// ============================================================
'use strict';

=======
>>>>>>> 17a4da6032e965253aaaaa7e291f867a3df0f14b
require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const connectDB = require('./config/database');

<<<<<<< HEAD
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
=======
const app = express();
connectDB();

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    callback(null, true); // Allow all in dev
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth',           require('./routes/auth'));
app.use('/api/users',          require('./routes/users'));
app.use('/api/properties',     require('./routes/properties'));
app.use('/api/complaints',     require('./routes/complaints'));
app.use('/api/maintenance',    require('./routes/maintenance'));
app.use('/api/payments',       require('./routes/payments'));
app.use('/api/leases',         require('./routes/leases'));
app.use('/api/rental-requests', require('./routes/rentalRequests'));

app.get('/api/health', (req, res) => res.json({ status: 'OK', time: new Date().toISOString() }));
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found.' }));
app.use((err, req, res, next) => res.status(500).json({ success: false, message: 'Server error.' }));

function getRoutes(app) {
  const routes = [];
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      const methods = Object.keys(middleware.route.methods).map(m => m.toUpperCase()).join(',');
      routes.push(`${methods} ${middleware.route.path}`);
    } else if (middleware.name === 'router' && middleware.handle && middleware.handle.stack) {
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          const methods = Object.keys(handler.route.methods).map(m => m.toUpperCase()).join(',');
          const path = handler.route.path;
          const prefix = middleware.regexp && middleware.regexp.fast_star ? '' : (middleware.regexp && middleware.regexp.source ? middleware.regexp.source.replace('^\\/?', '').replace('(?:\\/(?=$))?$', '') : '');
          routes.push(`${methods} /api${path}`);
        }
      });
    }
  });
  return routes;
}

>>>>>>> 17a4da6032e965253aaaaa7e291f867a3df0f14b
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 TMS Backend running on http://localhost:${PORT}`);
  console.log(`📍 API: http://localhost:${PORT}/api`);
  console.log(`🔑 Admin: ${process.env.ADMIN_EMAIL}`);
<<<<<<< HEAD
  console.log(`✅ Routes: auth, users, properties, complaints, maintenance, payments, leases`);
=======
  console.log('✅ Mounted routes:');
  getRoutes(app).forEach(route => console.log('   ', route));
>>>>>>> 17a4da6032e965253aaaaa7e291f867a3df0f14b
});
