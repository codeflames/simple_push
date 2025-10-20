import { getMessaging } from '../config/firebase.js';
import { saveNotification, saveMetric, updateMetric } from '../utils/mongoStorage.js';
import { randomUUID } from 'crypto';

export const sendPushNotifications = async (req, res) => {
  try {
    const { 
      tokens, 
      title, 
      body, 
      data = {},
    } = req.body;

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
      id: randomUUID(),  // This will be our message_id
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
    
    // Construct base FCM message with proper structure for both iOS and Android
    const message = {
      // Generic notification content - primarily for Android
      notification: { 
        title, 
        body 
      },
      
      // Data payload with tracking fields and other custom data
      data: {
        ...data,
        // Add delivery_ prefix to fields in the notification sent to devices
        delivery_message_id: notificationRecord.id,
        delivery_send_context: send_context,
        delivery_send_context_id: send_context_id,
      },
      
      // iOS-specific configuration
      apns: {
        payload: {
          aps: {
            alert: {
              title:  title, // Use iOS-specific title if provided
              body: body,    // Use iOS-specific body if provided
            },
            'mutable-content': 1, // This enables the notification service extension
         
          }
        }
      },
      
      // Android-specific configuration
      android: {
        notification: {
          title: title,
          body: body
        }
      }
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
          delivered: false,  // Don't mark as delivered until client confirms
          delivered_at: null,
          opened: false,
          opened_at: null,
          send_context,
          send_context_id,
          person_id: data.person_id || token, // Use person_id from data or fall back to token
        });

        // Only mark as sent to FCM, not delivered to device
        await updateMetric(notificationRecord.id, token, { sent: true, sent_at: new Date().toISOString() });

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
      message_id: notificationRecord.id,
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
