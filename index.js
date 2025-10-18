import express from 'express';
import dotenv from 'dotenv';
import { initializeFirebase } from './config/firebase.js';
import { connectMongoDB } from './config/mongodb.js';
import notificationRoutes from './routes/notificationRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Middleware to normalize paths with double slashes
app.use((req, res, next) => {
  if (req.url.includes('//')) {
    req.url = req.url.replace(/\/+/g, '/');
  }
  next();
});

try {
  initializeFirebase();
} catch (error) {
  console.error('Warning: Firebase not initialized. Add FIREBASE_SERVICE_ACCOUNT to .env');
}

try {
  await connectMongoDB();
} catch (error) {
  console.error('Warning: MongoDB not connected. Add MONGODB_URI to .env');
}

// Mount legacy routes at /api/notifications
app.use('/api/notifications', notificationRoutes);

// Mount versioned API routes at the root level for cleaner URLs
app.use('/', notificationRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Push Notification Service is running' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
