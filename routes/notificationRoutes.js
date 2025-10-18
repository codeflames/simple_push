import express from 'express';
import { sendPushNotifications } from '../controllers/notificationController.js';
import { updateMetrics, getNotificationMetrics } from '../controllers/metricsController.js';

const router = express.Router();

// Legacy routes - keep for backward compatibility
router.post('/send', sendPushNotifications);
router.post('/metrics', updateMetrics);
router.get('/metrics/:message_id', getNotificationMetrics);

// New versioned routes with consistent naming convention
router.post('/v1/message/send', sendPushNotifications);         // For sending notifications
router.post('/v1/message/delivery', updateMetrics);             // For updating delivery metrics
router.post('/v1/message/delivery/push', updateMetrics);        // Alternative path for delivery metrics
router.get('/v1/message/:message_id/analytics', getNotificationMetrics); // For getting message analytics

export default router;
