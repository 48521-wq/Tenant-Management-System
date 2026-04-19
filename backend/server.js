// TMS Backend Entry Point
require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const connectDB = require('./config/database');

const server = express();
connectDB();

// Allow all origins in development
server.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    callback(null, true); // Allow all in dev
  },
  credentials: true
}));
server.use(express.json({ limit: '10mb' }));
server.use(express.urlencoded({ extended: true }));

// API Route Handlers
server.use('/api/auth',        require('./routes/auth'));
server.use('/api/users',       require('./routes/users'));
server.use('/api/properties',  require('./routes/properties'));
server.use('/api/complaints',  require('./routes/complaints'));
server.use('/api/maintenance', require('./routes/maintenance'));
server.use('/api/payments',    require('./routes/payments'));
server.use('/api/leases',      require('./routes/leases'));

// Health check & error handlers
server.get('/api/health', (req, res) => res.json({ status: 'OK', time: new Date().toISOString() }));
server.use((req, res) => res.status(404).json({ success: false, message: 'Route not found.' }));
server.use((err, req, res, next) => res.status(500).json({ success: false, message: 'Server error.' }));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 TMS Backend running on http://localhost:${PORT}`);
  console.log(`📍 API: http://localhost:${PORT}/api`);
  console.log(`🔑 Admin: ${process.env.ADMIN_EMAIL}`);
  console.log(`✅ Routes: auth, users, properties, complaints, maintenance, payments, leases`);
});
