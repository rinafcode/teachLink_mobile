const fs = require('fs');
const path = require('path');

const { withInfoPlist, withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');

/**
 * Expo config plugin: SSL public key pinning for iOS and Android.
 *
 * iOS  — Injects NSPinnedDomains into Info.plist (iOS 14+, App Transport Security).
 * Android — Writes res/xml/network_security_config.xml with a <pin-set> and
 *           sets android:networkSecurityConfig on the <application> element.
 *
 * Pinning is only applied when options.enabled is true (default: when
 * EXPO_PUBLIC_APP_ENV === 'production'). Debug builds retain full proxy
 * access via Android's <debug-overrides> and iOS's conditional skipping.
 *
 * Options (all required for production):
 *   domain      — hostname that matches EXPO_PUBLIC_API_BASE_URL
 *   primaryPin  — SHA-256 SPKI base64 hash of the primary leaf cert
 *   backupPin   — SHA-256 SPKI base64 hash of the pre-rotated backup key
 *   enabled     — override the production-env default (true/false)
 *
 * See docs/security/pin-rotation.md for the key rotation runbook.
 */
module.exports = function withSSLPinning(config, options = {}) {
  const isProd = process.env.EXPO_PUBLIC_APP_ENV === 'production';
  const enabled = options.enabled !== undefined ? options.enabled : isProd;
  const domain = options.domain || 'api.teachlink.com';
  const primaryPin = options.primaryPin || 'REPLACE_WITH_PRIMARY_SPKI_SHA256_BASE64==';
  const backupPin = options.backupPin || 'REPLACE_WITH_BACKUP_SPKI_SHA256_BASE64==';

  config = withIOSPinning(config, { enabled, domain, primaryPin, backupPin });
  config = withAndroidPinning(config, { enabled, domain, primaryPin, backupPin });
  return config;
};

// ── iOS: NSPinnedDomains in Info.plist ────────────────────────────────────────

function withIOSPinning(config, { enabled, domain, primaryPin, backupPin }) {
  return withInfoPlist(config, plistConfig => {
    if (!enabled) {
      return plistConfig;
    }

    plistConfig.modResults.NSAppTransportSecurity = {
      ...(plistConfig.modResults.NSAppTransportSecurity || {}),
      NSPinnedDomains: {
        [domain]: {
          // Pin the leaf certificate SPKI — more stable than pinning the full cert
          NSPinnedLeafIdentities: [
            { 'SPKI-SHA256-BASE64': primaryPin },
            { 'SPKI-SHA256-BASE64': backupPin },
          ],
          NSIncludesSubdomains: false,
        },
      },
    };

    return plistConfig;
  });
}

// ── Android: network_security_config.xml + AndroidManifest reference ──────────

function withAndroidPinning(config, { enabled, domain, primaryPin, backupPin }) {
  // Step 1 — write res/xml/network_security_config.xml
  config = withDangerousMod(config, [
    'android',
    async modConfig => {
      const resXmlDir = path.join(
        modConfig.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'res',
        'xml'
      );
      fs.mkdirSync(resXmlDir, { recursive: true });

      const xml = enabled
        ? `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <!--
        Production: enforce public key pinning on the API domain.
        Update the expiration date and pin hashes when rotating keys.
        See docs/security/pin-rotation.md.
    -->
    <domain-config cleartextTrafficPermitted="false">
        <domain includeSubdomains="false">${domain}</domain>
        <pin-set expiration="2027-12-31">
            <pin digest="SHA-256">${primaryPin}</pin>
            <pin digest="SHA-256">${backupPin}</pin>
        </pin-set>
    </domain-config>

    <!--
        Debug overrides: applied only when android:debuggable="true" (debug builds).
        Allows proxy tools (Burp Suite, Charles) to intercept traffic during dev/QA
        without installing a custom CA on device trust stores.
    -->
    <debug-overrides>
        <trust-anchors>
            <certificates src="system"/>
            <certificates src="user"/>
        </trust-anchors>
    </debug-overrides>
</network-security-config>`
        : `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <!-- Pinning is disabled for this build profile (non-production). -->
    <base-config cleartextTrafficPermitted="false">
        <trust-anchors>
            <certificates src="system"/>
        </trust-anchors>
    </base-config>
</network-security-config>`;

      fs.writeFileSync(
        path.join(resXmlDir, 'network_security_config.xml'),
        xml
      );

      return modConfig;
    },
  ]);

  // Step 2 — add android:networkSecurityConfig to <application> in AndroidManifest.xml
  config = withAndroidManifest(config, manifestConfig => {
    const app = manifestConfig.modResults.manifest.application?.[0];
    if (app) {
      app.$['android:networkSecurityConfig'] = '@xml/network_security_config';
    }
    return manifestConfig;
  });

  return config;
}
