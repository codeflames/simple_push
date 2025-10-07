# Push Notification System

A Node.js backend system for sending Firebase push notifications and tracking delivery/open metrics using Supabase.

## Features

- Send push notifications to multiple FCM tokens
- Track delivery and open rates
- Store metrics in Supabase database
- RESTful API endpoints
- Comprehensive error handling

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Update `.env` with your Firebase service account credentials:

```env
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"..."}
```

To get your Firebase service account:
1. Go to Firebase Console
2. Project Settings > Service Accounts
3. Click "Generate New Private Key"
4. Copy the entire JSON content to the `FIREBASE_SERVICE_ACCOUNT` variable

### 3. Setup Database

The system uses Supabase with the following tables:
- `push_notifications` - Stores notification records
- `notification_tokens` - Manages device tokens
- `notification_metrics` - Tracks delivery and open metrics

### 4. Start the Server

```bash
npm start
```

The server will run on `http://localhost:3000`

## API Endpoints

### 1. Send Push Notifications

**POST** `/api/notifications/send`

Send push notifications to multiple devices.

**Request Body:**
```json
{
  "tokens": ["fcm_token_1", "fcm_token_2"],
  "title": "Notification Title",
  "body": "Notification message body",
  "data": {
    "custom_key": "custom_value"
  }
}
```

**Response:**
```json
{
  "success": true,
  "notificationId": "uuid",
  "summary": {
    "total": 2,
    "succeeded": 2,
    "failed": 0
  },
  "results": [
    { "token": "fcm_token_1", "success": true },
    { "token": "fcm_token_2", "success": true }
  ]
}
```

### 2. Update Metrics

**POST** `/api/notifications/metrics`

Report delivery or open events from client devices.

**Request Body:**
```json
{
  "notificationId": "notification-uuid",
  "token": "fcm_token",
  "event": "delivered",
  "timestamp": "2025-10-06T12:00:00Z"
}
```

Events: `delivered` or `opened`

**Response:**
```json
{
  "success": true,
  "message": "Metric delivered recorded successfully",
  "data": {
    "id": "metric-uuid",
    "notification_id": "notification-uuid",
    "token": "fcm_token",
    "delivered": true,
    "opened": false,
    "delivered_at": "2025-10-06T12:00:00Z"
  }
}
```

### 3. Get Notification Metrics

**GET** `/api/notifications/metrics/:notificationId`

Retrieve analytics for a specific notification.

**Response:**
```json
{
  "success": true,
  "notification": {
    "id": "notification-uuid",
    "title": "Notification Title",
    "body": "Message body",
    "created_at": "2025-10-06T12:00:00Z"
  },
  "metrics": {
    "totalSent": 100,
    "delivered": 95,
    "opened": 45,
    "failed": 5,
    "deliveryRate": "95.00%",
    "openRate": "47.37%"
  }
}
```

### 4. Health Check

**GET** `/health`

Check if the service is running.

## Client Integration Example

### Send Metrics from Mobile App

When your app receives a notification:

```javascript
// When notification is delivered
fetch('http://your-server.com/api/notifications/metrics', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    notificationId: notification.data.notificationId,
    token: fcmToken,
    event: 'delivered',
    timestamp: new Date().toISOString()
  })
});

// When user opens/clicks notification
fetch('http://your-server.com/api/notifications/metrics', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    notificationId: notification.data.notificationId,
    token: fcmToken,
    event: 'opened',
    timestamp: new Date().toISOString()
  })
});
```

## Database Schema

### push_notifications
- `id` - UUID primary key
- `title` - Notification title
- `body` - Notification body
- `data` - Additional JSON data
- `tokens_count` - Number of tokens
- `created_at` - Timestamp

### notification_metrics
- `id` - UUID primary key
- `notification_id` - Foreign key to push_notifications
- `token` - FCM device token
- `delivered` - Boolean delivery status
- `opened` - Boolean open status
- `delivered_at` - Delivery timestamp
- `opened_at` - Open timestamp
- `created_at` - Record creation timestamp

## Error Handling

The API returns appropriate HTTP status codes:
- `200` - Success
- `400` - Bad request (invalid parameters)
- `404` - Resource not found
- `500` - Server error

All error responses include:
```json
{
  "success": false,
  "error": "Error description"
}
```




