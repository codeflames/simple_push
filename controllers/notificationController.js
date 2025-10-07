import { getMessaging } from '../config/firebase.js';
import { saveNotification, saveMetric } from '../utils/mongoStorage.js';
import { randomUUID } from 'crypto';

export const sendPushNotifications = async (req, res) => {
  try {
    const { tokens, title, body, data = {} } = req.body;

    // Validate request body
    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Tokens array is required and must not be empty',
      });
    }

    if (!title || !body) {
      return res.status(400).json({
        success: false,
        error: 'Title and body are required',
      });
    }

    // Record the main notification entry
    const notificationRecord = {
      id: randomUUID(),
      title,
      body,
      data,
      tokens_count: tokens.length,
      created_at: new Date().toISOString(),
    };

    await saveNotification(notificationRecord);

    const messaging = getMessaging();

    // Construct base FCM message
    const message = {
      notification: { title, body },
      data: {
        ...data,
        notification_id: notificationRecord.id,
      },
      apns: {
        payload: {
          aps: {
            'mutable-content': 1, // Correct APNs key
          },
        },
      },
    };

    // Send to each token
    const sendPromises = tokens.map(async (token) => {
      try {
        await messaging.send({ ...message, token });

        const metricId = randomUUID();

        await saveMetric({
          id: metricId,
          notification_id: notificationRecord.id,
          token,
          delivered: true,
          delivered_at: new Date().toISOString(),
          opened: false,
          opened_at: null,
        });

        // Update metric after save (example: marking as confirmed)
        await updateMetric(metricId, { confirmed: true });

        return { token, success: true };
      } catch (error) {
        console.error(`Failed to send to token ${token}:`, error.message);

        const metricId = randomUUID();

        await saveMetric({
          id: metricId,
          notification_id: notificationRecord.id,
          token,
          delivered: false,
          delivered_at: null,
          opened: false,
          opened_at: null,
        });

        // Optionally update metric with failure info
        await updateMetric(metricId, { error: error.message });

        return { token, success: false, error: error.message };
      }
    });

    const results = await Promise.all(sendPromises);

    // Calculate summary
    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    res.status(200).json({
      success: true,
      notificationId: notificationRecord.id,
      summary: {
        total: tokens.length,
        succeeded: successCount,
        failed: failureCount,
      },
      results,
    });
  } catch (error) {
    console.error('Error sending push notifications:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
