import mongoose from 'mongoose';

// Track connection state globally
let isConnected = false;
let connectionAttempts = 0;
const MAX_RETRIES = 3;

const connectDB = async () => {
  try {
    // If already connected, return early
    if (isConnected && mongoose.connection.readyState === 1) {
      console.log('✅ Using existing MongoDB connection');
      return mongoose.connection;
    }

    // Check for MongoDB URI
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

    if (!mongoUri) {
      throw new Error('❌ MongoDB URI not found in environment variables. Please set MONGO_URI or MONGODB_URI.');
    }

    // Log connection attempt
    connectionAttempts++;
    console.log(`📡 MongoDB connection attempt ${connectionAttempts}/${MAX_RETRIES}...`);

    // Connection options optimized for Railway
    const options = {
      serverSelectionTimeoutMS: 10000, // 10 seconds
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 2,
    };

    // Attempt connection
    const conn = await mongoose.connect(mongoUri, options);

    // Update connection state
    isConnected = true;
    connectionAttempts = 0;

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);

    // ====================================================
    // Connection Event Handlers
    // ====================================================

    // Handle connection errors
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err.message);
      isConnected = false;
    });

    // Handle disconnection
    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected');
      isConnected = false;
    });

    // Handle successful reconnection
    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
      isConnected = true;
    });

    return conn;

  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);

    // Check if we should retry
    if (connectionAttempts < MAX_RETRIES) {
      console.log(`🔄 Retrying connection in 2 seconds... (${connectionAttempts}/${MAX_RETRIES})`);

      // Wait and retry
      await new Promise(resolve => setTimeout(resolve, 2000));
      return connectDB();
    } else {
      console.error(`❌ Maximum connection attempts (${MAX_RETRIES}) reached`);
      // Don't exit the process - let the app run in degraded mode
      isConnected = false;
      throw error;
    }
  }
};

// Helper function to check connection status
export const getConnectionStatus = () => {
  return isConnected && mongoose.connection.readyState === 1;
};

// Helper function to get connection info
export const getConnectionInfo = () => {
  return {
    connected: isConnected && mongoose.connection.readyState === 1,
    readyState: mongoose.connection.readyState,
    host: mongoose.connection?.host || 'unknown',
    name: mongoose.connection?.name || 'unknown'
  };
};

export default connectDB;