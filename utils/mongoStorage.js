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

export async function getMetricsByNotificationId(message_id) {
  const db = getDB();
  return await db.collection(METRICS_COLLECTION).find({ notification_id: message_id }).toArray();
}

export async function getMetricByNotificationAndToken(message_id, token) {
  const db = getDB();
  return await db.collection(METRICS_COLLECTION).findOne({
    notification_id: message_id,
    token
  });
}

export async function updateMetric(message_id, token, updates) {
  const db = getDB();
  const result = await db.collection(METRICS_COLLECTION).findOneAndUpdate(
    { notification_id: message_id, token },
    { $set: updates },
    { returnDocument: 'after' }
  );

  return result;
}
