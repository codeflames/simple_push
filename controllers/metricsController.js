import { getMetricByNotificationAndToken, updateMetric, saveMetric, getNotificationById, getMetricsByNotificationId } from '../utils/mongoStorage.js';
import { randomUUID } from 'crypto';

export const updateMetrics = async (req, res) => {
  try {
    const { notificationId, token, event, timestamp } = req.body;

    if (!notificationId || !event) {
      return res.status(400).json({
        success: false,
        error: 'notificationId, and event are required'
      });
    }

    if (!['delivered', 'opened'].includes(event)) {
      return res.status(400).json({
        success: false,
        error: 'Event must be either "delivered" or "opened"'
      });
    }

    const eventTimestamp = timestamp || new Date().toISOString();

    const existingMetric = await getMetricByNotificationAndToken(notificationId, token);

    let result;

    if (existingMetric) {
      const updateData = {};

      if (event === 'delivered') {
        updateData.delivered = true;
        updateData.delivered_at = eventTimestamp;
      } else if (event === 'opened') {
        updateData.opened = true;
        updateData.opened_at = eventTimestamp;
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
        delivered: event === 'delivered' || event === 'opened',
        opened: event === 'opened',
        delivered_at: event === 'delivered' || event === 'opened' ? eventTimestamp : null,
        opened_at: event === 'opened' ? eventTimestamp : null
      };

      result = await saveMetric(insertData);
    }

    res.status(200).json({
      success: true,
      message: `Metric ${event} recorded successfully`,
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
    const { notificationId } = req.params;

    if (!notificationId) {
      return res.status(400).json({
        success: false,
        error: 'notificationId is required'
      });
    }

    const notification = await getNotificationById(notificationId);

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    const metrics = await getMetricsByNotificationId(notificationId);

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
