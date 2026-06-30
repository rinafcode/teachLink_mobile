# Environment Configuration

This document describes the environment variables used across TeachLink's build profiles and how they control runtime behavior.

## Build Profiles

TeachLink uses three EAS build profiles defined in `eas.json`:

| Profile | Channel | Audience | Sentry |
|---------|---------|----------|--------|
| `development` | development | Local dev machines | Disabled |
| `preview` | preview | Internal QA / staging | Enabled |
| `production` | production | App store releases | Always enabled |

## Environment Variables

### Required

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_API_BASE_URL` | Base URL for the REST API (must be `https://`) |
| `EXPO_PUBLIC_SOCKET_URL` | WebSocket server URL (`ws://` or `wss://`) |

### Optional

| Variable | Values | Default | Description |
|----------|--------|---------|-------------|
| `EXPO_PUBLIC_APP_ENV` | `development`, `production` | unset | Overrides the detected runtime environment label |
| `EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS` | `true`, `false` | unset | Enables or disables push notification registration |
| `EXPO_PUBLIC_SENTRY_ENABLED` | `true`, `false` | unset | Controls Sentry error reporting (see below) |
| `EXPO_PUBLIC_STORYBOOK` | `true`, `false` | unset | Renders the Storybook UI instead of the app |
| `EXPO_PUBLIC_SENTRY_DSN` | DSN string | unset | Sentry project DSN used when Sentry is enabled |

## Sentry Initialization

Sentry is initialized according to the following logic in `src/config/logging.ts`:

```
isSentryEnabled = (EXPO_PUBLIC_SENTRY_ENABLED === 'true') OR (not a dev build)
```

In practice this means:

- **Development builds** (`__DEV__ === true`, no env var set): Sentry is **off**. Exceptions are logged locally only and never sent to Sentry. This is the default for `expo start` and the `development` EAS profile.
- **Staging / preview builds** (`EXPO_PUBLIC_SENTRY_ENABLED=true`): Sentry is **on** even though `__DEV__` may be true. Use this for QA builds distributed via the `preview` EAS channel so the QA team captures real exceptions before a production release.
- **Production builds** (`__DEV__ === false`, env var unset or `true`): Sentry is **always on**. Setting `EXPO_PUBLIC_SENTRY_ENABLED=false` in production is intentionally ignored.

The Sentry `environment` tag is set to `'staging'` for dev builds that opt in and `'production'` for release builds, letting you filter events in the Sentry dashboard.

## Setting Up Local Development

Create a `.env.local` file at the project root (never commit this file):

```
EXPO_PUBLIC_API_BASE_URL=https://api.dev.teachlink.com
EXPO_PUBLIC_SOCKET_URL=wss://ws.dev.teachlink.com
```

To opt in to Sentry during local development (e.g. debugging a crash reporter issue):

```
EXPO_PUBLIC_SENTRY_ENABLED=true
EXPO_PUBLIC_SENTRY_DSN=<your-dev-project-dsn>
```

## CI/CD

The `preview` and `production` EAS profiles set `EXPO_PUBLIC_SENTRY_ENABLED=true` in `eas.json`. Secret variables (`EXPO_PUBLIC_SENTRY_DSN`, API keys) are stored in EAS Secrets and injected at build time - they are never committed to the repository.
