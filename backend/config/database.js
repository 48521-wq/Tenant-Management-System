<<<<<<< HEAD
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
=======
const mongoose = require('mongoose');
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      family: 4,
    });
    console.log(`✅ MongoDB Atlas Connected: ${conn.connection.host}`);
    console.log(`📦 Database: ${conn.connection.name}`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
>>>>>>> 17a4da6032e965253aaaaa7e291f867a3df0f14b
    process.exit(1);
  }
};
module.exports = connectDB;
