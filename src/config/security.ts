export const NOTIFICATION_SCREEN_ALLOWLIST = new Set([
  'Home',
  'Courses',
  'CourseDetail',
  'Messages',
  'Chat',
  'Learning',
  'Community',
  'CommunityPost',
  'Achievements',
  'AchievementDetail',
] as const);

// ── SSL Certificate Pinning ───────────────────────────────────────────────────
//
// SHA-256 SPKI fingerprints for the production API domain.
//
// Generate for a live certificate:
//   openssl s_client -connect api.teachlink.com:443 </dev/null \
//     | openssl x509 -pubkey -noout \
//     | openssl pkey -pubin -outform der \
//     | openssl dgst -sha256 -binary \
//     | base64
//
// Or from a local cert file:
//   openssl x509 -in cert.pem -pubkey -noout \
//     | openssl pkey -pubin -outform der \
//     | openssl dgst -sha256 -binary \
//     | base64
//
// IMPORTANT: Replace both placeholder values before the first production build.
// See docs/security/pin-rotation.md for the zero-downtime rotation runbook.
export const SSL_PINNING = {
  // Hostname that must match EXPO_PUBLIC_API_BASE_URL
  domain: 'api.teachlink.com',

  // Primary public key pin — leaf certificate of the active TLS cert
  primaryPin: 'REPLACE_WITH_PRIMARY_SPKI_SHA256_BASE64==',

  // Backup pin — pre-generated key for zero-downtime rotation.
  // Generate the next keypair and upload the CSR to the CA BEFORE rotating.
  backupPin: 'REPLACE_WITH_BACKUP_SPKI_SHA256_BASE64==',

  // Pinning is skipped in non-production builds so that developers can use
  // proxy tools (Burp Suite, Charles) without modifying device trust stores.
  // Set EXPO_PUBLIC_APP_ENV=production in EAS production build profiles.
  bypassEnabled: process.env.EXPO_PUBLIC_APP_ENV !== 'production',
} as const;
