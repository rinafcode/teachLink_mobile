import React from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView, WebViewProps } from 'react-native-webview';
import { CSP_TRUST_TIERS, TrustTier } from '../../config/security';

interface SecureWebViewProps extends Omit<WebViewProps, 'source'> {
  source: { html: string } | { uri: string };
  trustLevel?: TrustTier;
  platformDomain?: string;
}

export function SecureWebView({
  source,
  trustLevel = 'restricted',
  platformDomain = 'platform.com',
  style,
  ...props
}: SecureWebViewProps) {
  const csp = CSP_TRUST_TIERS[trustLevel];
  const injectedJs = "(function(){var m=document.createElement('meta');m.httpEquiv='Content-Security-Policy';m.content='" + csp + "';document.head.insertBefore(m,document.head.firstChild);})();true;";
  const originWhitelist = trustLevel === 'restricted' ? undefined : ['https://*.' + platformDomain, 'https://' + platformDomain];

  return (
    <View style={[styles.container, style]}>
      <WebView
        source={source}
        injectedJavaScriptBeforeContentLoaded={injectedJs}
        originWhitelist={originWhitelist}
        javaScriptEnabled={trustLevel !== 'restricted'}
        domStorageEnabled={trustLevel !== 'restricted'}
        allowsInlineMediaPlayback={trustLevel === 'trusted'}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({ container: { flex: 1 } });
