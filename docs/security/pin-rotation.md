# SSL Certificate Pin Rotation Runbook

Certificate pinning is enforced in production builds for `api.teachlink.com`.
This document describes how to rotate keys with zero downtime and no forced app updates.

---

## How pinning works in this project

| Layer | Mechanism |
|---|---|
| iOS 14+ | `NSPinnedDomains` in `Info.plist` (SPKI SHA-256) |
| Android 7+ | `res/xml/network_security_config.xml` `<pin-set>` |
| JS detection | `isCertPinFailure()` in `src/services/api/axios.config.ts` |
| Config source | `src/config/security.ts` + `app.json` plugin options |

The backup pin is the key — it must always be pre-generated and deployed **before** the primary cert expires. This is what guarantees zero downtime.

---

## Prerequisites

- Access to the EAS build pipeline
- Authority to submit builds to the App Store / Play Store
- The current and next TLS certificate (or at minimum the next keypair/CSR)
- Sentry access to monitor `security.event: ssl_pin_failure` after rollout

---

## Step 1 — Generate the next keypair (do this now, not at expiry time)

```bash
# Generate a new RSA 2048 private key and CSR
openssl genrsa -out next-key.pem 2048
openssl req -new -key next-key.pem -out next-cert.csr \
  -subj "/CN=api.teachlink.com/O=TeachLink/C=US"

# Compute the SPKI SHA-256 fingerprint for the new key
openssl pkey -in next-key.pem -pubout -outform der \
  | openssl dgst -sha256 -binary \
  | base64
# → copy this value; it becomes the new primaryPin after rotation
```

Submit `next-cert.csr` to your CA. The CA returns `next-cert.pem`.

---

## Step 2 — Compute the fingerprint of the current active cert (verify your baseline)

```bash
# From the live server
openssl s_client -connect api.teachlink.com:443 </dev/null 2>/dev/null \
  | openssl x509 -pubkey -noout \
  | openssl pkey -pubin -outform der \
  | openssl dgst -sha256 -binary \
  | base64

# Or from a cert file
openssl x509 -in current-cert.pem -pubkey -noout \
  | openssl pkey -pubin -outform der \
  | openssl dgst -sha256 -binary \
  | base64
```

This must match `primaryPin` in `src/config/security.ts`. If it doesn't, investigate before proceeding.

---

## Step 3 — Deploy the new app build with the backup pin set to the NEXT cert

Update `src/config/security.ts`:

```typescript
export const SSL_PINNING = {
  domain: 'api.teachlink.com',
  primaryPin: '<CURRENT_CERT_SPKI_SHA256>',   // unchanged
  backupPin:  '<NEXT_CERT_SPKI_SHA256>',       // ← update this
  bypassEnabled: process.env.EXPO_PUBLIC_APP_ENV !== 'production',
} as const;
```

Update `app.json` plugin options to match:

```json
{
  "domain": "api.teachlink.com",
  "primaryPin": "<CURRENT_CERT_SPKI_SHA256>",
  "backupPin":  "<NEXT_CERT_SPKI_SHA256>"
}
```

Also update the `expiration` date in the Android `<pin-set>` inside `plugins/withSSLPinning.js` to be at least 30 days beyond the new cert's expiry.

Build and release via EAS:

```bash
eas build --platform all --profile production
eas submit --platform all
```

Wait for the new build to reach **at least 80% of active users** before proceeding to Step 4. Monitor Sentry for any `ssl_pin_failure` events — these indicate users on old builds being rejected by a rotated cert prematurely.

---

## Step 4 — Rotate the certificate on the server

Deploy `next-cert.pem` to the API server. At this point:
- Users on the **new** build: accept both current and next cert (backup pin matches)
- Users on the **old** build: only pinned to current cert, which is still active → no disruption

---

## Step 5 — Deploy the final build removing the old primary pin

Once adoption of Step 3's build is sufficient (target: ≥95% of DAU), update pins again:

```typescript
export const SSL_PINNING = {
  primaryPin: '<NEXT_CERT_SPKI_SHA256>',       // promoted from backup
  backupPin:  '<FUTURE_CERT_SPKI_SHA256>',     // generate another keypair now
  ...
} as const;
```

Build and release. The old cert can now be decommissioned.

---

## Emergency rollback

If a pin failure wave appears in Sentry (event `ssl_pin_failure`):

1. **Do not rotate the server cert further.**
2. Release an emergency build with `bypassEnabled: true` in `SSL_PINNING` (or remove `NSPinnedDomains` / `network_security_config.xml` pin-set).
3. Investigate — check if intermediate CA or CDN changed unexpectedly.
4. Re-pin once the certificate chain is stable.

---

## Monitoring

- Sentry query: `security.event:ssl_pin_failure`
- Alert threshold: > 5 events / hour → page on-call
- Events include `endpoint` and `method` only — no tokens, headers, or response bodies are captured

---

## Key storage

- Private keys are **never** committed to this repository.
- Store `next-key.pem` in the team password manager under `TeachLink / TLS Keys`.
- Fingerprints (public, non-secret) live in `src/config/security.ts` and `app.json`.
