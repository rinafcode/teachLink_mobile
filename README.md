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
git clone https://github.com/rinafcode/teachLink_mobile.git
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

## Running Tests

```bash
npm test                       # Run all tests once
npm run test:watch             # Watch mode — re-runs on file changes
npm run test:coverage          # Run with coverage report

# Run a single test file
npx jest src/__tests__/path/to/file.test.ts
```

## Environment Variables

Copy `.env.example` to `.env` and set the following:

| Variable | Required | Description |
|---|---|---|
| `EXPO_PUBLIC_API_BASE_URL` | Yes | Base URL for the REST API (`https://...`) |
| `EXPO_PUBLIC_SOCKET_URL` | Yes | WebSocket server URL (`wss://...`) |
| `EXPO_PUBLIC_APP_ENV` | No | Runtime environment (`development` / `production`) |
| `EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS` | No | Enable push notifications (`true` / `false`) |

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

## Resources

- [Figma Design](https://www.figma.com/design/0RX6a19AbtemWmq8GLX1Y4/TeachLink-Project?node-id=0-1&t=gfrhW9c55Pxnfrl1-0)
- [Expo Documentation](https://docs.expo.dev)
- [EAS Build](https://docs.expo.dev/build/introduction/)
