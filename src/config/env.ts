export function validateEnvVariables(): ValidationResult {
  const missing: string[] = [];
  const errors: string[] = [];

  for (const variable of REQUIRED_VARIABLES) {
    // Replace dynamic access with direct variable checks
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
  // ... rest of function
  return {
    EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL!,
    EXPO_PUBLIC_SOCKET_URL: process.env.EXPO_PUBLIC_SOCKET_URL!,
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
