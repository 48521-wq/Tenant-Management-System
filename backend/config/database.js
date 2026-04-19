// Database connection configuration for TMS (Tenant Management System)
const mongoose = require('mongoose');
const dns      = require('dns');

// Force IPv4 to avoid IPv6 resolution issues with Atlas
dns.setDefaultResultOrder('ipv4first');

const connectDB = async () => {
  try {
    const dbConnection = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      family: 4, // Use IPv4
    });
    console.log(`✅ MongoDB Atlas Connected: ${dbConnection.connection.host}`);
    console.log(`📦 Database: ${dbConnection.connection.name}`);
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
