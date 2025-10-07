import express from 'express';
import dotenv from 'dotenv';
import { initializeFirebase } from './config/firebase.js';
import notificationRoutes from './routes/notificationRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

try {
  initializeFirebase();
} catch (error) {
  console.error('Warning: Firebase not initialized. Add FIREBASE_SERVICE_ACCOUNT to .env');
}

app.use('/api/notifications', notificationRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Push Notification Service is running' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
