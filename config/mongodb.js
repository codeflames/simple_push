import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

let client = null;
let db = null;

export const connectMongoDB = async () => {
  if (db) {
    return db;
  }

  try {
    const uri = process.env.MONGODB_URI;

    if (!uri) {
      throw new Error('MONGODB_URI not found in environment variables');
    }

    client = new MongoClient(uri);
    await client.connect();

    db = client.db(process.env.MONGODB_DB_NAME || 'push_notifications');

    console.log('MongoDB connected successfully');
    return db;
  } catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
    throw new Error('Failed to connect to MongoDB. Please check MONGODB_URI in .env');
  }
};

export const getDB = () => {
  if (!db) {
    throw new Error('Database not initialized. Call connectMongoDB() first');
  }
  return db;
};

export const closeMongoDB = async () => {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('MongoDB connection closed');
  }
};
