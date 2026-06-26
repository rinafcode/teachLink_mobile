import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..', '..');

describe('ProGuard / R8 Android build configuration (#239)', () => {
  it('includes keep rules for React Native, Expo, Axios, and native modules', () => {
    const rulesPath = path.join(ROOT, 'proguard-rules.pro');
    expect(fs.existsSync(rulesPath)).toBe(true);

    const rules = fs.readFileSync(rulesPath, 'utf8');
    expect(rules).toMatch(/com\.facebook\.react/);
    expect(rules).toMatch(/expo\.modules/);
    expect(rules).toMatch(/okhttp3/);
    expect(rules).toMatch(/Zustand/);
    expect(rules).toMatch(/Axios/);
  });

  it('configures expo-build-properties with R8 minify and resource shrinking', () => {
    const appJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
    const plugins = appJson.expo.plugins as (string | [string, Record<string, unknown>])[];

    const buildProperties = plugins.find(
      plugin => Array.isArray(plugin) && plugin[0] === 'expo-build-properties'
    );
    expect(buildProperties).toBeDefined();

    const androidConfig = (buildProperties as [string, { android: Record<string, boolean> }])[1]
      .android;
    expect(androidConfig.enableMinifyInReleaseBuilds).toBe(true);
    expect(androidConfig.enableShrinkResourcesInReleaseBuilds).toBe(true);

    const hasProguardPlugin = plugins.some(plugin => plugin === './plugins/withProguard.js');
    expect(hasProguardPlugin).toBe(true);
  });

  it('sets production optimization env in eas.json', () => {
    const easJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'eas.json'), 'utf8'));

    expect(easJson.build.production.env.NODE_ENV).toBe('production');
    expect(easJson.build.preview.env.NODE_ENV).toBe('production');
    expect(easJson.build.preview.android.buildType).toBe('apk');
  });

  it('exports a config plugin that injects proguard rules', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const withProguard = require('../../plugins/withProguard');
    expect(typeof withProguard).toBe('function');
    expect(withProguard.toString()).toContain('proguard-rules.pro');
  });
});
