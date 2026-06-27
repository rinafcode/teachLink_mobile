# TeachLink Mobile

A cross-platform mobile app built with [Expo](https://expo.dev) and React Native for sharing knowledge, live chat, push notifications, and creator monetisation.

## Prerequisites

- **Node.js** v18 or later
- **npm** v9 or later (comes with Node.js)
- **Expo CLI** — `npm install -g expo-cli`
- **EAS CLI** (for builds/deploys) — `npm install -g eas-cli`
- **iOS Simulator** — Xcode (macOS only), via the App Store
- **Android Emulator** — [Android Studio](https://developer.android.com/studio) with a virtual device configured

## Installation

```bash
git clone https://github.com/shogun444/teachLink_mobile.git
cd teachLink_mobile
npm install
cp .env.example .env
```

Open `.env` and fill in the required values (see [Environment Variables](#environment-variables)).

## Running Locally

```bash
npx expo start          # Opens Expo dev tools — press i (iOS) or a (Android)
npx expo start --ios    # Launch directly in iOS Simulator
npx expo start --android # Launch directly in Android Emulator
npx expo start --web    # Run in browser (limited functionality)
```

## Storybook

- **Start:** `npm run storybook` to start the app in Storybook mode.
- **Add Story:** Create `*.stories.tsx` files in `src/components`.
- **View:** Open the app on your device/emulator to interact with components.
- **Guide:** See [storybook_guide.md](docs/storybook_guide.md) for more details.

## Running Tests

```bash
npm test                       # Run all tests once
npm run test:watch             # Watch mode — re-runs on file changes
npm run test:coverage          # Run with coverage report

# Run a single test file
npx jest src/__tests__/path/to/file.test.ts
```

## Logging

TeachLink uses a centralized, production-grade logging system with structured JSON output, context propagation, and remote integration.

### Quick Start

```typescript
import { appLogger } from '@/utils/logger';

// Simple logging
appLogger.infoSync('User logged in');
appLogger.errorSync('API request failed', error);

// Context-aware logging
appLogger.setContext({ userId: 'user123', component: 'Auth' });
appLogger.infoSync('Processing user request');
appLogger.clearContext();

// Request-scoped logging
appLogger.pushContext({ requestId: 'req-abc' });
try {
  await apiCall();
  appLogger.infoSync('API success', { duration: 125 });
} finally {
  appLogger.popContext();
}
```

### Log Levels

| Level   | Usage                                 | Prod Logged |
| ------- | ------------------------------------- | ----------- |
| `ERROR` | Exceptions, failures, critical issues | ✓ Always    |
| `WARN`  | Recoverable issues, deprecations      | ✓ Always    |
| `INFO`  | Important events, state changes       | ✓ Always    |
| `DEBUG` | Diagnostic info, flow tracking        | Dev only    |
| `TRACE` | Verbose flow, parameter values        | Dev only    |

### Output Formats

- **Development**: Pretty-printed with emojis, component names, context
- **Production**: Structured JSON for aggregation and remote logging
- **File**: AsyncStorage-backed rotation (5MB per file, 10 max)
- **Remote**: Sentry integration for critical errors

### Structured Log Values

Every log entry includes:

- `timestamp` — ISO 8601 timestamp
- `level` — ERROR, WARN, INFO, DEBUG, TRACE
- `app` — 'teachlink_mobile'
- `version` — App version (from package.json)
- `environment` — 'development' or 'production'
- `message` — Log message
- `userId` — Current authenticated user (if set)
- `requestId` — Request/transaction identifier (if set)
- `component` — Component or service name (if set)
- `meta` — Additional metadata/context

### Advanced Usage

```typescript
import { appLogger, LogLevel } from '@/utils/logger';
import { setLogContext, getLogContext, pushLogContext, popLogContext } from '@/config/logging';

// Set log level (default: DEBUG in dev, INFO in prod)
appLogger.setMinLevel(LogLevel.WARN);

// Context management
appLogger.setContext({ userId: 'u1' });
const ctx = appLogger.getContext(); // { userId: 'u1' }
appLogger.clearContext();

// Request scoping
appLogger.pushContext({ requestId: 'req1' });
// Logs include requestId
appLogger.popContext(); // Back to parent context

// API-specific logging
await appLogger.logApiRequest('/users', 'GET', { userId: 'u1' });
await appLogger.logApiResponse('/users', 200, 45, { count: 5 });
await appLogger.logApiError('/users', error, 500);

// Async methods (file persistence)
await appLogger.info('Important event');
await appLogger.error('Critical failure', error, { retry: 2 });

// Sync methods (no file I/O, fast path)
appLogger.infoSync('Quick log');
appLogger.errorSync('Error', error);
```

### Retrieve Logs (Development)

```typescript
import { retrieveLogFiles, clearLogFiles } from '@/config/logging';

// Get all stored logs
const logs = await retrieveLogFiles();
logs.forEach((log) => console.log(log));

// Clear log storage
await clearLogFiles();
```

Copy `.env.example` to `.env` and set the following:

| Variable                                | Required | Description                                        |
| --------------------------------------- | -------- | -------------------------------------------------- |
| `EXPO_PUBLIC_API_BASE_URL`              | Yes      | Base URL for the REST API (`https://...`)          |
| `EXPO_PUBLIC_SOCKET_URL`                | Yes      | WebSocket server URL (`wss://...`)                 |
| `EXPO_PUBLIC_APP_ENV`                   | No       | Runtime environment (`development` / `production`) |
| `EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS` | No       | Enable push notifications (`true` / `false`)       |
| `EXPO_PUBLIC_STORYBOOK`                 | No       | Enable Storybook mode (`true` / `false`)           |


The app validates `EXPO_PUBLIC_API_BASE_URL` and `EXPO_PUBLIC_SOCKET_URL` at startup and will refuse to launch with invalid or missing values.

For EAS builds, secrets are configured per build profile in `eas.json` rather than `.env`.

## Common Issues

**Metro bundler cache errors**

```bash
npx expo start --clear
```

**`Cannot find module` or module resolution errors after installing a package**

```bash
npx expo start --clear
# If that doesn't help:
rm -rf node_modules && npm install
```

**iOS Simulator not detected**
Make sure Xcode command-line tools are installed:

```bash
xcode-select --install
```

**Android Emulator not detected**
Ensure `ANDROID_HOME` is set and the emulator is running before starting Expo:

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/tools
```

**App crashes on startup with "Environment Configuration Error"**
Your `.env` is missing required variables or contains malformed URLs. Check that:

- `EXPO_PUBLIC_API_BASE_URL` is a valid `https://` URL
- `EXPO_PUBLIC_SOCKET_URL` is a valid `ws://` or `wss://` URL

**EAS build fails — missing credentials**
Run `eas credentials` to set up or repair iOS/Android signing credentials.

## Features

- Cross-platform (iOS & Android)
- Share and browse knowledge content
- Live chat and push notifications
- Creator monetisation
- Dark/light mode
- **Isolated Component Development** via Storybook

## Resources

- [Figma Design](https://www.figma.com/design/0RX6a19AbtemWmq8GLX1Y4/TeachLink-Project?node-id=0-1&t=gfrhW9c55Pxnfrl1-0)
- [Expo Documentation](https://docs.expo.dev)
- [EAS Build](https://docs.expo.dev/build/introduction/)

## Build Profiles

The project defines three EAS build profiles in `eas.json`:

| Profile | Description | Usage |
|---|---|---|
| **development** | Fast internal build for debugging, includes development client and runs on the `development` channel. | `eas build --profile development` |
| **preview** | Internal preview build, generates an APK for Android, runs on the `preview` channel. | `eas build --profile preview` |
| **production** | Production‑ready build with auto‑incremented version numbers for iOS and Android, publishes to the `production` channel. | `eas build --profile production` |

These profiles can also be used when submitting:

- `eas submit --profile production` will use the production credentials defined in the `submit.production` section of `eas.json`.

Refer to the official EAS docs for more details.


---

## 🚀 Deployment

TeachLink Mobile uses **Expo Application Services (EAS)** for building and submitting to the app stores.

> 📖 For the full deployment guide, see **[DEPLOY.md](./DEPLOY.md)**

### Quick Start

```bash
# Install EAS CLI
npm install -g eas-cli

# Authenticate
eas login

# Deploy to Android
npm run deploy:android

# Deploy to iOS
npm run deploy:ios

# Deploy to both stores
npm run deploy:both

# Create a preview build for testing
npm run deploy:preview
```

### Environment Setup

Create a `.env` file in the project root:

```env
EXPO_PUBLIC_API_BASE_URL=https://api.teachlink.com
EXPO_PUBLIC_SOCKET_URL=wss://api.teachlink.com
EXPO_PUBLIC_APP_ENV=production
EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS=true
```

> ⚠️ Never commit your `.env` file. It is listed in `.gitignore`.

See [DEPLOY.md](./DEPLOY.md) for platform-specific setup (Google Play & App Store), build profiles, troubleshooting, and security notes.