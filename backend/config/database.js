/**
 * Database Configuration & Connection Handler
 * MongoDB Atlas Connection with Mongoose
 */

const mongoose = require('mongoose');
const dns = require('dns');

// Use IPv4 as default (ensures compatibility)
dns.setDefaultResultOrder('ipv4first');

/**
 * Connect to MongoDB Atlas
 * Includes error handling, retry logic, and connection events
 */
const connectDB = async () => {
  try {
    console.log('🔄 Connecting to MongoDB Atlas...');

    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      retryWrites: true,
      w: 'majority',
      family: 4,
    });

    console.log('\n✅ MongoDB Connection Successful!');
    console.log(`📍 Host: ${conn.connection.host}`);
    console.log(`📦 Database: ${conn.connection.name}`);
    console.log(`🔗 Connection State: ${conn.connection.readyState === 1 ? 'Connected' : 'Disconnected'}\n`);

    // Handle connection events
    mongoose.connection.on('error', (error) => {
      console.error('❌ MongoDB Connection Error:', error.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB Disconnected - Attempting to reconnect...');
    });

  } catch (error) {
    console.error('\n❌ MongoDB Connection Failed!');
    console.error(`📌 Error: ${error.message}`);
    console.error(`💡 Tip: Check your MONGODB_URI in .env file\n`);
    process.exit(1);
  }
};

module.exports = connectDB;
