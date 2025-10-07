import { getMessaging } from '../config/firebase.js';
import { saveNotification, saveMetric, updateMetric } from '../utils/fileStorage.js';
import { randomUUID } from 'crypto';

export const sendPushNotifications = async (req, res) => {
  try {
    const { tokens, title, body, data = {} } = req.body;

    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Tokens array is required and must not be empty'
      });
    }

    if (!title || !body) {
      return res.status(400).json({
        success: false,
        error: 'Title and body are required'
      });
    }

    const notificationRecord = {
      id: randomUUID(),
      title,
      body,
      data,
      tokens_count: tokens.length,
      created_at: new Date().toISOString()
    };

    await saveNotification(notificationRecord);

    const messaging = getMessaging();

    const message = {
      notification: {
        title,
        body
      },
      data: {
        ...data,
        notificationId: notificationRecord.id
      }
    };

    const sendPromises = tokens.map(async (token) => {
      try {
        await messaging.send({ ...message, token });

        await saveMetric({
          id: randomUUID(),
          notification_id: notificationRecord.id,
          token,
          delivered: true,
          delivered_at: new Date().toISOString(),
          opened: false,
          opened_at: null
        });

        return { token, success: true };
      } catch (error) {
        console.error(`Failed to send to token ${token}:`, error.message);

        await saveMetric({
          id: randomUUID(),
          notification_id: notificationRecord.id,
          token,
          delivered: false,
          delivered_at: null,
          opened: false,
          opened_at: null
        });

        return { token, success: false, error: error.message };
      }
    });

    const results = await Promise.all(sendPromises);

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    res.status(200).json({
      success: true,
      notificationId: notificationRecord.id,
      summary: {
        total: tokens.length,
        succeeded: successCount,
        failed: failureCount
      },
      results
    });

  } catch (error) {
    console.error('Error sending push notifications:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
