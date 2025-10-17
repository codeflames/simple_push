import { getMetricByNotificationAndToken, updateMetric, saveMetric, getNotificationById, getMetricsByNotificationId } from '../utils/mongoStorage.js';
import { randomUUID } from 'crypto';

export const updateMetrics = async (req, res) => {
  try {
    const { message_id, person_id, send_context, send_context_id, status, ts } = req.body;

    if (!message_id || !person_id || !status) {
      return res.status(400).json({
        success: false,
        error: 'message_id, person_id, and status are required'
      });
    }

    if (!['delivered', 'opened'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Status must be either "delivered" or "opened"'
      });
    }

    const eventTimestamp = ts || new Date().toISOString();

    // Using message_id as notification_id for tracking metrics
    const notificationId = message_id;
    // Using person_id as token for identifying the recipient
    const token = person_id;

    const existingMetric = await getMetricByNotificationAndToken(notificationId, token);

    let result;

    if (existingMetric) {
      const updateData = {};

      if (status === 'delivered') {
        updateData.delivered = true;
        updateData.delivered_at = eventTimestamp;
        updateData.send_context = send_context || existingMetric.send_context;
        updateData.send_context_id = send_context_id || existingMetric.send_context_id;
      } else if (status === 'opened') {
        updateData.opened = true;
        updateData.opened_at = eventTimestamp;
        updateData.send_context = send_context || existingMetric.send_context;
        updateData.send_context_id = send_context_id || existingMetric.send_context_id;
        if (!existingMetric.delivered) {
          updateData.delivered = true;
          updateData.delivered_at = eventTimestamp;
        }
      }

      result = await updateMetric(notificationId, token, updateData);

      if (!result) {
        return res.status(500).json({
          success: false,
          error: 'Failed to update metric'
        });
      }
    } else {
      const insertData = {
        id: randomUUID(),
        notification_id: notificationId,
        token,
        delivered: status === 'delivered' || status === 'opened',
        opened: status === 'opened',
        delivered_at: status === 'delivered' || status === 'opened' ? eventTimestamp : null,
        opened_at: status === 'opened' ? eventTimestamp : null,
        send_context: send_context || 'transactional',
        send_context_id: send_context_id || '',
        person_id: person_id
      };

      result = await saveMetric(insertData);
    }

    res.status(200).json({
      success: true,
      message: `Metric ${status} recorded successfully`,
      data: result
    });

  } catch (error) {
    console.error('Error updating metrics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const getNotificationMetrics = async (req, res) => {
  try {
    const { message_id } = req.params;

    if (!message_id) {
      return res.status(400).json({
        success: false,
        error: 'message_id is required'
      });
    }

    const notification = await getNotificationById(message_id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    const metrics = await getMetricsByNotificationId(message_id);

    const totalSent = notification.tokens_count;
    const delivered = metrics.filter(m => m.delivered).length;
    const opened = metrics.filter(m => m.opened).length;
    const deliveryRate = totalSent > 0 ? ((delivered / totalSent) * 100).toFixed(2) : 0;
    const openRate = delivered > 0 ? ((opened / delivered) * 100).toFixed(2) : 0;

    res.status(200).json({
      success: true,
      notification: {
        id: notification.id,
        title: notification.title,
        body: notification.body,
        created_at: notification.created_at
      },
      metrics: {
        totalSent,
        delivered,
        opened,
        failed: totalSent - delivered,
        deliveryRate: `${deliveryRate}%`,
        openRate: `${openRate}%`
      },
      details: metrics
    });

  } catch (error) {
    console.error('Error getting notification metrics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
