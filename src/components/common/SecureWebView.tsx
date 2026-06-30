/**
 * SecureWebView wraps the native WebView implementation and enforces
 * a restrictive default Content Security Policy for embedded content.
 *
 * Documented usage:
 * - No current app screens import WebView directly.
 * - SecureWebView is the safe wrapper to use for any future screen that
 *   loads external or embedded HTML content.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView, WebViewProps } from 'react-native-webview';

import { CSP_TRUST_TIERS, TrustTier } from '../../config/security';

interface SecureWebViewProps extends Omit<WebViewProps, 'source'> {
  source: { html: string } | { uri: string };
  trustLevel?: TrustTier;
  platformDomain?: string;
}

export const SecureWebView = ({
  source,
  trustLevel = 'restricted',
  platformDomain = 'platform.com',
  style,
  originWhitelist,
  javaScriptEnabled,
  domStorageEnabled,
  allowsInlineMediaPlayback,
  mediaPlaybackRequiresUserAction,
  injectedJavaScriptBeforeContentLoaded,
  startInLoadingState,
  ...props
}: SecureWebViewProps) => {
  const csp = CSP_TRUST_TIERS[trustLevel];
  const finalOriginWhitelist = originWhitelist ?? ['https://*'];
  const injectedJs =
    injectedJavaScriptBeforeContentLoaded ??
    "(function(){var m=document.createElement('meta');m.httpEquiv='Content-Security-Policy';m.content='" +
      csp +
      "';document.head.insertBefore(m,document.head.firstChild);})();true;";

  return (
    <View style={[styles.container, style]}>
      <WebView
        source={source}
        injectedJavaScriptBeforeContentLoaded={injectedJs}
        originWhitelist={finalOriginWhitelist}
        javaScriptEnabled={javaScriptEnabled ?? false}
        domStorageEnabled={domStorageEnabled ?? false}
        allowsInlineMediaPlayback={allowsInlineMediaPlayback ?? false}
        mediaPlaybackRequiresUserAction={mediaPlaybackRequiresUserAction ?? true}
        startInLoadingState={startInLoadingState ?? true}
        {...props}
      />
    </View>
  );
};

const styles = StyleSheet.create({ container: { flex: 1 } });
