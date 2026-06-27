import {
  CRITICAL_SPLASH_CSS,
  SPLASH_BACKGROUND_DARK,
  SPLASH_BACKGROUND_LIGHT,
} from '../../styles/splashCriticalCss';

describe('critical splash CSS', () => {
  it('inlines the first-paint splash colors for light and dark themes', () => {
    expect(CRITICAL_SPLASH_CSS).toContain(`background: ${SPLASH_BACKGROUND_LIGHT}`);
    expect(CRITICAL_SPLASH_CSS).toContain(`background: ${SPLASH_BACKGROUND_DARK}`);
    expect(CRITICAL_SPLASH_CSS).toContain('@media (prefers-color-scheme: dark)');
  });

  it('stabilizes the splash viewport before external styles load', () => {
    expect(CRITICAL_SPLASH_CSS).toContain('min-height: 100%');
    expect(CRITICAL_SPLASH_CSS).toContain('min-height: 100vh');
    expect(CRITICAL_SPLASH_CSS).toContain('margin: 0');
    expect(CRITICAL_SPLASH_CSS).toContain('display: flex');
  });

  it('does not depend on external stylesheet or image requests', () => {
    expect(CRITICAL_SPLASH_CSS).not.toMatch(/@import|url\(/);
  });
});
