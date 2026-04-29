export interface EnvConfig {
  EXPO_PUBLIC_API_BASE_URL: string;
  EXPO_PUBLIC_SOCKET_URL: string;
}

export interface ValidationResult {
  valid: boolean;
  missing: string[];
  errors: string[];
}

const REQUIRED_VARIABLES: (keyof EnvConfig)[] = [
  'EXPO_PUBLIC_API_BASE_URL',
  'EXPO_PUBLIC_SOCKET_URL',
];

export function validateEnvVariables(): ValidationResult {
  const missing: string[] = [];
  const errors: string[] = [];

  for (const variable of REQUIRED_VARIABLES) {
    const value = process.env[variable];

    if (!value || value.trim() === '') {
      missing.push(variable);
      errors.push(
        `Missing required environment variable: ${variable}. ` +
          `Please set ${variable} in your .env file. ` +
          `See .env.example for reference.`
      );
    } else if (variable === 'EXPO_PUBLIC_API_BASE_URL') {
      try {
        new URL(value);
      } catch {
        errors.push(
          `Invalid URL for ${variable}: ${value}. ` + `Please provide a valid HTTP/HTTPS URL.`
        );
      }
    } else if (variable === 'EXPO_PUBLIC_SOCKET_URL') {
      if (!value.startsWith('ws://') && !value.startsWith('wss://')) {
        errors.push(
          `Invalid WebSocket URL for ${variable}: ${value}. ` +
            `Please provide a valid ws:// or wss:// URL.`
        );
      }
    }
  }

  return {
    valid: missing.length === 0 && errors.length === 0,
    missing,
    errors,
  };
}

export function requireEnvVariables(): EnvConfig {
  const result = validateEnvVariables();

  if (!result.valid) {
    const errorMessage = [
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '❌ Environment Configuration Error',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      ...result.errors,
      '',
      'App cannot start without these required variables.',
      'Please fix your .env file and restart the application.',
      '',
      'For reference, copy .env.example to .env and fill in the values.',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
    ].join('\n');

    throw new Error(errorMessage);
  }

  return {
    EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL!,
    EXPO_PUBLIC_SOCKET_URL: process.env.EXPO_PUBLIC_SOCKET_URL!,
  };
}

export function getEnv(variable: keyof EnvConfig): string {
  const value = process.env[variable];
  if (!value) {
    throw new Error(
      `Environment variable ${variable} is not set. Call requireEnvVariables() at app startup.`
    );
  }
  return value;
}
