// ============================================================
// TMS — MongoDB Atlas Database Connector
// ============================================================
'use strict';

const mongoose = require('mongoose');
const dns      = require('dns');

// Use IPv4 first to prevent Atlas connection issues
dns.setDefaultResultOrder('ipv4first');

// Timeout and network settings for Atlas
const DB_OPTIONS = {
  serverSelectionTimeoutMS : 15000,
  socketTimeoutMS          : 45000,
  family                   : 4,
};

/**
 * connectDB — opens a Mongoose connection to MongoDB Atlas.
 * Exits the process if the connection fails.
 */
const connectDB = async () => {
  try {
    const result = await mongoose.connect(process.env.MONGODB_URI, DB_OPTIONS);
    console.log(`✅ MongoDB Atlas Connected: ${result.connection.host}`);
    console.log(`📦 Database: ${result.connection.name}`);
  } catch (connectionErr) {
    console.error('❌ MongoDB connection error:', connectionErr.message);
    process.exit(1);
  }
};

module.exports = connectDB;
