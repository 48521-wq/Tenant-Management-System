// ═══════════════════════════════════════════════════════════════
//  Database Config  —  config/database.js
//  Manages the MongoDB Atlas connection for the TMS backend.
//
//  Usage:
//    const connectDB = require('./config/database');
//    connectDB(); // called once in server.js on startup
//
//  On success: logs the connected host and database name.
//  On failure: logs the error and calls process.exit(1) so the
//              server does not silently run without a database.
//
//  Environment variable required:
//    MONGODB_URI — full Atlas connection string from .env
//
//  IPv4 note:
//    Some hosting environments and local networks resolve Atlas
//    hostnames to IPv6 addresses, causing connection timeouts.
//    dns.setDefaultResultOrder('ipv4first') and family: 4 together
//    force Node.js to prefer IPv4 for both DNS and socket connections.
// ═══════════════════════════════════════════════════════════════

const mongoose = require('mongoose');
const dns      = require('dns');

// ── IPv4 fix ─────────────────────────────────────────────────────
// Must be called before any DNS lookups — set it at module load time.
// Works alongside the family: 4 option in MONGO_OPTIONS below.
dns.setDefaultResultOrder('ipv4first');

// ── Mongoose connection options ───────────────────────────────────
const MONGO_OPTIONS = {
  // How long Mongoose will wait to find an available server
  // before throwing a ServerSelectionTimeoutError (default is 30 000 ms)
  serverSelectionTimeoutMS: 15000,

  // How long Mongoose will wait for a response on an already-open
  // TCP socket before timing out the operation (default is 0 — no limit)
  socketTimeoutMS: 45000,

  // Force IPv4 TCP connections to the Atlas cluster
  // Paired with dns.setDefaultResultOrder('ipv4first') above
  family: 4,
};

// ── connectDB ────────────────────────────────────────────────────
/**
 * Establish the Mongoose connection to MongoDB Atlas.
 * Reads MONGODB_URI from process.env (loaded via dotenv in server.js).
 *
 * Called exactly once at server startup — if the connection fails,
 * the process exits with code 1 so the error is visible in logs
 * and the server does not serve API requests without a database.
 *
 * @returns {Promise<void>}
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, MONGO_OPTIONS);

    // Log the host so developers can confirm which cluster is connected
    console.log(`✅ MongoDB Atlas Connected: ${conn.connection.host}`);
    console.log(`📦 Database: ${conn.connection.name}`);

  } catch (error) {
    // Log the raw error message — typically a DNS or auth failure
    console.error('❌ MongoDB connection error:', error.message);

    // Hard exit — prevents the server from running in a broken state
    process.exit(1);
  }
};

module.exports = connectDB;
