require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const connectDB = require('./config/database');

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

app.use('/api/auth',        require('./routes/auth'));
app.use('/api/users',       require('./routes/users'));
app.use('/api/properties',  require('./routes/properties'));
app.use('/api/complaints',  require('./routes/complaints'));
app.use('/api/maintenance', require('./routes/maintenance'));
app.use('/api/payments',    require('./routes/payments'));
app.use('/api/leases',      require('./routes/leases'));

app.get('/api/health', (req, res) => res.json({ status: 'OK', time: new Date().toISOString() }));
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found.' }));
app.use((err, req, res, next) => res.status(500).json({ success: false, message: 'Server error.' }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 TMS Backend running on http://localhost:${PORT}`);
  console.log(`📍 API: http://localhost:${PORT}/api`);
  console.log(`🔑 Admin: ${process.env.ADMIN_EMAIL}`);
  console.log(`✅ Routes: auth, users, properties, complaints, maintenance, payments, leases`);
});
