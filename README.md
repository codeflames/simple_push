# Push Notification System

A Node.js backend system for sending Firebase push notifications and tracking delivery/open metrics using Supabase.

## Features

- Send push notifications to multiple FCM tokens
- Track delivery and open rates
- Store metrics in Supabase database
- RESTful API endpoints
- Comprehensive error handling
- Platform-specific notification customization for iOS and Android

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

**POST** `/v1/message/send`

or legacy endpoint:

**POST** `/api/notifications/send`

Send push notifications to multiple devices.

**Request Body:**
```json
{
  "tokens": ["ecXhqt7LoUcciIeBVKIZXK:APA91bGeGfY_pdXlJ5OwydyGcsF3oK_FTdXVqVDKV_EGy6nCJefRMRcSuD1ZCZb923hWIa0dhRo-R-vVrgRbKDU2GyO17-2cYnBKoiLz4D86X-EbWA4tfNk"],
  "title": "Notification Title",
  "body": "Notification message body",
  "iosTitle": "iOS Specific Title (Optional)",
  "iosBody": "iOS Specific Body (Optional)",
  "sound": "default",
  "androidChannelId": "your_notification_channel_id",
  "data": {
    "custom_key": "custom_value",
    "person_id": "user_987654321",
    "send_context": "transactional",
    "send_context_id": "",
    "screen": "/home",
    "item_id": "12345"
  }
}
```

#### Platform-Specific Options

The API supports customizing notifications for specific platforms:

| Parameter | Platform | Description |
|-----------|----------|-------------|
| `iosTitle` | iOS | Override title for iOS devices only |
| `iosBody` | iOS | Override body text for iOS devices only |
| `sound` | iOS | Notification sound (e.g., "default" or custom sound) |
| `androidChannelId` | Android | Notification channel ID for Android devices (required for Android 8.0+) |
| `data.channel_id` | Android | Alternative way to specify Android channel ID |

These options allow you to customize how your notification appears on different platforms while keeping a single API call.

**Response:**
```json
{
  "success": true,
  "message_id": "uuid",
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

**POST** `/v1/message/delivery`
**POST** `/v1/message/delivery/push` (alternative path)

or legacy endpoint:

**POST** `/api/notifications/metrics`

Report delivery or open events from client devices.

**Request Body:**
```json
{
  "message_id": "msg_1234567890",
  "person_id": "user_987654321",
  "send_context": "transactional",
  "send_context_id": "",
  "status": "delivered",
  "ts": "2025-10-15T09:45:30.123Z"
}
```

Status: `delivered` or `opened`

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

**GET** `/v1/message/:message_id/analytics`

or legacy endpoint:

**GET** `/api/notifications/metrics/:message_id`

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

**Important**: The system now requires client apps to report delivery status. Notifications are not automatically marked as delivered when sent.

When your app receives a notification:

```javascript
// When notification is delivered
fetch('http://your-server.com/v1/message/delivery/push', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message_id: notification.data.delivery_message_id,
    person_id: notification.data.person_id || fcmToken,
    send_context: notification.data.delivery_send_context || 'transactional',
    send_context_id: notification.data.delivery_send_context_id || '',
    status: 'delivered',
    ts: new Date().toISOString()
  })
});

// When user opens/clicks notification
fetch('http://your-server.com/v1/message/delivery/push', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message_id: notification.data.delivery_message_id,
    person_id: notification.data.person_id || fcmToken,
    send_context: notification.data.delivery_send_context || 'transactional',
    send_context_id: notification.data.delivery_send_context_id || '',
    status: 'opened',
    ts: new Date().toISOString()
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
- `notification_id` - Foreign key to push_notifications (this is the message_id)
- `token` - FCM device token
- `person_id` - Identifier of the user who received the notification
- `delivered` - Boolean delivery status
- `opened` - Boolean open status
- `delivered_at` - Delivery timestamp
- `opened_at` - Open timestamp
- `send_context` - Context in which the notification was sent (e.g., 'transactional')
- `send_context_id` - Identifier for the specific context
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







curl -X POST http://localhost:3000/v1/message/send \
  -H "Content-Type: application/json" \
  -d '{
    "tokens": ["cI9oZvx2ekDcjlRRVdRmyi:APA91bGxEtB7bP16fgmcRZxLoC4d6HdNxtwJXhmmAI9towqO72-p8Z2fUEssA0TxDic3h8bWc2NRaWYrw8uzWx-Flm4iXIpe8xUgmtplNnSY5OXhg9gnYfk"],
    "title": "Notification Title",
    "body": "Notification message body",
    "iosTitle": "iOS Specific Title",
    "iosBody": "iOS Specific Body Text",
    "sound": "default",
    "androidChannelId": "default_channel",
    "data": {
      "custom_key": "custom_value",
      "person_id": "user_123456",
      "send_context": "transactional",
      "send_context_id": "order_7890",
      "screen": "/home",
      "item_id": "12345"
    }
  }'

# IMPORTANT: Client must call this endpoint to report delivery status
curl -X POST http://localhost:3000/v1/message/delivery/push \
  -H "Content-Type: application/json" \
  -d '{
    "message_id": "msg_1234567890",
    "person_id": "user_987654321",
    "send_context": "transactional",
    "send_context_id": "",
    "status": "delivered",
    "ts": "2025-10-15T09:45:30.123Z"
  }'

# Example: iOS-specific notification with custom sound
curl -X POST http://localhost:3000/v1/message/send \
  -H "Content-Type: application/json" \
  -d '{
    "tokens": ["YOUR_FCM_TOKEN"],
    "title": "Generic Title",
    "body": "Generic Body",
    "iosTitle": "Special iOS Title",
    "iosBody": "Special iOS Body with emoji 🎉",
    "sound": "custom_sound.aiff",
    "data": {
      "person_id": "user_123456",
      "send_context": "transactional",
      "screen": "/settings"
    }
  }'

# Example: Android-specific notification with channel ID
curl -X POST http://localhost:3000/v1/message/send \
  -H "Content-Type: application/json" \
  -d '{
    "tokens": ["YOUR_FCM_TOKEN"],
    "title": "Important Update",
    "body": "Your order has been processed",
    "androidChannelId": "orders_channel",
    "data": {
      "person_id": "user_123456",
      "send_context": "transactional",
      "send_context_id": "order_8765",
      "screen": "/orders",
      "order_id": "8765"
    }
  }'



