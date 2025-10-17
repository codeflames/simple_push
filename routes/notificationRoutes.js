import express from 'express';
import { sendPushNotifications } from '../controllers/notificationController.js';
import { updateMetrics, getNotificationMetrics } from '../controllers/metricsController.js';

const router = express.Router();

router.post('/send', sendPushNotifications);

router.post('/metrics', updateMetrics);

router.get('/metrics/:message_id', getNotificationMetrics);

export default router;
