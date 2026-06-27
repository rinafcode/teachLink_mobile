import AsyncStorage from '@react-native-async-storage/async-storage';

import { apiService } from './api';
import { appLogger } from '../utils/logger';

const FEATURE_FLAGS_STORAGE_KEY = 'teachlink_feature_flags';
const FEATURE_FLAG_ANONYMOUS_ID_KEY = 'teachlink_feature_flag_anonymous_id';
const REMOTE_FLAG_ENDPOINT = '/feature-flags';

export interface FeatureFlagDefinition {
  enabled?: boolean;
  percentage?: number;
  includedUsers?: string[];
  excludedUsers?: string[];
  includedRegions?: string[];
  excludedRegions?: string[];
  description?: string;
}

export interface FeatureFlagsConfig {
  version?: string;
  updatedAt?: string;
  flags: Record<string, FeatureFlagDefinition>;
}

export interface FeatureFlagContext {
  userId?: string;
  region?: string;
}

const defaultConfig: FeatureFlagsConfig = {
  flags: {},
};

let cachedConfig: FeatureFlagsConfig = { ...defaultConfig };
let anonymousId: string | null = null;
let initialized = false;
const subscribers = new Set<() => void>();

function normalizeIdentifier(value: string | undefined): string | undefined {
  return value?.trim().toLowerCase();
}

function normalizeRegion(region?: string): string | undefined {
  return region?.trim().toUpperCase();
}

function hashStringToPercentage(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 100;
}

async function getPersistentAnonymousId(): Promise<string> {
  if (anonymousId) {
    return anonymousId;
  }

  const stored = await AsyncStorage.getItem(FEATURE_FLAG_ANONYMOUS_ID_KEY);
  if (stored) {
    anonymousId = stored;
    return stored;
  }

  const generated = `anon-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  await AsyncStorage.setItem(FEATURE_FLAG_ANONYMOUS_ID_KEY, generated);
  anonymousId = generated;
  return generated;
}

async function loadPersistedFlags(): Promise<void> {
  const raw = await AsyncStorage.getItem(FEATURE_FLAGS_STORAGE_KEY);
  if (!raw) {
    return;
  }

  try {
    const parsed = JSON.parse(raw) as FeatureFlagsConfig;
    cachedConfig = {
      ...defaultConfig,
      ...parsed,
      flags: parsed.flags ?? {},
    };
  } catch (error) {
    appLogger.warnSync('Failed to parse persisted feature flags', error as Error);
    cachedConfig = { ...defaultConfig };
  }
}

async function persistFlags(): Promise<void> {
  try {
    await AsyncStorage.setItem(FEATURE_FLAGS_STORAGE_KEY, JSON.stringify(cachedConfig));
  } catch (error) {
    appLogger.warnSync('Failed to persist feature flags', error as Error);
  }
}

function notifySubscribers(): void {
  subscribers.forEach(listener => {
    try {
      listener();
    } catch (error) {
      appLogger.warnSync('Feature flag listener threw an error', error as Error);
    }
  });
}

function evaluateRollout(featureKey: string, percentage: number, identifier: string): boolean {
  const normalizedPercentage = Math.max(0, Math.min(100, percentage));
  if (normalizedPercentage === 0) {
    return false;
  }
  if (normalizedPercentage === 100) {
    return true;
  }

  return hashStringToPercentage(`${featureKey}:${identifier}`) < normalizedPercentage;
}

function evaluateFlagDefinition(
  key: string,
  definition: FeatureFlagDefinition | undefined,
  context: FeatureFlagContext = {}
): boolean {
  if (!definition) {
    return false;
  }

  const userId = normalizeIdentifier(context.userId);
  const region = normalizeRegion(context.region);

  if (userId) {
    if (definition.excludedUsers?.map(normalizeIdentifier).includes(userId)) {
      return false;
    }
    if (definition.includedUsers?.map(normalizeIdentifier).includes(userId)) {
      return true;
    }
  }

  if (region) {
    if (definition.excludedRegions?.map(normalizeRegion).includes(region)) {
      return false;
    }
    if (definition.includedRegions?.map(normalizeRegion).includes(region)) {
      return true;
    }
  }

  if (typeof definition.enabled === 'boolean') {
    return definition.enabled;
  }

  if (typeof definition.percentage === 'number') {
    const identifier = userId ?? anonymousId;
    if (!identifier) {
      return false;
    }
    return evaluateRollout(key, definition.percentage, identifier);
  }

  return false;
}

async function fetchRemoteFlags(): Promise<FeatureFlagsConfig | null> {
  try {
    const response = await apiService.get<FeatureFlagsConfig>(REMOTE_FLAG_ENDPOINT);
    if (!response?.data) {
      return null;
    }
    return response.data;
  } catch (error) {
    appLogger.warnSync('Could not fetch remote feature flags', error as Error, {
      endpoint: REMOTE_FLAG_ENDPOINT,
    });
    return null;
  }
}

export async function initializeFeatureFlags(): Promise<void> {
  if (initialized) {
    return;
  }

  await getPersistentAnonymousId();
  await loadPersistedFlags();
  await refreshFeatureFlags();
  initialized = true;
}

export async function refreshFeatureFlags(): Promise<void> {
  const remoteConfig = await fetchRemoteFlags();
  if (!remoteConfig) {
    return;
  }

  cachedConfig = {
    ...defaultConfig,
    ...remoteConfig,
    flags: remoteConfig.flags ?? {},
  };
  await persistFlags();
  notifySubscribers();
}

export function isFeatureEnabled(featureKey: string, context: FeatureFlagContext = {}): boolean {
  const definition = cachedConfig.flags[featureKey];
  return evaluateFlagDefinition(featureKey, definition, context);
}

export function getFeatureFlagConfig(): FeatureFlagsConfig {
  return cachedConfig;
}

export function updateFeatureFlags(config: FeatureFlagsConfig): void {
  cachedConfig = {
    ...defaultConfig,
    ...config,
    flags: config.flags ?? {},
  };
  void persistFlags();
  notifySubscribers();
}

export function subscribeFeatureFlagUpdates(listener: () => void): () => void {
  subscribers.add(listener);
  return () => subscribers.delete(listener);
}

export async function resetFeatureFlags(): Promise<void> {
  cachedConfig = { ...defaultConfig };
  anonymousId = null;
  initialized = false;
  subscribers.clear();
  await AsyncStorage.removeItem(FEATURE_FLAGS_STORAGE_KEY);
  await AsyncStorage.removeItem(FEATURE_FLAG_ANONYMOUS_ID_KEY);
}
