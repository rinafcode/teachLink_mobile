# Security

## Sentry event tunnel

The Sentry DSN is a public constant in the JavaScript bundle. Anyone who
reverse-engineers the APK/IPA can read it and flood the Sentry project with
fake events, consuming quota.

To avoid exposing the DSN as the only ingestion path, the app can send events
through a backend **tunnel** instead of directly to Sentry.

### App configuration

Set the tunnel URL via environment variable:

```
EXPO_PUBLIC_SENTRY_TUNNEL_URL=https://api.teachlink.app/api/sentry-tunnel
```

When set, `Sentry.init` (in `src/config/logging.ts`) routes all events through
that endpoint. When unset, events fall back to direct DSN delivery.

### Backend tunnel endpoint

Implement `POST /api/sentry-tunnel` on the backend to:

1. Accept the Sentry envelope body from the app.
2. Forward it to the real Sentry ingest URL derived from the (server-held) DSN.
3. Apply rate limiting per IP/client so abuse can't exhaust project quota.

This keeps the raw DSN on the server and lets the backend throttle abusive
clients before events reach Sentry.

## Reporting a vulnerability

Please report security issues privately to the maintainers rather than opening
a public issue.
