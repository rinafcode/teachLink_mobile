import { ExpoConfig, ConfigContext } from '@expo/config';

const packageJson = require('./package.json');

export default ({ config }: ConfigContext): ExpoConfig => {
  return {
    ...config,
    userInterfaceStyle: 'automatic',
    version: packageJson.version,
    ios: {
      ...config.ios,
      buildNumber: String(packageJson.version.split('.')[2]),
    },
    android: {
      ...config.android,
      versionCode: Number(packageJson.version.replace(/\./g, '')),
    },
  };
};
