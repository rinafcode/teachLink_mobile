import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, Platform } from 'react-native';

import type { Video } from 'expo-av';
import type { RefObject } from 'react';

type UsePictureInPictureParams = {
  videoRef: RefObject<Video>;
  isPlaying: boolean;
};

export function usePictureInPicture({ videoRef, isPlaying }: UsePictureInPictureParams) {
  const [isPiPActive, setIsPiPActive] = useState(false);
  const [isPiPRequested, setIsPiPRequested] = useState(false);

  const isPiPSupported = useMemo(() => {
    if (Platform.OS !== 'ios') {
      return false;
    }
    const version = typeof Platform.Version === 'string' ? parseInt(Platform.Version, 10) : Platform.Version;
    return Number.isFinite(version) ? version >= 14 : false;
  }, []);

  const enterPiP = useCallback(async () => {
    if (!isPiPSupported || !videoRef.current) {
      return false;
    }
    setIsPiPRequested(true);
    setIsPiPActive(true);
    try {
      await videoRef.current.presentFullscreenPlayer();
      return true;
    } catch {
      setIsPiPActive(false);
      return false;
    }
  }, [isPiPSupported, videoRef]);

  const exitPiP = useCallback(async () => {
    if (!isPiPSupported || !videoRef.current) {
      setIsPiPRequested(false);
      setIsPiPActive(false);
      return false;
    }
    setIsPiPRequested(false);
    setIsPiPActive(false);
    try {
      await videoRef.current.dismissFullscreenPlayer();
    } catch {
      return false;
    }
    return true;
  }, [isPiPSupported, videoRef]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        if (!isPiPRequested) {
          setIsPiPActive(false);
        }
        return;
      }
      if (isPiPRequested && isPlaying) {
        setIsPiPActive(true);
      }
    });
    return () => subscription.remove();
  }, [isPiPRequested, isPlaying]);

  useEffect(() => {
    if (!isPlaying && isPiPActive) {
      setIsPiPActive(false);
    }
  }, [isPlaying, isPiPActive]);

  return {
    isPiPSupported,
    isPiPActive,
    enterPiP,
    exitPiP,
  };
}
