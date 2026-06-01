import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { preloadService } from '../services/preloadService';

/**
 * Custom hook to interact with the predictive background preloading system.
 * It automatically binds the router instance from Expo Router so components 
 * do not need to manage router instances manually.
 */
export function usePredictivePreload() {
  const router = useRouter();

  /**
   * Preloads route chunks, SWR data caches, and media assets for likely destinations of currentScreen.
   */
  const preload = useCallback(
    (currentScreen: string | null | undefined) => {
      return preloadService.preload(currentScreen, router);
    },
    [router]
  );

  /**
   * Predict likely next screens based on historical transition metrics.
   */
  const predictNextScreens = useCallback(
    (currentScreen: string | null | undefined, limit?: number) => {
      return preloadService.getPredictiveDestinations(currentScreen, limit);
    },
    []
  );

  /**
   * Record a manual route transition to feed transition telemetry.
   */
  const recordTransition = useCallback(
    (from: string | null | undefined, to: string | null | undefined) => {
      return preloadService.recordTransition(from, to);
    },
    []
  );

  /**
   * Read the live prediction-accuracy metric (hits / evaluated transitions).
   */
  const getPredictionAccuracy = useCallback(
    () => preloadService.getPredictionAccuracy(),
    []
  );

  return {
    preload,
    predictNextScreens,
    recordTransition,
    getPredictionAccuracy,
    preloadService,
  };
}

export default usePredictivePreload;
