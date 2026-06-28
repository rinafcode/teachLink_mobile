import { encryptedGetItem, encryptedRemoveItem, encryptedSetItem } from '../utils/encryptedStorage';

import { safeStorageWrite } from '../utils/storage';

/** Returns an AsyncStorage key scoped to the given user (versioned for future migrations). */
export function getFormCacheStorageKey(userId: string): string {
  return `@teachlink/form-cache/${userId}/v1`;
}

/** AsyncStorage key for the form value cache (versioned for future migrations). */
export const FORM_CACHE_STORAGE_KEY = '@teachlink/form-cache/v1';

/** Cached entries older than this are pruned on read/write (90 days). */
export const FORM_CACHE_TTL_MS = 90 * 24 * 60 * 60 * 1000;

/** Reusable field identifiers shared across forms. */
export type FormCacheFieldKey =
  | 'fullName'
  | 'email'
  | 'bio'
  | 'location'
  | 'website'
  | 'phone'
  | 'addressLine1'
  | 'addressLine2'
  | 'city'
  | 'state'
  | 'postalCode'
  | 'country'
  | 'company';

export interface CachedFormField {
  value: string;
  updatedAt: number;
}

export type FormCacheStore = Partial<Record<FormCacheFieldKey, CachedFormField>>;

const SENSITIVE_FIELD_KEYS: FormCacheFieldKey[] = [];

export function isExpired(entry: CachedFormField, now = Date.now()): boolean {
  return now - entry.updatedAt > FORM_CACHE_TTL_MS;
}

export function pruneExpiredCache(store: FormCacheStore, now = Date.now()): FormCacheStore {
  const pruned: FormCacheStore = {};
  for (const key of Object.keys(store) as FormCacheFieldKey[]) {
    const entry = store[key];
    if (entry && !isExpired(entry, now)) {
      pruned[key] = entry;
    }
  }
  return pruned;
}

export async function loadFormCache(storageKey = FORM_CACHE_STORAGE_KEY): Promise<FormCacheStore> {
  const raw = await AsyncStorage.getItem(storageKey);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as FormCacheStore;
    const pruned = pruneExpiredCache(parsed);
    if (Object.keys(pruned).length !== Object.keys(parsed).length) {
      await saveFormCache(storageKey, pruned);
    }
    return pruned;
  } catch {
    return {};
  }
}

export async function saveFormCache(storageKey: string, store: FormCacheStore): Promise<void>;
export async function saveFormCache(store: FormCacheStore): Promise<void>;
export async function saveFormCache(
  storageKeyOrStore: string | FormCacheStore,
  maybeStore?: FormCacheStore
): Promise<void> {
  if (typeof storageKeyOrStore === 'string') {
    await AsyncStorage.setItem(storageKeyOrStore, JSON.stringify(maybeStore ?? {}));
    return;
  }

  await safeStorageWrite(FORM_CACHE_STORAGE_KEY, JSON.stringify(storageKeyOrStore));
}

export async function getCachedFieldValue(
  storageKey: string,
  key: FormCacheFieldKey
): Promise<string | null> {
  const store = await loadFormCache(storageKey);
  const entry = store[key];
  if (!entry || isExpired(entry)) return null;
  return entry.value;
}

export async function getCachedFieldValues(
  storageKey: string,
  keys: FormCacheFieldKey[]
): Promise<Partial<Record<FormCacheFieldKey, string>>> {
  const store = await loadFormCache(storageKey);
  const result: Partial<Record<FormCacheFieldKey, string>> = {};
  for (const key of keys) {
    const entry = store[key];
    if (entry && !isExpired(entry) && entry.value.trim()) {
      result[key] = entry.value;
    }
  }
  return result;
}

export async function setCachedFieldValue(
  storageKey: string,
  key: FormCacheFieldKey,
  value: string
): Promise<void>;
export async function setCachedFieldValue(key: FormCacheFieldKey, value: string): Promise<void>;
export async function setCachedFieldValue(
  storageKeyOrKey: string,
  keyOrValue: FormCacheFieldKey | string,
  maybeValue?: string
): Promise<void> {
  const storageKey = maybeValue ? storageKeyOrKey : FORM_CACHE_STORAGE_KEY;
  const key = maybeValue
    ? (keyOrValue as FormCacheFieldKey)
    : (storageKeyOrKey as FormCacheFieldKey);
  const value = maybeValue ?? keyOrValue;
  const trimmed = value.trim();
  if (!trimmed || SENSITIVE_FIELD_KEYS.includes(key)) return;

  const store = await loadFormCache(storageKey);
  store[key] = { value: trimmed, updatedAt: Date.now() };
  await saveFormCache(storageKey, pruneExpiredCache(store));
}

export async function cacheFormValues(
  storageKey: string,
  values: Partial<Record<FormCacheFieldKey, string>>
): Promise<void> {
  const store = await loadFormCache(storageKey);
  const now = Date.now();

  for (const [key, value] of Object.entries(values) as [FormCacheFieldKey, string][]) {
    const trimmed = value?.trim();
    if (!trimmed || SENSITIVE_FIELD_KEYS.includes(key)) continue;
    store[key] = { value: trimmed, updatedAt: now };
  }

  await saveFormCache(storageKey, pruneExpiredCache(store));
}

export function getSuggestionForField(
  store: FormCacheStore,
  key: FormCacheFieldKey,
  currentValue: string
): string | null {
  const entry = store[key];
  if (!entry || isExpired(entry)) return null;
  const suggestion = entry.value.trim();
  if (!suggestion) return null;
  if (suggestion === currentValue.trim()) return null;
  return suggestion;
}

export async function clearFormCache(storageKey: string): Promise<void> {
  await encryptedRemoveItem(storageKey);
}

/** Maps profile/edit labels to shared cache keys. */
export const PROFILE_FORM_CACHE_KEYS: FormCacheFieldKey[] = [
  'fullName',
  'email',
  'bio',
  'location',
  'website',
];

export const formCacheService = {
  getFormCacheStorageKey,
  loadFormCache,
  getCachedFieldValue,
  getCachedFieldValues,
  setCachedFieldValue,
  cacheFormValues,
  clearFormCache,
  getSuggestionForField,
  pruneExpiredCache,
  isExpired,
};
