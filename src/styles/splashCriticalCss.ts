export const SPLASH_BACKGROUND_LIGHT = '#E6F4FE';
export const SPLASH_BACKGROUND_DARK = '#0F172A';

export const CRITICAL_SPLASH_CSS = `
html,
body,
#root {
  min-height: 100%;
  margin: 0;
  background: ${SPLASH_BACKGROUND_LIGHT};
}

body {
  overflow: hidden;
}

#root {
  display: flex;
  min-height: 100vh;
}

@media (prefers-color-scheme: dark) {
  html,
  body,
  #root {
    background: ${SPLASH_BACKGROUND_DARK};
  }
}
`;
