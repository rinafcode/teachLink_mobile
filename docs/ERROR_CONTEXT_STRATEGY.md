# Error Context Strategy — Sentry Integration

> **Related service**: `src/services/sentryContext.ts`  
> **Crash reporter**: `src/services/crashReporting.ts`  
> **Logging config**: `src/config/logging.ts`

---

## Overview

Every unhandled error and caught exception in teachLink Mobile is forwarded to [Sentry](https://sentry.io) with **rich, automatic context** so any engineer can reconstruct the exact user journey that led to a crash — without needing to contact the user or reproduce the issue manually.

---

## Architecture

```
User Action / Network Event / Lifecycle
         │
         ▼
  sentryContextService        ← central context hub
  ┌──────────────────────┐
  │ setUser()            │  ← identifies user on every event
  │ trackScreen()        │  ← navigation breadcrumbs
  │ trackAction()        │  ← UI interaction breadcrumbs
  │ trackNetworkRequest()│  ← API call breadcrumbs
  │ trackAppLifecycle()  │  ← foreground/background/crash
  │ addBreadcrumb()      │  ← general-purpose fallback
  └──────────┬───────────┘
             │ (scope enrichment)
             ▼
      ┌─────────────┐    ┌──────────────────┐
      │  Sentry SDK  │    │  crashReporting   │
      │  (cloud)    │ ◄──│  reportError()    │
      └─────────────┘    └──────────────────┘
             ▲
      ┌──────┴──────┐
      │ logger.ts   │  ERROR-level logs → Sentry breadcrumb + captureMessage/Exception
      └─────────────┘
```

---

## What Gets Captured

### 1. User Identity

Set automatically by the Zustand store's `setUser` action. Every subsequent Sentry event is tagged with:

| Field | Sentry Attribute | Example |
|---|---|---|
| `user.id` | `user.id` | `u-abc123` |
| `user.email` | `user.email` | `ada@teachlink.com` |
| `user.name` | `user.username` | `Ada Lovelace` |
| `user.role` | tag `user.role` | `student`, `teacher` |

Cleared automatically on `logout()`.

### 2. Breadcrumb Trail

Each Sentry event arrives with the **last 100 breadcrumbs** describing the session. Sources:

| Category | Added by | Example message |
|---|---|---|
| `navigation` | `trackScreen()` | `Navigated to QuizScreen` |
| `user.action` | `trackAction()` | `tap_enroll_button` |
| `network` | `trackNetworkRequest()` | `POST /api/quiz/submit` |
| `auth` | `setUser()` / `clearUser()` | `User signed in (id=...)` |
| `app.lifecycle` | `trackAppLifecycle()` | `App foreground` |
| `log` | `logger.ts` WARN/ERROR sink | `API Error: 401 /api/auth` |
| `custom` | `addBreadcrumb()` | Any caller-supplied message |

### 3. Custom Tags (Dashboard Filters)

Tags are indexed by Sentry and available as filter facets on the Issues dashboard:

| Tag key | Values | Added by |
|---|---|---|
| `screen.current` | Screen name | `trackScreen()` + `beforeSend` hook |
| `screen.previous` | Previous screen | `trackScreen()` |
| `user.role` | `student` / `teacher` / `admin` | `setUser()` |
| `crash_type` | `fatal` / `non_fatal` | `crashReporting.captureCrash()` |
| `error_context` | Caller-supplied string | `crashReporting.reportError()` |
| `error.screen` | Screen at error time | `captureException(err, {}, screen)` |
| `error.action` | Action at error time | `captureException(err, {}, _, action)` |

### 4. Rich Extra / Contexts

Every exception also carries structured `extra` and `contexts` objects:

```json
{
  "extra": {
    "sessionDurationMs": 87432,
    "actionCount": 14,
    "isFatal": false,
    "unhandledErrorCount": 1
  },
  "contexts": {
    "session": {
      "screen": "QuizScreen",
      "previousScreen": "CourseDetailScreen",
      "sessionStartedAt": "2026-05-31T14:22:10.000Z",
      "actionCount": 14
    },
    "logging": {
      "component": "QuizService",
      "action": "submit_answer",
      "requestId": "req-xyz"
    }
  }
}
```

---

## Integration Points

### Store (`src/store/index.ts`)
`setUser()` and `logout()` automatically sync the Sentry scope so no manual calls are needed in feature code.

### Crash Reporter (`src/services/crashReporting.ts`)
All global JS and promise-rejection errors flow through `crashReportingService` which calls `sentryContextService.captureException()` with full crash metadata.

### Logger (`src/config/logging.ts` → `sendToRemoteLogging`)
- **WARN** → Sentry breadcrumb only
- **ERROR** → Sentry breadcrumb + `captureException` / `captureMessage` with full session context

### App Lifecycle (`App.tsx`)
| Event | Breadcrumb |
|---|---|
| Cold start | `App launch` + `app_cold_start` action |
| Foreground | `App foreground` |
| Background | `App background` + log queue flush |
| Crash | `App crash` (fatal) + session snapshot |

### Navigation (`src/navigation/AuthGuard.tsx`)
Unauthenticated redirect is captured as an `auth` breadcrumb before the redirect fires.

---

## Sentry Dashboard Setup

### Recommended Saved Searches

Create these saved searches in **Issues → Saved Searches** for fast triage:

```
# Fatal crashes only
is:unresolved level:fatal

# Errors on a specific screen
is:unresolved tags[screen.current]:QuizScreen

# Errors affecting teachers
is:unresolved tags[user.role]:teacher

# High-frequency network errors
is:unresolved tags[error_context]:api_call times_seen:>50
```

### Recommended Alerts

| Alert | Condition | Action |
|---|---|---|
| **Fatal crash spike** | `level:fatal` count > 5 in 5 min | PagerDuty |
| **Error rate surge** | Issue event count > 100/hr | Slack `#prod-alerts` |
| **Auth loop** | `tags[error_context]:auth` > 20/hr | Slack `#on-call` |
| **Payment failure** | `tags[error.screen]:CheckoutScreen` > 10/hr | Slack `#payments` |

### Recommended Performance Monitors

Navigate to **Performance → Monitors** and create:

- **Cold start P75** — Transaction `app_cold_start`, threshold `< 3000 ms`
- **API error rate** — Transaction `POST /api/*`, failure rate `< 1%`

---

## How to Use in Feature Code

### Report a caught error with context
```ts
import { sentryContextService } from '../services/sentryContext';

try {
  await submitQuiz(answers);
} catch (err) {
  sentryContextService.captureException(err as Error, {
    tags: { quiz_id: quizId },
    extra: { answerCount: answers.length },
    fingerprint: ['quiz-submit-failure', quizId],
  });
}
```

### Track a meaningful user action
```ts
sentryContextService.trackAction('enroll_course', { courseId, price });
```

### Track a network call
```ts
sentryContextService.trackNetworkRequest('POST', '/api/enroll', response.status, durationMs);
```

### Capture a non-exception warning
```ts
sentryContextService.captureMessage(
  'Checkout reached rate limit',
  'warning',
  { tags: { payment_provider: 'stripe' } },
);
```

---

## Security Considerations

- **Auth tokens are stripped** from request headers in the `beforeSend` Sentry hook (`src/config/logging.ts`).
- **Token query parameters** (`?token=`, `?access_token=`) are sanitised from URLs in `beforeBreadcrumb`.
- **PII minimisation** — breadcrumb data should never include raw passwords, card numbers, or national IDs.
- User email is only sent to Sentry when the user is authenticated; it is cleared on logout.

---

## Testing

Run the dedicated test suite:

```bash
npx jest src/__tests__/services/sentryContext.test.ts --verbose
```

All Sentry SDK calls are mocked so tests run offline with no real network traffic. The test file covers:

- User identity binding and clearing
- Screen navigation breadcrumbs (from/to, previous screen tag)
- Action breadcrumbs with incrementing index
- Network breadcrumb severity (2xx → info, 4xx/5xx → warning)
- `buildCaptureContext` merging (tags, extra, contexts, fingerprint)
- `captureException` — auto tags `error.screen` / `error.action`
- `captureMessage` — correct severity level forwarded
- App lifecycle breadcrumbs (launch, foreground, background, crash)
- Session reset zeroes counters and clears breadcrumbs
