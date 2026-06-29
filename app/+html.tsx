import { ScrollViewStyleReset } from 'expo-router/html';
import React from 'react';

import { CRITICAL_SPLASH_CSS } from '../src/styles/splashCriticalCss';

type RootHtmlProps = {
  children: React.ReactNode;
};

const RootHtml = ({ children }: RootHtmlProps) => (
  <html lang="en">
    <head>
      <ScrollViewStyleReset />
      <style dangerouslySetInnerHTML={{ __html: CRITICAL_SPLASH_CSS }} />
    </head>
    <body>{children}</body>
  </html>
);

export default RootHtml;
