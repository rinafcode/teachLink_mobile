import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { createJSONStorage, type StateStorage } from 'zustand/middleware';

import { sentryContextService } from '../services/sentryContext';
import { appLogger } from '../utils/logger';

export interface VersionedEnvelope<T> {
  version: number;
  data: T;
}

export const asyncStorageJSONStorage = createJSONStorage(() => AsyncStorage);

export const secureStorageAdapter: StateStorage = {
  getItem: async (name: string) => {
    const value = await SecureStore.getItemAsync(name);
    return value ?? null;
  },
  setItem: async (name: string, value: string) => {
    await SecureStore.setItemAsync(name, value);
  },
  removeItem: async (name: string) => {
    await SecureStore.deleteItemAsync(name);
  },
};

export const secureStorageJSONStorage = createJSONStorage(() => secureStorageAdapter);

type HydrationReset = () => void;

let hydrationResetToastPending = false;
let hydrationResetToastShown = false;
const hydrationResetToastListeners = new Set<() => void>();

export function subscribeToHydrationResetToast(listener: () => void): () => void {
  hydrationResetToastListeners.add(listener);
  return () => {
    hydrationResetToastListeners.delete(listener);
  };
}

export function consumeHydrationResetToast(): boolean {
  if (!hydrationResetToastPending || hydrationResetToastShown) {
    return false;
  }

  hydrationResetToastPending = false;
  hydrationResetToastShown = true;
  return true;
}

export function resetHydrationRecoveryForTests(): void {
  hydrationResetToastPending = false;
  hydrationResetToastShown = false;
  hydrationResetToastListeners.clear();
}

function notifyHydrationResetToast(): void {
  if (hydrationResetToastShown || hydrationResetToastPending) {
    return;
  }

  hydrationResetToastPending = true;
  hydrationResetToastListeners.forEach(listener => listener());
}

export function createHydrationErrorRecovery(storeName: string, resetStore: HydrationReset) {
  return () => (_state: unknown, error: unknown) => {
    if (!error) {
      return;
    }

    resetStore();
    appLogger.warn('Zustand persisted store hydration failed; reset to defaults', {
      storeName,
      error: error instanceof Error ? error.message : String(error),
    });
    sentryContextService.captureMessage('Zustand persisted store hydration failed', 'warning', {
      tags: {
        storeName,
        'store.hydration': 'failed',
      },
      extra: {
        storeName,
        error: error instanceof Error ? error.message : String(error),
      },
      fingerprint: ['zustand-hydration-failure', storeName],
    });
    notifyHydrationResetToast();
  };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function unwrapPersistedState<T>(value: unknown): T | null {
  if (!isRecord(value)) {
    return null;
  }

  if ('state' in value && isRecord(value.state)) {
    return value.state as T;
  }

  return value as T;
}

export function toUnixMs(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  return null;
}

export async function readVersionedJson<T>(key: string): Promise<T | null> {
  const rawValue = await AsyncStorage.getItem(key);
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (isRecord(parsed) && 'version' in parsed && 'data' in parsed) {
      return parsed.data as T;
    }

    return parsed as T;
  } catch {
    return null;
  }
}

export async function writeVersionedJson<T>(key: string, data: T, version: number): Promise<void> {
  const envelope: VersionedEnvelope<T> = { version, data };
  await AsyncStorage.setItem(key, JSON.stringify(envelope));
}

export async function removeStorageKeys(keys: string[]): Promise<void> {
  if (keys.length === 0) {
    return;
  }

  await AsyncStorage.multiRemove(keys);
}
