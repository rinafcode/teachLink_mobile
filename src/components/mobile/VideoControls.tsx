import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import type { QualityOption } from '../../services/videoQuality';

type VideoControlsProps = {
  visible: boolean;
  isPlaying: boolean;
  currentPositionMillis: number;
  durationMillis: number;
  bufferedPositionMillis?: number;
  previewPositionMillis?: number | null;
  onPlayPause: () => void;
  onSeek: (positionMillis: number) => void;
  onSeekStart?: () => void;
  onSeekEnd?: () => void;
  onSeekPreview?: (positionMillis: number) => void;
  playbackRate: number;
  rateOptions: number[];
  onChangeRate: (rate: number) => void;
  qualityOptions: QualityOption[];
  selectedQualityId: string;
  onSelectQuality: (qualityId: string) => void;
  onToggleFullscreen: () => void;
  isFullscreen: boolean;
  onTogglePiP: () => void;
  isPiPSupported: boolean;
  isPiPActive: boolean;
  isBuffering: boolean;
  isLoading: boolean;
  isSwitchingQuality: boolean;
};

const SEEK_THUMB_SIZE = 12;

const VideoControls = ({
  visible,
  isPlaying,
  currentPositionMillis,
  durationMillis,
  bufferedPositionMillis = 0,
  previewPositionMillis,
  onPlayPause,
  onSeek,
  onSeekStart,
  onSeekEnd,
  onSeekPreview,
  playbackRate,
  rateOptions,
  onChangeRate,
  qualityOptions,
  selectedQualityId,
  onSelectQuality,
  onToggleFullscreen,
  isFullscreen,
  onTogglePiP,
  isPiPSupported,
  isPiPActive,
  isBuffering,
  isLoading,
  isSwitchingQuality,
}: VideoControlsProps) => {
  const [seekBarWidth, setSeekBarWidth] = useState(0);
  const [isSpeedMenuOpen, setIsSpeedMenuOpen] = useState(false);
  const [isQualityMenuOpen, setIsQualityMenuOpen] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [visible, opacity]);

  useEffect(() => {
    if (!visible) {
      setIsSpeedMenuOpen(false);
      setIsQualityMenuOpen(false);
    }
  }, [visible]);

  const displayPosition = previewPositionMillis ?? currentPositionMillis;
  const safeDuration = durationMillis > 0 ? durationMillis : 1;
  const progress = clamp(displayPosition / safeDuration, 0, 1);
  const buffered = clamp(bufferedPositionMillis / safeDuration, 0, 1);
  const progressWidth = seekBarWidth * progress;
  const bufferedWidth = seekBarWidth * buffered;
  const thumbLeft = Math.min(
    Math.max(0, progressWidth - SEEK_THUMB_SIZE / 2),
    Math.max(0, seekBarWidth - SEEK_THUMB_SIZE)
  );

  const qualityLabel = useMemo(() => {
    const selected = qualityOptions.find(option => option.id === selectedQualityId);
    return selected?.label ?? 'Auto';
  }, [qualityOptions, selectedQualityId]);

  const handleSeekBarLayout = (event: any) => {
    setSeekBarWidth(event.nativeEvent.layout.width);
  };

  const positionFromEvent = (event: any) => {
    if (seekBarWidth <= 0 || durationMillis <= 0) {
      return 0;
    }
    const x = event.nativeEvent.locationX;
    return clamp((x / seekBarWidth) * durationMillis, 0, durationMillis);
  };

  const handleSeekGrant = (event: any) => {
    if (!durationMillis) {
      return;
    }
    onSeekStart?.();
    const position = positionFromEvent(event);
    onSeekPreview?.(position);
  };

  const handleSeekMove = (event: any) => {
    if (!durationMillis) {
      return;
    }
    const position = positionFromEvent(event);
    onSeekPreview?.(position);
  };

  const handleSeekRelease = (event: any) => {
    if (!durationMillis) {
      return;
    }
    const position = positionFromEvent(event);
    onSeek(position);
    onSeekEnd?.();
  };

  const handleSeekTerminate = () => {
    onSeekEnd?.();
  };

  return (
    <Animated.View pointerEvents={visible ? 'auto' : 'none'} style={[styles.overlay, { opacity }]}>
      <View style={styles.topRow}>
        <View style={styles.topSpacer} />
        {isPiPSupported ? (
          <Pressable
            accessibilityLabel={
              isPiPActive ? 'Exit picture in picture' : 'Enter picture in picture'
            }
            onPress={onTogglePiP}
            style={styles.controlButton}
          >
            <Text style={styles.controlText}>{isPiPActive ? 'PiP On' : 'PiP'}</Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityLabel={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          onPress={onToggleFullscreen}
          style={styles.controlButton}
        >
          <Text style={styles.controlText}>{isFullscreen ? 'Exit' : 'Full'}</Text>
        </Pressable>
      </View>

      <View style={styles.centerRow}>
        <Pressable
          accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
          onPress={onPlayPause}
          style={styles.playButton}
        >
          <Text style={styles.playText}>{isPlaying ? 'Pause' : 'Play'}</Text>
        </Pressable>
      </View>

      <View style={styles.bottomRow}>
        {previewPositionMillis != null ? (
          <View style={styles.previewBubble}>
            <Text style={styles.previewText}>
              {formatTime(displayPosition)} / {formatTime(durationMillis)}
            </Text>
          </View>
        ) : null}

        <View style={styles.timeRow}>
          <Text style={styles.timeText}>{formatTime(displayPosition)}</Text>
          <Text style={styles.timeText}>{formatTime(durationMillis)}</Text>
        </View>

        <View
          style={styles.seekBar}
          onLayout={handleSeekBarLayout}
          onStartShouldSetResponder={() => true}
          onResponderGrant={handleSeekGrant}
          onResponderMove={handleSeekMove}
          onResponderRelease={handleSeekRelease}
          onResponderTerminate={handleSeekTerminate}
        >
          <View style={[styles.seekBuffered, { width: bufferedWidth }]} />
          <View style={[styles.seekProgress, { width: progressWidth }]} />
          <View style={[styles.seekThumb, { left: thumbLeft }]} />
        </View>

        <View style={styles.controlsRow}>
          <Pressable
            accessibilityLabel="Playback speed"
            onPress={() => setIsSpeedMenuOpen(prev => !prev)}
            style={styles.controlButton}
          >
            <Text style={styles.controlText}>{formatRate(playbackRate)}</Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Quality"
            onPress={() => setIsQualityMenuOpen(prev => !prev)}
            style={styles.controlButton}
          >
            <Text style={styles.controlText}>{qualityLabel}</Text>
          </Pressable>
          {isPiPSupported ? (
            <Pressable
              accessibilityLabel={
                isPiPActive ? 'Exit picture in picture' : 'Enter picture in picture'
              }
              onPress={onTogglePiP}
              style={styles.controlButton}
            >
              <Text style={styles.controlText}>{isPiPActive ? 'PiP On' : 'PiP'}</Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityLabel={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            onPress={onToggleFullscreen}
            style={styles.controlButton}
          >
            <Text style={styles.controlText}>{isFullscreen ? 'Exit' : 'Full'}</Text>
          </Pressable>
        </View>

        {(isSpeedMenuOpen || isQualityMenuOpen) && (
          <View style={styles.menuBackdrop}>
            {isSpeedMenuOpen ? (
              <View style={styles.menu}>
                {rateOptions.map(rate => (
                  <Pressable
                    key={rate}
                    accessibilityLabel={`Set playback speed ${formatRate(rate)}`}
                    onPress={() => {
                      onChangeRate(rate);
                      setIsSpeedMenuOpen(false);
                    }}
                    style={styles.menuItem}
                  >
                    <Text
                      style={[
                        styles.menuText,
                        rate === playbackRate ? styles.menuTextActive : null,
                      ]}
                    >
                      {formatRate(rate)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {isQualityMenuOpen ? (
              <View style={styles.menu}>
                {qualityOptions.map(option => (
                  <Pressable
                    key={option.id}
                    accessibilityLabel={`Set quality ${option.label}`}
                    onPress={() => {
                      onSelectQuality(option.id);
                      setIsQualityMenuOpen(false);
                    }}
                    style={styles.menuItem}
                  >
                    <Text
                      style={[
                        styles.menuText,
                        option.id === selectedQualityId ? styles.menuTextActive : null,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        )}

        {(isLoading || isBuffering || isSwitchingQuality) && (
          <View style={styles.statusRow}>
            <Text style={styles.statusText}>
              {isSwitchingQuality ? 'Switching quality' : isBuffering ? 'Buffering' : 'Loading'}
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
};

function formatTime(millis: number) {
  if (!Number.isFinite(millis) || millis <= 0) {
    return '0:00';
  }
  const totalSeconds = Math.floor(millis / 1000);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600);
  const paddedSeconds = seconds < 10 ? `0${seconds}` : `${seconds}`;
  if (hours > 0) {
    const paddedMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
    return `${hours}:${paddedMinutes}:${paddedSeconds}`;
  }
  return `${minutes}:${paddedSeconds}`;
}

function formatRate(rate: number) {
  const rounded = Math.round(rate * 100) / 100;
  const label = rounded % 1 === 0 ? `${rounded.toFixed(0)}x` : `${rounded}x`;
  return label;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  topSpacer: {
    flex: 1,
  },
  centerRow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomRow: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  playButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 22,
  },
  playText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  timeText: {
    color: '#f1f1f1',
    fontSize: 12,
  },
  seekBar: {
    height: 22,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    marginBottom: 10,
    overflow: 'hidden',
  },
  seekBuffered: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  seekProgress: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#fff',
  },
  seekThumb: {
    position: 'absolute',
    width: SEEK_THUMB_SIZE,
    height: SEEK_THUMB_SIZE,
    borderRadius: SEEK_THUMB_SIZE / 2,
    backgroundColor: '#fff',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  controlButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  controlText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  menuBackdrop: {
    marginTop: 8,
  },
  menu: {
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderRadius: 8,
    paddingVertical: 6,
  },
  menuItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  menuText: {
    color: '#dcdcdc',
    fontSize: 13,
  },
  menuTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  previewBubble: {
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  previewText: {
    color: '#fff',
    fontSize: 12,
  },
  statusRow: {
    marginTop: 6,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
  },
});

export default VideoControls;
