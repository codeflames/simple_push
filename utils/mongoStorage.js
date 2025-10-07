import { getDB } from '../config/mongodb.js';

const NOTIFICATIONS_COLLECTION = 'notifications';
const METRICS_COLLECTION = 'metrics';

export async function saveNotification(notification) {
  const db = getDB();
  await db.collection(NOTIFICATIONS_COLLECTION).insertOne(notification);
  return notification;
}

export async function getNotificationById(id) {
  const db = getDB();
  return await db.collection(NOTIFICATIONS_COLLECTION).findOne({ id });
}

export async function saveMetric(metric) {
  const db = getDB();
  await db.collection(METRICS_COLLECTION).insertOne(metric);
  return metric;
}

export async function getMetricsByNotificationId(notificationId) {
  const db = getDB();
  return await db.collection(METRICS_COLLECTION).find({ notification_id: notificationId }).toArray();
}

export async function getMetricByNotificationAndToken(notificationId, token) {
  const db = getDB();
  return await db.collection(METRICS_COLLECTION).findOne({
    notification_id: notificationId,
    token
  });
}

export async function updateMetric(notificationId, token, updates) {
  const db = getDB();
  const result = await db.collection(METRICS_COLLECTION).findOneAndUpdate(
    { notification_id: notificationId, token },
    { $set: updates },
    { returnDocument: 'after' }
  );

  return result;
}
