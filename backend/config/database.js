const mongoose = require('mongoose');
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

// Cached connection (reused across serverless invocations on Vercel)
let cached = global._mongoose;
if (!cached) cached = global._mongoose = { conn: null, promise: null };

const connectDB = async () => {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      family: 4,
      bufferCommands: false,
    }).then((m) => {
      console.log(`MongoDB connected: ${m.connection.host}`);
      return m;
    });
  }
  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    console.error('MongoDB connection error:', error.message);
    throw error;
  }
  return cached.conn;
};
module.exports = connectDB;
