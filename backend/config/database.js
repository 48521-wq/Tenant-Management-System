/**
 * @file database.js
 * @description MongoDB Atlas connection helper for the TMS backend.
 *
 * Usage:
 *   const initDB = require('./config/database');
 *   initDB(); // call once at server startup in server.js
 *
 * On success: logs the connected host and database name.
 * On failure: logs the error and exits the process (code 1).
 *
 * Required environment variable:
 *   MONGODB_URI — full Atlas connection string (set in .env)
 */

const mg  = require('mongoose');
const dns = require('dns');

// Force IPv4 DNS resolution before any lookups occur
dns.setDefaultResultOrder('ipv4first');

// Connection configuration constants
const SERVER_SELECTION_MS = 15000;  // ms — how long to wait for a MongoDB server
const SOCKET_TIMEOUT_MS   = 45000;  // ms — how long to wait for a query response
const IP_FAMILY_V4        = 4;      // force IPv4 to avoid IPv6 DNS issues

const ATLAS_OPTIONS = {
  serverSelectionTimeoutMS: SERVER_SELECTION_MS,
  socketTimeoutMS:          SOCKET_TIMEOUT_MS,
  family:                   IP_FAMILY_V4,
};

/**
 * Opens the Mongoose connection to MongoDB Atlas.
 * Called once at server startup. Exits process on failure.
 *
 * @returns {Promise<void>}
 */
const initDB = async () => {
  try {
    const conn = await mg.connect(process.env.MONGODB_URI, ATLAS_OPTIONS);

    const { host, name } = conn.connection;
    console.log(`✅ MongoDB Atlas Connected: ${host}`);
    console.log(`📦 Database: ${name}`);

  } catch (connectionErr) {
    console.error('❌ MongoDB connection error:', connectionErr.message);
    process.exit(1);
  }
};

module.exports = initDB;
