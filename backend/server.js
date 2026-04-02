require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const connectDB = require('./config/database');

const app = express();

// ═════════════════════════════════════════════════════
// DATABASE CONNECTION
// ═════════════════════════════════════════════════════
connectDB();

// ═════════════════════════════════════════════════════
// MIDDLEWARE
// ═════════════════════════════════════════════════════

// CORS - Cross-Origin Resource Sharing
app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    callback(null, true); // Allow all origins in development
  },
  credentials: true
}));

// Body Parser - Handle JSON and URL-encoded data
// Body Parser - Handle JSON and URL-encoded data
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ═════════════════════════════════════════════════════
// API ROUTES
// ═════════════════════════════════════════════════════
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/users',       require('./routes/users'));
app.use('/api/properties',  require('./routes/properties'));
app.use('/api/complaints',  require('./routes/complaints'));
app.use('/api/maintenance', require('./routes/maintenance'));
app.use('/api/payments',    require('./routes/payments'));
app.use('/api/leases',      require('./routes/leases'));

// ═════════════════════════════════════════════════════
// HEALTH CHECK
// ═════════════════════════════════════════════════════
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ═════════════════════════════════════════════════════
// ERROR HANDLING
// ═════════════════════════════════════════════════════

// 404 - Route Not Found
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.path,
    method: req.method
  });
});

// 500 - Server Error
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Server error'
  });
});

// ═════════════════════════════════════════════════════
// SERVER STARTUP
// ═════════════════════════════════════════════════════
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║   🚀 Tenant Management System Backend      ║');
  console.log('║          Server Started Successfully        ║');
  console.log('╚════════════════════════════════════════════╝\n');
  console.log(`📍 Server: http://localhost:${PORT}`);
  console.log(`🔗 API Base: http://localhost:${PORT}/api`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
  console.log('\n📚 Available Endpoints:');
  console.log('   • Authentication: /api/auth');
  console.log('   • Users: /api/users');
  console.log('   • Properties: /api/properties');
  console.log('   • Complaints: /api/complaints');
  console.log('   • Maintenance: /api/maintenance');
  console.log('   • Payments: /api/payments');
  console.log('   • Leases: /api/leases\n');
});
