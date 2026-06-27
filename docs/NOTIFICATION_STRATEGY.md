# Notification Strategy

## Overview
TeachLink implements a robust notification handling system to prevent notification spam, deduplicate identical alerts, and batch similar notifications. This ensures a high-quality user experience without overwhelming the user or draining their device's battery.

## Core Features

### 1. Deduplication
Duplicate notifications sent within a **10-minute window** are automatically ignored. 
- A unique fingerprint is generated for each incoming notification based on its `type`, `targetKey`, `title`, and `body`.
- We maintain a history of the last 200 notifications. If an incoming notification matches a fingerprint in the history within the deduplication window, it is suppressed.

### 2. Batching (Grouping)
Similar notifications are grouped together into a single summary notification if they have the same `type` and target data (e.g., multiple messages in the same conversation).
- Titles and bodies are aggregated (e.g., "2 new messages").
- The group count is tracked and updated as new notifications for the same group arrive.

### 3. Adaptive Throttling (Spam Prevention)
To prevent notification spam, we apply adaptive throttling based on user engagement. The time gap required between notifications of the same type depends on when the user last interacted with a notification:
- **Active users** (engaged within 24 hours): Throttled to max 1 per 5 minutes.
- **Recently inactive** (24-72 hours): Throttled to max 1 per 30 minutes.
- **Inactive** (72+ hours): Throttled to max 1 per 3 hours (180 minutes).

### 4. Storage & History Limit
- Unread counts and grouped notifications are stored persistently using `Zustand` and `AsyncStorage`.
- The primary notification queue is capped at **100 stored notifications**.
- The deduplication history is capped at **200 entries** to ensure fast read/write operations and minimal memory usage.