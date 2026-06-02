import { useEffect, useMemo, useState } from 'react';

import {
  FeatureFlagContext,
  getFeatureFlagConfig,
  isFeatureEnabled,
  subscribeFeatureFlagUpdates,
} from '../services/featureFlags';

export function useFeatureFlag(featureKey: string, context: FeatureFlagContext = {}): boolean {
  const [enabled, setEnabled] = useState(() => isFeatureEnabled(featureKey, context));

  useEffect(() => {
    const update = () => setEnabled(isFeatureEnabled(featureKey, context));
    const unsubscribe = subscribeFeatureFlagUpdates(update);
    update();
    return unsubscribe;
    // NOTE: context object reference changes on each render; dependencies optimized for key+userId+region
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [featureKey, context.userId, context.region]);

  return enabled;
}

export function useFeatureFlagsConfig() {
  const [config, setConfig] = useState(getFeatureFlagConfig());

  useEffect(() => {
    const update = () => setConfig(getFeatureFlagConfig());
    const unsubscribe = subscribeFeatureFlagUpdates(update);
    update();
    return unsubscribe;
  }, []);

  return useMemo(() => config, [config]);
}
