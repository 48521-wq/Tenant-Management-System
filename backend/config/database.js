// ============================================================
// TMS — Database Connection (MongoDB Atlas via Mongoose)
// ============================================================
'use strict';

const mg  = require('mongoose');
const dns = require('dns');

// Force IPv4 — prevents DNS resolution issues with Atlas
dns.setDefaultResultOrder('ipv4first');

/**
 * Mongoose connection options.
 * family:4 ensures IPv4-only socket connections.
 */
const CONNECT_OPTS = {
  serverSelectionTimeoutMS : 15000,
  socketTimeoutMS          : 45000,
  family                   : 4,
};

/**
 * connectDB
 * Opens the Mongoose connection to MongoDB Atlas.
 * Terminates the process on failure.
 *
 * @returns {Promise<void>}
 */
const connectDB = async () => {
  try {
    const session = await mg.connect(process.env.MONGODB_URI, CONNECT_OPTS);
    console.log(`✅ MongoDB Atlas Connected: ${session.connection.host}`);
    console.log(`📦 Database: ${session.connection.name}`);
  } catch (dbErr) {
    console.error('❌ MongoDB connection error:', dbErr.message);
    process.exit(1);
  }
};

module.exports = connectDB;
