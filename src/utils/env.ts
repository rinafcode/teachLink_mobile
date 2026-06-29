const REQUIRED_VARS = [
  'EXPO_PUBLIC_API_BASE_URL',
  'EXPO_PUBLIC_SOCKET_URL',
  'EXPO_PUBLIC_APP_ENV',
] as const;

export function requireEnvVariables(): void {
  if (__DEV__) {
    for (const key of REQUIRED_VARS) {
      if (!process.env[key]) {
        console.warn(`[env] Missing required environment variable: ${key}`);
      }
    }
  }
}
