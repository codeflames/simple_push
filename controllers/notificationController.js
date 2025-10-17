import { getMessaging } from '../config/firebase.js';
import { saveNotification, saveMetric, updateMetric } from '../utils/mongoStorage.js';
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

    // Extract send context info from data if available, or use defaults
    const send_context = data.send_context || 'transactional';
    const send_context_id = data.send_context_id || '';
    
    // Construct base FCM message
    const message = {
      notification: { title, body },
      data: {
        ...data,
        message_id: notificationRecord.id,  // Use message_id as required by metrics endpoint
        notification_id: notificationRecord.id, // Keep for backward compatibility
        send_context,
        send_context_id,
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
          send_context,
          send_context_id,
          person_id: data.person_id || token, // Use person_id from data or fall back to token
        });

        // Update metric after save (example: marking as confirmed)
        await updateMetric(notificationRecord.id, token, { confirmed: true });

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
          send_context,
          send_context_id,
          person_id: data.person_id || token, // Use person_id from data or fall back to token
        });

        // Optionally update metric with failure info
        // await updateMetric(metricId, { error: error.message });

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
