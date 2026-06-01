import { useCallback, useEffect, useRef, useState } from 'react';

import {
  cacheFormValues,
  clearFormCache,
  formCacheService,
  getCachedFieldValues,
  type FormCacheFieldKey,
  type FormCacheStore,
  loadFormCache,
} from '../services/formCache';

export function useFormCache(fieldKeys: FormCacheFieldKey[]) {
  const [prefillValues, setPrefillValues] = useState<Partial<Record<FormCacheFieldKey, string>>>(
    {}
  );
  const [cacheStore, setCacheStore] = useState<FormCacheStore>({});
  const [isLoading, setIsLoading] = useState(true);

  const stableFieldKeysRef = useRef(fieldKeys);

  useEffect(() => {
    stableFieldKeysRef.current = fieldKeys;
  }, [fieldKeys]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const [values, store] = await Promise.all([
      getCachedFieldValues(stableFieldKeysRef.current),
      loadFormCache(),
    ]);
    setPrefillValues(values);
    setCacheStore(store);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const persistFields = useCallback(
    async (values: Partial<Record<FormCacheFieldKey, string>>) => {
      await cacheFormValues(values);
      await refresh();
    },
    [refresh]
  );

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
    await clearFormCache();
    setPrefillValues({});
    setCacheStore({});
  }, []);

  return {
    prefillValues,
    cacheStore,
    isLoading,
    persistFields,
    applyPrefillToFields,
    getSuggestion,
    clearCache,
    refresh,
  };
}
