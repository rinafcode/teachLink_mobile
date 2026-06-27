import { ValidationResult } from '../utils/validation';

export interface EnvConfig {
  EXPO_PUBLIC_API_BASE_URL: string;
  EXPO_PUBLIC_SOCKET_URL: string;
  EXPO_PUBLIC_APP_ENV?: 'development' | 'production';
  EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS?: 'true' | 'false';
  EXPO_PUBLIC_STORYBOOK?: 'true' | 'false';
}

const REQUIRED_VARIABLES: (keyof EnvConfig)[] = [
  'EXPO_PUBLIC_API_BASE_URL',
  'EXPO_PUBLIC_SOCKET_URL',
];

export function validateEnvVariables(): ValidationResult {
  const missing: string[] = [];
  const errors: string[] = [];

  for (const variable of REQUIRED_VARIABLES) {
    let value: string | undefined;

    if (variable === 'EXPO_PUBLIC_API_BASE_URL') {
      value = process.env.EXPO_PUBLIC_API_BASE_URL;
    } else if (variable === 'EXPO_PUBLIC_SOCKET_URL') {
      value = process.env.EXPO_PUBLIC_SOCKET_URL;
    }

    if (!value || value.trim() === '') {
      missing.push(variable);
      errors.push(
        `Missing required environment variable: ${variable}. ` +
          `Please set ${variable} in your .env file. See .env.example for reference.`
      );
      continue;
    }

    if (variable === 'EXPO_PUBLIC_API_BASE_URL') {
      try {
        const url = new URL(value);
        if (url.protocol !== 'https:') {
          errors.push(
            `Invalid URL for ${variable}: ${value}. ` +
              `EXPO_PUBLIC_API_BASE_URL must use https://.`
          );
        }
      } catch {
        errors.push(
          `Invalid URL for ${variable}: ${value}. ` + `Please provide a valid https:// URL.`
        );
      }
    }

    if (variable === 'EXPO_PUBLIC_SOCKET_URL') {
      if (!value.startsWith('ws://') && !value.startsWith('wss://')) {
        errors.push(
          `Invalid WebSocket URL for ${variable}: ${value}. ` +
            `Please provide a valid ws:// or wss:// URL.`
        );
      }
    }
  }

  if (process.env.EXPO_PUBLIC_APP_ENV) {
    const envValue = process.env.EXPO_PUBLIC_APP_ENV;
    if (envValue !== 'development' && envValue !== 'production') {
      errors.push(
        `Invalid value for EXPO_PUBLIC_APP_ENV: ${envValue}. ` +
          `Allowed values are 'development' or 'production'.`
      );
    }
  }

  if (process.env.EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS) {
    const pushValue = process.env.EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS;
    if (pushValue !== 'true' && pushValue !== 'false') {
      errors.push(
        `Invalid value for EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS: ${pushValue}. ` +
          `Allowed values are 'true' or 'false'.`
      );
    }
  }

  if (process.env.EXPO_PUBLIC_STORYBOOK) {
    const storyValue = process.env.EXPO_PUBLIC_STORYBOOK;
    if (storyValue !== 'true' && storyValue !== 'false') {
      errors.push(
        `Invalid value for EXPO_PUBLIC_STORYBOOK: ${storyValue}. ` +
          `Allowed values are 'true' or 'false'.`
      );
    }
  }

  return {
    valid: missing.length === 0 && errors.length === 0,
    message: errors.length > 0 ? errors.join(' ') : undefined,
  };
}

export function requireEnvVariables(): EnvConfig {
  const validation = validateEnvVariables();

  if (!validation.valid) {
    throw new Error(
      `Environment Configuration Error: ${validation.message ?? 'Invalid .env values.'}`
    );
  }

  return {
    EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL!,
    EXPO_PUBLIC_SOCKET_URL: process.env.EXPO_PUBLIC_SOCKET_URL!,
    EXPO_PUBLIC_APP_ENV:
      process.env.EXPO_PUBLIC_APP_ENV === 'production' ? 'production' : 'development',
    EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS: process.env.EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS,
    EXPO_PUBLIC_STORYBOOK: process.env.EXPO_PUBLIC_STORYBOOK,
  };
}

export function getEnv(variable: keyof EnvConfig): string {
  let value: string | undefined;

  if (variable === 'EXPO_PUBLIC_API_BASE_URL') {
    value = process.env.EXPO_PUBLIC_API_BASE_URL;
  } else if (variable === 'EXPO_PUBLIC_SOCKET_URL') {
    value = process.env.EXPO_PUBLIC_SOCKET_URL;
  }

  if (!value) {
    throw new Error(
      `Environment variable ${variable} is not set. Call requireEnvVariables() at app startup.`
    );
  }
  return value;
}
