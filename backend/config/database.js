/**
 * @file database.js
 * @description MongoDB Atlas connection helper for the TMS backend.
 *
 * Usage:
 *   const connectDB = require('./config/database');
 *   connectDB(); // call once at server startup in server.js
 *
 * On success: logs the connected host and database name.
 * On failure: logs the error and exits the process (code 1).
 *
 * Required environment variable:
 *   MONGODB_URI — full Atlas connection string (set in .env)
 */

const mongoose = require('mongoose');
const dns      = require('dns');

// Force IPv4 DNS resolution before any lookups occur
dns.setDefaultResultOrder('ipv4first');

// Connection configuration constants
const DB_SERVER_SELECTION_TIMEOUT = 15000;  // ms — how long to wait for a MongoDB server
const DB_SOCKET_TIMEOUT           = 45000;  // ms — how long to wait for a query response
const DB_IP_FAMILY                = 4;      // force IPv4 to avoid IPv6 DNS issues

const DB_OPTIONS = {
  serverSelectionTimeoutMS: DB_SERVER_SELECTION_TIMEOUT,
  socketTimeoutMS:          DB_SOCKET_TIMEOUT,
  family:                   DB_IP_FAMILY,
};

/**
 * Establishes the Mongoose connection to MongoDB Atlas.
 * Called once at server startup. Exits process on failure.
 *
 * @returns {Promise<void>}
 */
const connectDB = async () => {
  try {
    const connection = await mongoose.connect(process.env.MONGODB_URI, DB_OPTIONS);

    const { host, name } = connection.connection;
    console.log(`✅ MongoDB Atlas Connected: ${host}`);
    console.log(`📦 Database: ${name}`);

  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
