import { promises as fs } from 'fs';
import { join } from 'path';

const DATA_DIR = './data';
const NOTIFICATIONS_FILE = join(DATA_DIR, 'notifications.txt');
const METRICS_FILE = join(DATA_DIR, 'metrics.txt');

async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }
}

async function readFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return content.trim().split('\n').filter(line => line).map(line => JSON.parse(line));
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

async function appendToFile(filePath, data) {
  await ensureDataDir();
  await fs.appendFile(filePath, JSON.stringify(data) + '\n', 'utf-8');
}

async function updateLineInFile(filePath, predicate, updater) {
  const lines = await readFile(filePath);
  let updated = false;

  const newLines = lines.map(item => {
    if (predicate(item)) {
      updated = true;
      return updater(item);
    }
    return item;
  });

  if (updated) {
    await ensureDataDir();
    const content = newLines.map(item => JSON.stringify(item)).join('\n') + '\n';
    await fs.writeFile(filePath, content, 'utf-8');
  }

  return updated;
}

export async function saveNotification(notification) {
  await appendToFile(NOTIFICATIONS_FILE, notification);
  return notification;
}

export async function getNotificationById(id) {
  const notifications = await readFile(NOTIFICATIONS_FILE);
  return notifications.find(n => n.id === id);
}

export async function saveMetric(metric) {
  await appendToFile(METRICS_FILE, metric);
  return metric;
}

export async function getMetricsByNotificationId(message_id) {
  const metrics = await readFile(METRICS_FILE);
  return metrics.filter(m => m.notification_id === message_id);
}

export async function getMetricByNotificationAndToken(message_id, token) {
  const metrics = await readFile(METRICS_FILE);
  return metrics.find(m => m.notification_id === message_id && m.token === token);
}

export async function updateMetric(message_id, token, updates) {
  const updated = await updateLineInFile(
    METRICS_FILE,
    m => m.notification_id === message_id && m.token === token,
    m => ({ ...m, ...updates })
  );

  if (updated) {
    return await getMetricByNotificationAndToken(message_id, token);
  }

  return null;
}
