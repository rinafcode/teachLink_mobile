# Notification Strategy

This document outlines the strategy for handling push notifications in the mobile application.

## Token Registration

When a user enables push notifications, the app generates a unique Expo Push Token. This token is sent to the backend and associated with the user's account.

**Endpoint:** `POST /api/notifications/register`

**Request Body:**

```json
{
  "token": "ExponentPushToken[...]",
  "platform": "ios" | "android"
}
```

**Response:**

- `200 OK`: If the token is successfully registered.
- `400 Bad Request`: If the request is malformed.
- `500 Internal Server Error`: If an error occurs on the backend.

## Token De-registration

When a user logs out or disables push notifications, the app sends a request to the backend to de-register the token.

**Endpoint:** `DELETE /api/notifications/tokens/:token`

**Response:**

- `204 No Content`: If the token is successfully de-registered.
- `404 Not Found`: If the token does not exist.
- `500 Internal Server Error`: If an error occurs on the backend.

## Token Refresh

The Expo push token can be rotated by the OS. The app listens for token refresh events and re-registers the new token with the backend automatically.

## Notification Preferences

Users can customize their notification preferences in the app settings. These preferences are stored on the backend and used to determine which notifications to send.

**Endpoint:** `PUT /api/notifications/preferences`

**Request Body:**

```json
{
  "courseUpdates": true,
  "messages": false,
  "learningReminders": true,
  "achievementUnlocks": true,
  "communityActivity": false
}
```

**Response:**

- `200 OK`: If the preferences are successfully updated.
- `400 Bad Request`: If the request is malformed.
- `500 Internal Server Error`: If an error occurs on the backend.