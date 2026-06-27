import { Platform } from 'react-native';

import { apiService } from './api';
import { appLogger } from '../utils/logger';

const FLAGS_ENDPOINT = '/api/config/flags';

export type DeviceType = 'ios' | 'android' | 'unknown';

export interface FlagDefinition {
  enabled?: boolean;
  percentage?: number;
  includedUserIds?: string[];
  excludedUserIds?: string[];
  includedDeviceTypes?: DeviceType[];
  excludedDeviceTypes?: DeviceType[];
  minAppVersion?: string;
  maxAppVersion?: string;
  description?: string;
}

export interface FlagsResponse {
  version: string;
  updatedAt: string;
  flags: Record<string, FlagDefinition>;
}

export interface EvaluationContext {
  userId?: string;
  deviceType?: DeviceType;
  appVersion?: string;
}

function normalizeDeviceType(raw?: string): DeviceType {
  if (raw === 'ios' || raw === 'android') return raw;
  return 'unknown';
}

function getPlatformDeviceType(): DeviceType {
  return normalizeDeviceType(Platform.OS);
}

function semverCompare(a: string, b: string): number {
  const aParts = a.split('.').map(Number);
  const bParts = b.split('.').map(Number);
  for (let i = 0; i < Math.max(aParts.length, bParts.length); i += 1) {
    const aVal = aParts[i] || 0;
    const bVal = bParts[i] || 0;
    if (aVal > bVal) return 1;
    if (aVal < bVal) return -1;
  }
  return 0;
}

function hashPercentage(key: string, identifier: string): number {
  let hash = 0;
  const input = `${key}:${identifier}`;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 100;
}

/**
 * Evaluates a single flag definition against the given context.
 * Pure function — does not depend on any internal state.
 *
 * Evaluation order (first match wins):
 * 1. User exclusion list -> false
 * 2. User inclusion list -> true
 * 3. Device type exclusion -> false
 * 4. Device type inclusion -> true
 * 5. App version range check -> false if out of range
 * 6. `enabled` boolean
 * 7. Percentage rollout (consistent hash-based)
 * 8. false (default)
 */
export function evaluateFlag(
  key: string,
  definition: FlagDefinition | undefined,
  context: EvaluationContext
): boolean {
  if (!definition) return false;

  const { userId, deviceType, appVersion } = context;

  if (userId) {
    const normalizedId = userId.trim().toLowerCase();
    if (definition.excludedUserIds?.map(id => id.trim().toLowerCase()).includes(normalizedId)) {
      return false;
    }
    if (definition.includedUserIds?.map(id => id.trim().toLowerCase()).includes(normalizedId)) {
      return true;
    }
  }

  if (deviceType && deviceType !== 'unknown') {
    if (definition.excludedDeviceTypes?.includes(deviceType)) {
      return false;
    }
    if (definition.includedDeviceTypes?.includes(deviceType)) {
      return true;
    }
  }

  if (appVersion) {
    if (definition.minAppVersion && semverCompare(appVersion, definition.minAppVersion) < 0) {
      return false;
    }
    if (definition.maxAppVersion && semverCompare(appVersion, definition.maxAppVersion) > 0) {
      return false;
    }
  }

  if (typeof definition.enabled === 'boolean') {
    return definition.enabled;
  }

  if (typeof definition.percentage === 'number') {
    const identifier = userId || 'anonymous';
    return hashPercentage(key, identifier) < definition.percentage;
  }

  return false;
}

export async function fetchRemoteFlags(): Promise<FlagsResponse | null> {
  try {
    const response = await apiService.get<FlagsResponse>(FLAGS_ENDPOINT);
    if (!response || !response.flags || typeof response.flags !== 'object') {
      appLogger.warnSync('Remote flags response missing .flags map');
      return null;
    }

    return {
      version: response.version || '0.0.0',
      updatedAt: response.updatedAt || '',
      flags: response.flags,
    };
  } catch (error) {
    appLogger.warnSync(
      'Failed to fetch remote feature flags',
      error instanceof Error ? error : new Error(String(error)),
      { endpoint: FLAGS_ENDPOINT }
    );
    return null;
  }
}

let platformAppVersion: string | null = null;

export function getPlatformContext(): Pick<EvaluationContext, 'deviceType' | 'appVersion'> {
  if (platformAppVersion === null) {
    try {
      platformAppVersion = require('expo-constants').default?.expoConfig?.version || '0.0.0';
    } catch {
      platformAppVersion = '0.0.0';
    }
  }

  return {
    deviceType: getPlatformDeviceType(),
    appVersion: platformAppVersion,
  };
}

/**
 * Baked-in fallback flags shipped with the app binary.
 * Used when no remote config is available (first launch, offline).
 */
export const DEFAULT_FLAGS: Record<string, FlagDefinition> = {};
