/**
 * @file database.js
 * @description MongoDB Atlas connection helper for the TMS backend.
 *
 * Usage:
 *   const connectDB = require('./config/database');
 *   connectDB(); // invoke once at server startup inside server.js
 *
 * On success : logs the connected Atlas host and database name.
 * On failure : logs the error message and terminates the process (exit 1).
 *
 * Required environment variable:
 *   MONGODB_URI — full Atlas connection string (defined in .env)
 */

'use strict';

const mongoose = require('mongoose');
const dns      = require('dns');

// Resolve hostnames to IPv4 addresses first — avoids Atlas IPv6 DNS issues
dns.setDefaultResultOrder('ipv4first');

// ── Connection tuning constants ────────────────────────────────
const SERVER_SELECTION_TIMEOUT_MS = 15000; // max wait to find a primary
const SOCKET_TIMEOUT_MS           = 45000; // max wait for a query response
const IP_FAMILY                   = 4;     // force IPv4 throughout

const MONGOOSE_OPTIONS = {
  serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT_MS,
  socketTimeoutMS:          SOCKET_TIMEOUT_MS,
  family:                   IP_FAMILY,
};

/**
 * Connects Mongoose to MongoDB Atlas using the MONGODB_URI env variable.
 * Should be called exactly once at application startup.
 *
 * @async
 * @returns {Promise<void>}
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, MONGOOSE_OPTIONS);

    const { host, name } = conn.connection;
    console.log(`✅ MongoDB Atlas Connected: ${host}`);
    console.log(`📦 Database: ${name}`);

  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
