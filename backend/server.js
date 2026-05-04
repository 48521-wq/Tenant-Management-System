// ─── TMS Backend Server ───────────────────────────────────────────────────────
require('dotenv').config();

const express   = require('express');
const cors      = require('cors');
const connectDB = require('./config/database');

// ─── App Initialisation ───────────────────────────────────────────────────────
const app = express();
connectDB();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: (_origin, callback) => callback(null, true), // Allow all origins in dev
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',            require('./routes/auth'));
app.use('/api/users',           require('./routes/users'));
app.use('/api/properties',      require('./routes/properties'));
app.use('/api/complaints',      require('./routes/complaints'));
app.use('/api/maintenance',     require('./routes/maintenance'));
app.use('/api/payments',        require('./routes/payments'));
app.use('/api/leases',          require('./routes/leases'));
app.use('/api/rental-requests', require('./routes/rentalRequests'));
app.use('/api/3d-requests',     require('./routes/model3dRequests'));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) =>
  res.json({ status: 'OK', time: new Date().toISOString() })
);

// ─── Fallback Handlers ────────────────────────────────────────────────────────
app.use((_req, res) =>
  res.status(404).json({ success: false, message: 'Route not found.' })
);

app.use((err, _req, res, _next) =>
  res.status(500).json({ success: false, message: 'Server error.' })
);

// ─── Route Debugger ───────────────────────────────────────────────────────────
function getRoutes(app) {
  const routes = [];

  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      const methods = Object.keys(middleware.route.methods)
        .map((m) => m.toUpperCase())
        .join(',');
      routes.push(`${methods} ${middleware.route.path}`);
    } else if (middleware.name === 'router' && middleware.handle?.stack) {
      middleware.handle.stack.forEach((handler) => {
        if (!handler.route) return;
        const methods = Object.keys(handler.route.methods)
          .map((m) => m.toUpperCase())
          .join(',');
        routes.push(`${methods} /api${handler.route.path}`);
      });
    }
  });

  return routes;
}

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 TMS Backend running on http://localhost:${PORT}`);
  console.log(`📍 API: http://localhost:${PORT}/api`);
  console.log(`🔑 Admin: ${process.env.ADMIN_EMAIL}`);
  console.log('✅ Mounted routes:');
  getRoutes(app).forEach((route) => console.log('   ', route));
});
