import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';

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

  const handleSeekBarLayout = useCallback((event: any) => {
    setSeekBarWidth(event.nativeEvent.layout.width);
  }, []);

  const positionFromEvent = useCallback((event: any) => {
    if (seekBarWidth <= 0 || durationMillis <= 0) {
      return 0;
    }
    const x = event.nativeEvent.locationX;
    return clamp((x / seekBarWidth) * durationMillis, 0, durationMillis);
  }, [seekBarWidth, durationMillis]);

  const handleSeekGrant = useCallback((event: any) => {
    if (!durationMillis) {
      return;
    }
    onSeekStart?.();
    const position = positionFromEvent(event);
    onSeekPreview?.(position);
  }, [durationMillis, onSeekStart, onSeekPreview, positionFromEvent]);

  const handleSeekMove = useCallback((event: any) => {
    if (!durationMillis) {
      return;
    }
    const position = positionFromEvent(event);
    onSeekPreview?.(position);
  }, [durationMillis, onSeekPreview, positionFromEvent]);

  const handleSeekRelease = useCallback((event: any) => {
    if (!durationMillis) {
      return;
    }
    const position = positionFromEvent(event);
    onSeek(position);
    onSeekEnd?.();
  }, [durationMillis, positionFromEvent, onSeek, onSeekEnd]);

  const handleSeekTerminate = useCallback(() => {
    onSeekEnd?.();
  }, [onSeekEnd]);

  const handleToggleSpeedMenu = useCallback(() => {
    setIsSpeedMenuOpen(prev => !prev);
  }, []);

  const handleToggleQualityMenu = useCallback(() => {
    setIsQualityMenuOpen(prev => !prev);
  }, []);

  const handleSelectRate = useCallback((rate: number) => {
    onChangeRate(rate);
    setIsSpeedMenuOpen(false);
  }, [onChangeRate]);

  const handleSelectQualityOption = useCallback((qualityId: string) => {
    onSelectQuality(qualityId);
    setIsQualityMenuOpen(false);
  }, [onSelectQuality]);

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      className="absolute inset-0 justify-between bg-black/35"
      style={{ opacity }}
    >
      <View className="flex-row items-center px-3 pt-2.5">
        <View className="flex-1" />
        {isPiPSupported ? (
          <Pressable
            accessibilityLabel={
              isPiPActive ? 'Exit picture in picture' : 'Enter picture in picture'
            }
            onPress={onTogglePiP}
            className="px-2.5 py-1.5"
          >
            <Text className="text-white text-xs font-semibold">{isPiPActive ? 'PiP On' : 'PiP'}</Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityLabel={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          onPress={onToggleFullscreen}
          className="px-2.5 py-1.5"
        >
          <Text className="text-white text-xs font-semibold">{isFullscreen ? 'Exit' : 'Full'}</Text>
        </Pressable>
      </View>

      <View className="items-center justify-center">
        <Pressable
          accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
          onPress={onPlayPause}
          className="bg-black/55 px-4.5 py-2.5 rounded-full"
        >
          <Text className="text-white text-base font-semibold">{isPlaying ? 'Pause' : 'Play'}</Text>
        </Pressable>
      </View>

      <View className="px-3 pb-3">
        {previewPositionMillis != null ? (
          <View className="self-center bg-black/65 px-2.5 py-1 rounded-xl mb-2">
            <Text className="text-white text-xs">
              {formatTime(displayPosition)} / {formatTime(durationMillis)}
            </Text>
          </View>
        ) : null}

        <View className="flex-row justify-between mb-1.5">
          <Text className="text-[#f1f1f1] text-xs">{formatTime(displayPosition)}</Text>
          <Text className="text-[#f1f1f1] text-xs">{formatTime(durationMillis)}</Text>
        </View>

        <View
          className="h-5.5 rounded-lg bg-white/15 justify-center mb-2.5 overflow-hidden"
          onLayout={handleSeekBarLayout}
          onStartShouldSetResponder={() => true}
          onResponderGrant={handleSeekGrant}
          onResponderMove={handleSeekMove}
          onResponderRelease={handleSeekRelease}
          onResponderTerminate={handleSeekTerminate}
        >
          <View className="absolute left-0 top-0 bottom-0 bg-white/30" style={{ width: bufferedWidth }} />
          <View className="absolute left-0 top-0 bottom-0 bg-white" style={{ width: progressWidth }} />
          <View
            className="absolute bg-white"
            style={{
              left: thumbLeft,
              width: SEEK_THUMB_SIZE,
              height: SEEK_THUMB_SIZE,
              borderRadius: SEEK_THUMB_SIZE / 2,
            }}
          />
        </View>

        <View className="flex-row items-center justify-between">
          <Pressable
            accessibilityLabel="Playback speed"
            onPress={handleToggleSpeedMenu}
            className="px-2.5 py-1.5"
          >
            <Text className="text-white text-xs font-semibold">{formatRate(playbackRate)}</Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Quality"
            onPress={handleToggleQualityMenu}
            className="px-2.5 py-1.5"
          >
            <Text className="text-white text-xs font-semibold">{qualityLabel}</Text>
          </Pressable>
          {isPiPSupported ? (
            <Pressable
              accessibilityLabel={
                isPiPActive ? 'Exit picture in picture' : 'Enter picture in picture'
              }
              onPress={onTogglePiP}
              className="px-2.5 py-1.5"
            >
              <Text className="text-white text-xs font-semibold">{isPiPActive ? 'PiP On' : 'PiP'}</Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityLabel={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            onPress={onToggleFullscreen}
            className="px-2.5 py-1.5"
          >
            <Text className="text-white text-xs font-semibold">{isFullscreen ? 'Exit' : 'Full'}</Text>
          </Pressable>
        </View>

        {(isSpeedMenuOpen || isQualityMenuOpen) && (
          <View className="mt-2">
            {isSpeedMenuOpen ? (
              <View className="bg-black/85 rounded-lg py-1.5">
                {rateOptions.map(rate => (
                  <Pressable
                    key={rate}
                    accessibilityLabel={`Set playback speed ${formatRate(rate)}`}
                    onPress={() => handleSelectRate(rate)}
                    className="px-3 py-2"
                  >
                    <Text
                      className={`text-[#dcdcdc] text-[13px] ${
                        rate === playbackRate ? 'text-white font-bold' : ''
                      }`}
                    >
                      {formatRate(rate)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {isQualityMenuOpen ? (
              <View className="bg-black/85 rounded-lg py-1.5">
                {qualityOptions.map(option => (
                  <Pressable
                    key={option.id}
                    accessibilityLabel={`Set quality ${option.label}`}
                    onPress={() => handleSelectQualityOption(option.id)}
                    className="px-3 py-2"
                  >
                    <Text
                      className={`text-[#dcdcdc] text-[13px] ${
                        option.id === selectedQualityId ? 'text-white font-bold' : ''
                      }`}
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
          <View className="mt-1.5">
            <Text className="text-white text-[11px]">
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

export default VideoControls;

