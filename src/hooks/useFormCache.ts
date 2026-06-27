import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  cacheFormValues,
  clearFormCache,
  formCacheService,
  getCachedFieldValues,
  getFormCacheStorageKey,
  type FormCacheFieldKey,
  type FormCacheStore,
  loadFormCache,
} from '../services/formCache';
import { useAppStore } from '../store';

const DEBOUNCE_MS = 800;

export function useFormCache(fieldKeys: FormCacheFieldKey[]) {
  const userId = useAppStore(state => state.user?.id);
  const storageKey = useMemo(() => getFormCacheStorageKey(userId ?? 'anonymous'), [userId]);

  const [prefillValues, setPrefillValues] = useState<Partial<Record<FormCacheFieldKey, string>>>(
    {}
  );
  const [cacheStore, setCacheStore] = useState<FormCacheStore>({});
  const [isLoading, setIsLoading] = useState(true);

  const stableFieldKeysRef = useRef(fieldKeys);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingValuesRef = useRef<Partial<Record<FormCacheFieldKey, string>> | null>(null);
  const writeCountRef = useRef(0);

  useEffect(() => {
    stableFieldKeysRef.current = fieldKeys;
  }, [fieldKeys]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const [values, store] = await Promise.all([
      getCachedFieldValues(storageKey, stableFieldKeysRef.current),
      loadFormCache(storageKey),
    ]);
    setPrefillValues(values);
    setCacheStore(store);
    setIsLoading(false);
  }, [storageKey]);

  // Re-load cache when userId changes (user switches account)
  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Cancel pending debounced write on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const _commitWrite = useCallback(
    async (values: Partial<Record<FormCacheFieldKey, string>>) => {
      await cacheFormValues(storageKey, values);
      writeCountRef.current += 1;
      await refresh();
    },
    [storageKey, refresh]
  );

  const persistFields = useCallback(
    (values: Partial<Record<FormCacheFieldKey, string>>) => {
      pendingValuesRef.current = values;

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        if (pendingValuesRef.current) {
          void _commitWrite(pendingValuesRef.current);
          pendingValuesRef.current = null;
        }
        debounceRef.current = null;
      }, DEBOUNCE_MS);
    },
    [_commitWrite]
  );

  const flushCache = useCallback(async () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (pendingValuesRef.current) {
      await _commitWrite(pendingValuesRef.current);
      pendingValuesRef.current = null;
    }
  }, [_commitWrite]);

  const applyPrefillToFields = useCallback(
    (
      currentValues: Partial<Record<FormCacheFieldKey, string>>,
      setters: Partial<Record<FormCacheFieldKey, (value: string) => void>>
    ) => {
      for (const key of stableFieldKeysRef.current) {
        const cached = prefillValues[key];
        const current = currentValues[key]?.trim() ?? '';
        const setter = setters[key];
        if (cached && !current && setter) {
          setter(cached);
        }
      }
    },
    [prefillValues]
  );

  const getSuggestion = useCallback(
    (key: FormCacheFieldKey, currentValue: string) =>
      formCacheService.getSuggestionForField(cacheStore, key, currentValue),
    [cacheStore]
  );

  const clearCache = useCallback(async () => {
    await clearFormCache(storageKey);
    setPrefillValues({});
    setCacheStore({});
  }, [storageKey]);

  return {
    prefillValues,
    cacheStore,
    isLoading,
    persistFields,
    flushCache,
    writeCount: writeCountRef.current,
    applyPrefillToFields,
    getSuggestion,
    clearCache,
    refresh,
  };
}
