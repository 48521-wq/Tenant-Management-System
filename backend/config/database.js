// ============================================================
// TMS Database — MongoDB Atlas connection via Mongoose
// ============================================================
const mongoose = require('mongoose');
const dns      = require('dns');

// Prefer IPv4 to avoid Atlas resolution issues
dns.setDefaultResultOrder('ipv4first');

// Connection options
const mongoOptions = {
  serverSelectionTimeoutMS: 15000,
  socketTimeoutMS:          45000,
  family:                   4, // IPv4 only
};

const connectDB = async () => {
  try {
    const connection = await mongoose.connect(process.env.MONGODB_URI, mongoOptions);
    console.log(`✅ MongoDB Atlas Connected: ${connection.connection.host}`);
    console.log(`📦 Database: ${connection.connection.name}`);
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
