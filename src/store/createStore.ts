import { MMKV } from 'react-native-mmkv';
import { create, StateCreator } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import { zustandStorage } from './persistence';

const storage = new MMKV();

type PersistConfig<T> = {
  partialize?: (state: T) => Partial<T>;
  migrate?: (persistedState: any, version: number) => T | Promise<T>;
};

export const createStore = <T extends object>(
  name: string,
  initializer: StateCreator<T, [['zustand/subscribeWithSelector', never], ['zustand/immer', never]]>,
  { partialize, migrate }: PersistConfig<T> = {}
) => {
  const store = create<T>()(
    devtools(
      persist(subscribeWithSelector(immer(initializer)), {
        name,
        storage: zustandStorage(storage),
        partialize,
        migrate,
        onRehydrateStorage: (state) => {
          return (state, error) => {
            if (error) {
              console.log('an error happened during hydration', error)
            }
          }
        },
      }),
      { name: `Teach-This-${name}` }
    )
  );

  // Add hasHydrated logic here if needed, for now, it's handled by persist middleware

  return store;
};

type HydratableStore = {
  persist?: {
    hasHydrated?: () => boolean;
    onFinishHydration?: (cb: () => void) => () => void;
  };
};

/**
 * Resolves once a persisted store has finished rehydrating.
 *
 * Guards against reading `getState()` before persisted values exist, which
 * would otherwise yield `undefined` for store methods and cause silent no-ops
 * or TypeErrors on pre-hydration access.
 */
export const waitForHydration = (store: HydratableStore): Promise<void> => {
  if (store.persist?.hasHydrated?.()) {
    return Promise.resolve();
  }

  return new Promise(resolve => {
    const unsubscribe = store.persist?.onFinishHydration?.(() => {
      unsubscribe?.();
      resolve();
    });

    // If the store isn't persisted (no hydration lifecycle), resolve immediately.
    if (!unsubscribe) {
      resolve();
    }
  });
};