const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/projectff';
    
    // Mongoose 6+ does not need useNewUrlParser or useUnifiedTopology
    const conn = await mongoose.connect(uri);
    
    console.log(`MongoDB connected: ${conn.connection.host} (DB: ${conn.connection.name})`);
    return conn;
  } catch (err) {
    console.error('MongoDB connection error', err.message || err);
    process.exit(1);
  }
};

module.exports = connectDB;
