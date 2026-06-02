import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder } from 'react-native';

type UseVideoGesturesParams = {
  currentPositionMillis: number;
  durationMillis: number;
  containerWidth: number;
  onSeek: (positionMillis: number) => void;
  onSeekStart?: () => void;
  onSeekEnd?: () => void;
  onSeekPreview?: (positionMillis: number) => void;
  onTogglePlayPause: () => void;
  _edgeSlop?: number;
  _deadZonePx?: number;
  seekSensitivity?: number;
  tapDebounceMs?: number;
};

const DEFAULT_EDGE_SLOP = 24;
const DEFAULT_DEAD_ZONE = 12;
const DEFAULT_TAP_DEBOUNCE = 280;
const DEFAULT_SEEK_SENSITIVITY = 0.9;

export function useVideoGestures({
  currentPositionMillis,
  durationMillis,
  containerWidth,
  onSeek,
  onSeekStart,
  onSeekEnd,
  onSeekPreview,
  onTogglePlayPause,
  _edgeSlop = DEFAULT_EDGE_SLOP,
  _deadZonePx = DEFAULT_DEAD_ZONE,
  seekSensitivity = DEFAULT_SEEK_SENSITIVITY,
  tapDebounceMs = DEFAULT_TAP_DEBOUNCE,
}: UseVideoGesturesParams) {
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [previewPositionMillis, setPreviewPositionMillis] = useState<number | null>(null);
  const lastTapRef = useRef(0);
  const startPositionRef = useRef(0);
  const previewPositionRef = useRef<number | null>(null);
  const positionRef = useRef(currentPositionMillis);
  const durationRef = useRef(durationMillis);

  useEffect(() => {
    positionRef.current = currentPositionMillis;
  }, [currentPositionMillis]);

  useEffect(() => {
    durationRef.current = durationMillis;
  }, [durationMillis]);

  const finishScrub = useCallback(() => {
    const preview = previewPositionRef.current;
    if (preview != null) {
      onSeek(preview);
    }
    previewPositionRef.current = null;
    setPreviewPositionMillis(null);
    setIsScrubbing(false);
    onSeekEnd?.();
  }, [onSeek, onSeekEnd]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => {
          if (!durationRef.current || containerWidth <= 0) {
            return false;
          }
          const isHorizontal = Math.abs(gesture.dx) > Math.abs(gesture.dy);
          if (!isHorizontal || Math.abs(gesture.dx) < _deadZonePx) {
            return false;
          }
          if (gesture.x0 < _edgeSlop || gesture.x0 > containerWidth - _edgeSlop) {
            return false;
          }
          return true;
        },
        onPanResponderGrant: () => {
          startPositionRef.current = positionRef.current;
          setIsScrubbing(true);
          onSeekStart?.();
        },
        onPanResponderMove: (_, gesture) => {
          if (!durationRef.current || containerWidth <= 0) {
            return;
          }
          const width = Math.max(containerWidth, 1);
          const deltaRatio = gesture.dx / width;
          const deltaMillis = deltaRatio * durationRef.current * seekSensitivity;
          const nextPosition = clamp(
            startPositionRef.current + deltaMillis,
            0,
            durationRef.current
          );
          previewPositionRef.current = nextPosition;
          setPreviewPositionMillis(nextPosition);
          onSeekPreview?.(nextPosition);
        },
        onPanResponderRelease: finishScrub,
        onPanResponderTerminate: finishScrub,
      }),
    [containerWidth, _deadZonePx, _edgeSlop, seekSensitivity, onSeekPreview, onSeekStart, finishScrub]
  );

  const onTap = useCallback(() => {
    if (isScrubbing) {
      return;
    }
    const now = Date.now();
    if (now - lastTapRef.current < tapDebounceMs) {
      return;
    }
    lastTapRef.current = now;
    onTogglePlayPause();
  }, [isScrubbing, onTogglePlayPause, tapDebounceMs]);

  return {
    panHandlers: panResponder.panHandlers,
    onTap,
    isScrubbing,
    previewPositionMillis,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
