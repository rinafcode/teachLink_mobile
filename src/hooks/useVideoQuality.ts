import * as Network from 'expo-network';
import { useEffect, useMemo, useState } from 'react';

import {
  AUTO_QUALITY_ID,
  deriveNetworkType,
  getQualityOptions,
  normalizeSources,
  selectSourceById,
  type NetworkType,
  type NormalizedVideoSource,
  type QualityOption,
  type VideoSource,
} from '../services/videoQuality';

export interface UseVideoQualityOptions {
  sources: VideoSource[];
  initialQualityId?: string;
  /** Pass true when the connection is known to be slow (2G / slow-3G) */
  isSlowConnection?: boolean;
}

export interface UseVideoQualityResult {
  /** Normalized source list */
  normalizedSources: NormalizedVideoSource[];
  /** Quality options to display in the picker (includes Auto) */
  qualityOptions: QualityOption[];
  /** Currently selected quality ID */
  selectedQualityId: string;
  /** The active source resolved from selectedQualityId + networkType */
  activeSource: NormalizedVideoSource | null;
  /** Detected network tier */
  networkType: NetworkType;
  /** Change the selected quality */
  setSelectedQualityId: (id: string) => void;
}

/**
 * Wires network-type detection to automatic video quality selection.
 *
 * - On wifi: selects the highest-quality source.
 * - On cellular: caps at 1500 kbps.
 * - On slow-cellular (2G/slow-3G): caps at 400 kbps.
 * - When the user picks a specific quality, that choice is respected.
 */
export function useVideoQuality({
  sources,
  initialQualityId,
  isSlowConnection,
}: UseVideoQualityOptions): UseVideoQualityResult {
  const [networkType, setNetworkType] = useState<NetworkType>('unknown');
  const [selectedQualityId, setSelectedQualityId] = useState(initialQualityId ?? AUTO_QUALITY_ID);

  const normalizedSources = useMemo(() => normalizeSources(sources), [sources]);
  const qualityOptions = useMemo(() => getQualityOptions(normalizedSources), [normalizedSources]);

  // Keep selectedQualityId valid when sources change
  useEffect(() => {
    if (!qualityOptions.some(opt => opt.id === selectedQualityId)) {
      setSelectedQualityId(AUTO_QUALITY_ID);
    }
  }, [qualityOptions, selectedQualityId]);

  // Detect network type via expo-network
  useEffect(() => {
    let mounted = true;

    const apply = (state: { type?: string | null }) => {
      if (mounted) {
        setNetworkType(deriveNetworkType(state, isSlowConnection));
      }
    };

    Network.getNetworkStateAsync()
      .then(apply)
      .catch(() => {});

    const subscription = Network.addNetworkStateListener(apply);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, [isSlowConnection]);

  const activeSource = useMemo(
    () => selectSourceById(normalizedSources, selectedQualityId, networkType),
    [normalizedSources, selectedQualityId, networkType]
  );

  return {
    normalizedSources,
    qualityOptions,
    selectedQualityId,
    activeSource,
    networkType,
    setSelectedQualityId,
  };
}
