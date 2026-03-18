// ═══════════════════════════════════════════════════════════════
//  Database Config  —  MongoDB Atlas Connection
//  Uses Mongoose to connect to the Atlas cluster defined in .env
// ═══════════════════════════════════════════════════════════════

const mongoose = require('mongoose');
const dns      = require('dns');

// Force IPv4 DNS resolution — prevents IPv6 timeout issues on some networks
dns.setDefaultResultOrder('ipv4first');

// ── Connection options ───────────────────────────────────────────
const MONGO_OPTIONS = {
  // Max time (ms) to wait when selecting a server before throwing
  serverSelectionTimeoutMS: 15000,

  // Max time (ms) to wait for a response on an open socket
  socketTimeoutMS: 45000,

  // Force IPv4 socket connections (consistent with DNS setting above)
  family: 4,
};

// ── connectDB ────────────────────────────────────────────────────
// Establishes connection to MongoDB Atlas.
// Called once on server startup — process exits on failure.
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, MONGO_OPTIONS);

    console.log(`✅ MongoDB Atlas Connected: ${conn.connection.host}`);
    console.log(`📦 Database: ${conn.connection.name}`);

  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);

    // Exit the process so the server does not run without a DB
    process.exit(1);
  }
};

module.exports = connectDB;
