require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const connectDB = require('./config/database');

const app = express();

// Ensure DB is connected before handling any request (works locally + serverless)
app.use(async (req, res, next) => {
  try { await connectDB(); next(); }
  catch (e) { res.status(500).json({ success: false, message: 'Database connection failed.' }); }
});

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
app.use('/api/rental-requests', require('./routes/rentalRequests'));
app.use('/api/3d-requests',    require('./routes/model3dRequests'));
app.use('/api/notifications',  require('./routes/notifications'));
app.use('/api/lease-agreements', require('./routes/leaseAgreements'));

app.get('/api/health', (req, res) => res.json({ status: 'OK', time: new Date().toISOString() }));
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found.' }));
app.use((err, req, res, next) => res.status(500).json({ success: false, message: 'Server error.' }));

// Local development: start a server. On Vercel the app is exported instead.
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`TMS Backend running on http://localhost:${PORT}`);
  });
}

module.exports = app;
