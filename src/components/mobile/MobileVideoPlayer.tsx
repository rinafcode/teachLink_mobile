import { Audio, AVPlaybackStatus, AVPlaybackStatusToSet, ResizeMode, Video } from 'expo-av';
import * as Network from 'expo-network';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

import { usePictureInPicture, useVideoGestures } from '../../hooks';
import {
  AUTO_QUALITY_ID,
  deriveNetworkType,
  getQualityOptions,
  normalizeSources,
  selectSourceById,
  type NetworkType,
  type NormalizedVideoSource,
  type VideoSource,
} from '../../services/videoQuality';
import { ErrorBoundary } from '../common/ErrorBoundary';
import VideoControls from './VideoControls';

const AUTO_HIDE_MS = 3000;
const DEFAULT_ASPECT_RATIO = 16 / 9;
const DEFAULT_RATES = [0.75, 1, 1.25, 1.5, 2];

/**
 * Props for the MobileVideoPlayer component
 */
export type MobileVideoPlayerProps = {
  /** Array of video sources with different quality options */
  sources: VideoSource[];
  /** Optional poster image URI to display before playback */
  posterUri?: string;
  /** Whether to start playback automatically when loaded */
  autoPlay?: boolean;
  /** Initial playback rate (speed) */
  initialRate?: number;
  /** Available playback rate options */
  rateOptions?: number[];
  /** Initial quality ID to use for playback */
  initialQualityId?: string;
  /** Optional style for the video container */
  /** URI of the poster image to display before playback */
  posterUri?: string;
  /** Whether to start playback automatically */
  autoPlay?: boolean;
  /** Initial playback rate */
  initialRate?: number;
  /** Available playback rate options */
  rateOptions?: number[];
  /** ID of the initial quality to use */
  initialQualityId?: string;
  /** Custom style for the video container */
  style?: StyleProp<ViewStyle>;
  /** Whether to enable background audio playback */
  enableBackgroundAudio?: boolean;
  /** Callback when a playback error occurs */
  onError?: (message: string) => void;
  /** Callback when playback status updates */
  onPlaybackStatusUpdate?: (status: AVPlaybackStatus) => void;
  /** Callback when video quality changes */
  onQualityChange?: (qualityId: string) => void;
};

const MobileVideoPlayer = ({
  sources,
  posterUri,
  autoPlay = false,
  initialRate = 1,
  rateOptions = DEFAULT_RATES,
  initialQualityId,
  style,
  enableBackgroundAudio = true,
  onError,
  onPlaybackStatusUpdate,
  onQualityChange,
}: MobileVideoPlayerProps) => {
  const videoRef = useRef<Video | null>(null);
  const autoPlayHandledRef = useRef(false);
  const lastToggleRef = useRef(0);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resumeStatusRef = useRef<AVPlaybackStatusToSet | null>(null);

  const [networkType, setNetworkType] = useState<NetworkType>('unknown');
  const [selectedQualityId, setSelectedQualityId] = useState(initialQualityId ?? AUTO_QUALITY_ID);
  const [activeSource, setActiveSource] = useState<NormalizedVideoSource | null>(null);
  const [playbackRate, setPlaybackRate] = useState(initialRate);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSwitchingQuality, setIsSwitchingQuality] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [durationMillis, setDurationMillis] = useState(0);
  const [positionMillis, setPositionMillis] = useState(0);
  const [bufferedMillis, setBufferedMillis] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [resumeStatus, setResumeStatus] = useState<AVPlaybackStatusToSet | null>(null);
  const [videoAspectRatio, setVideoAspectRatio] = useState(DEFAULT_ASPECT_RATIO);
  const [containerWidth, setContainerWidth] = useState(0);
  const [seekBarPreviewMillis, setSeekBarPreviewMillis] = useState<number | null>(null);
  const [isSeekBarScrubbing, setIsSeekBarScrubbing] = useState(false);
  const isPlayingRef = useRef(isPlaying);
  const isScrubbingRef = useRef(false);
  const errorRef = useRef<string | null>(error);

  const normalizedSources = useMemo(() => normalizeSources(sources), [sources]);
  const qualityOptions = useMemo(() => getQualityOptions(normalizedSources), [normalizedSources]);
  const videoSource = useMemo(
    () => (activeSource ? { uri: activeSource.uri } : undefined),
    [activeSource]
  );
  const statusProp = useMemo<AVPlaybackStatusToSet | undefined>(
    () => resumeStatus ?? { rate: playbackRate, shouldCorrectPitch: true },
    [resumeStatus, playbackRate]
  );

  const scheduleAutoHide = useCallback(() => {
    if (!isPlayingRef.current || isScrubbingRef.current || errorRef.current) {
      return;
    }
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
    hideTimerRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, AUTO_HIDE_MS);
  }, []);

  const { isPiPSupported, isPiPActive, enterPiP, exitPiP } = usePictureInPicture({
    videoRef,
    isPlaying,
  });

  const handleSeek = useCallback(async (nextPosition: number) => {
    setSeekBarPreviewMillis(null);
    try {
      await videoRef.current?.setPositionAsync(nextPosition);
      setPositionMillis(nextPosition);
    } catch {
      // Ignore seek errors to keep UI responsive.
    }
  }, []);

  const handleGestureSeekStart = useCallback(() => {
    setControlsVisible(true);
  }, []);

  const handleGestureSeekEnd = useCallback(() => {
    scheduleAutoHide();
  }, [scheduleAutoHide]);

  const {
    panHandlers,
    onTap: handleGestureTap,
    isScrubbing: isGestureScrubbing,
    previewPositionMillis: gesturePreviewMillis,
  } = useVideoGestures({
    currentPositionMillis: positionMillis,
    durationMillis,
    containerWidth,
    onSeek: handleSeek,
    onSeekStart: handleGestureSeekStart,
    onSeekEnd: handleGestureSeekEnd,
    onTogglePlayPause: () => {
      togglePlayPause();
    },
  });

  const isScrubbing = isSeekBarScrubbing || isGestureScrubbing;
  const previewPositionMillis = seekBarPreviewMillis ?? gesturePreviewMillis;
  const controlsVisibleEffective = controlsVisible || isScrubbing || !!error;

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    isScrubbingRef.current = isScrubbing;
  }, [isScrubbing]);

  useEffect(() => {
    errorRef.current = error;
  }, [error]);

  const handleOverlayPress = useCallback(() => {
    setControlsVisible(true);
    handleGestureTap();
    scheduleAutoHide();
  }, [handleGestureTap, scheduleAutoHide]);

  const togglePlayPause = useCallback(async () => {
    const now = Date.now();
    if (now - lastToggleRef.current < 280) {
      return;
    }
    lastToggleRef.current = now;
    setControlsVisible(true);
    try {
      if (isPlaying) {
        await videoRef.current?.pauseAsync();
      } else {
        await videoRef.current?.playAsync();
      }
    } catch {
      // Ignore play/pause errors and allow UI to remain responsive.
    }
  }, [isPlaying]);

  const handleSelectQuality = useCallback(
    (qualityId: string) => {
      setControlsVisible(true);
      setSelectedQualityId(qualityId);
      scheduleAutoHide();
    },
    [scheduleAutoHide]
  );

  const handleChangeRate = useCallback(
    async (rate: number) => {
      setControlsVisible(true);
      setPlaybackRate(rate);
      try {
        await videoRef.current?.setRateAsync(rate, true);
      } catch {
        // Ignore rate errors.
      }
      scheduleAutoHide();
    },
    [scheduleAutoHide]
  );

  const handleTogglePiP = useCallback(() => {
    if (isPiPActive) {
      exitPiP();
    } else {
      enterPiP();
    }
  }, [enterPiP, exitPiP, isPiPActive]);

  const handleToggleFullscreen = useCallback(async () => {
    setControlsVisible(true);
    setIsLoading(true);
    try {
      const status = await videoRef.current?.getStatusAsync();
      if (status && status.isLoaded) {
        const resume: AVPlaybackStatusToSet = {
          positionMillis: status.positionMillis,
          shouldPlay: status.shouldPlay,
          rate: status.rate ?? playbackRate,
          shouldCorrectPitch: true,
        };
        resumeStatusRef.current = resume;
        setResumeStatus(resume);
      }
    } catch {
      // Ignore status capture errors.
    }
    setIsFullscreen(prev => !prev);
  }, [playbackRate]);

  const handlePlaybackStatusUpdate = useCallback(
    (status: AVPlaybackStatus) => {
      onPlaybackStatusUpdate?.(status);
      if (!status.isLoaded) {
        if (status.error) {
          setError(status.error);
          onError?.(status.error);
        }
        return;
      }
      if (autoPlay && !autoPlayHandledRef.current && !status.isPlaying && !status.isBuffering) {
        autoPlayHandledRef.current = true;
        videoRef.current?.playAsync().catch(() => {});
      }
      setError(null);
      setIsPlaying(status.isPlaying);
      setIsBuffering(status.isBuffering);
      setPositionMillis(status.positionMillis);
      setDurationMillis(status.durationMillis ?? 0);
      setBufferedMillis(status.playableDurationMillis ?? 0);
      if (status.rate != null) {
        setPlaybackRate(status.rate);
      }
      if (status.didJustFinish) {
        setControlsVisible(true);
      }
      if (resumeStatusRef.current && status.positionMillis != null) {
        const target = resumeStatusRef.current.positionMillis ?? 0;
        if (Math.abs(status.positionMillis - target) < 750) {
          resumeStatusRef.current = null;
          setResumeStatus(null);
          setIsSwitchingQuality(false);
        }
      }
      if (isSwitchingQuality && !status.isBuffering) {
        setIsSwitchingQuality(false);
      }
      if (!status.isBuffering) {
        setIsLoading(false);
      }
    },
    [autoPlay, isSwitchingQuality, onError, onPlaybackStatusUpdate]
  );

  useEffect(() => {
    if (controlsVisibleEffective) {
      scheduleAutoHide();
    }
    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, [controlsVisibleEffective, error, isPlaying, isScrubbing, scheduleAutoHide]);

  useEffect(() => {
    if (!isPlaying) {
      setControlsVisible(true);
    }
  }, [isPlaying]);

  useEffect(() => {
    autoPlayHandledRef.current = false;
  }, [autoPlay, activeSource?.id]);

  useEffect(() => {
    if (!enableBackgroundAudio) {
      return;
    }
    let previousMode: Awaited<ReturnType<typeof Audio.getAudioModeAsync>> | null = null;
    const configure = async () => {
      try {
        previousMode = await Audio.getAudioModeAsync();
        await Audio.setAudioModeAsync({
          ...previousMode,
          allowsRecordingIOS: false,
          interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DUCK_OTHERS,
          interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DUCK_OTHERS,
          playsInSilentModeIOS: false,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      } catch {
        // Ignore audio mode errors.
      }
    };
    configure();
    return () => {
      if (previousMode) {
        Audio.setAudioModeAsync(previousMode).catch(() => {});
      }
    };
  }, [enableBackgroundAudio]);

  useEffect(() => {
    let isMounted = true;
    const updateNetworkState = async () => {
      try {
        const state = await Network.getNetworkStateAsync();
        if (isMounted) {
          setNetworkType(deriveNetworkType(state));
        }
      } catch {
        // Ignore network errors.
      }
    };
    updateNetworkState();
    const subscription = Network.addNetworkStateListener(state => {
      setNetworkType(deriveNetworkType(state));
    });
    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!qualityOptions.some(option => option.id === selectedQualityId)) {
      setSelectedQualityId(AUTO_QUALITY_ID);
    }
  }, [qualityOptions, selectedQualityId]);

  const switchToSource = useCallback(
    async (nextSource: NormalizedVideoSource) => {
      if (activeSource && nextSource.id === activeSource.id) {
        return;
      }
      setIsSwitchingQuality(true);
      setIsLoading(true);
      try {
        const status = await videoRef.current?.getStatusAsync();
        if (status && status.isLoaded) {
          const resume: AVPlaybackStatusToSet = {
            positionMillis: status.positionMillis,
            shouldPlay: status.shouldPlay,
            rate: status.rate ?? playbackRate,
            shouldCorrectPitch: true,
          };
          resumeStatusRef.current = resume;
          setResumeStatus(resume);
        }
      } catch {
        // Ignore status capture errors.
      }
      setActiveSource(nextSource);
      onQualityChange?.(nextSource.id);
    },
    [activeSource, onQualityChange, playbackRate]
  );

  useEffect(() => {
    if (!normalizedSources.length) {
      return;
    }
    const nextSource = selectSourceById(normalizedSources, selectedQualityId, networkType);
    if (!nextSource) {
      return;
    }
    if (!activeSource) {
      setActiveSource(nextSource);
      return;
    }
    if (nextSource.id !== activeSource.id) {
      switchToSource(nextSource);
    }
  }, [activeSource, networkType, normalizedSources, selectedQualityId, switchToSource]);

  const handleSeekStart = useCallback(() => {
    setIsSeekBarScrubbing(true);
    setControlsVisible(true);
  }, []);

  const handleSeekPreview = useCallback((nextPosition: number) => {
    setSeekBarPreviewMillis(nextPosition);
  }, []);

  const handleSeekEnd = useCallback(() => {
    setIsSeekBarScrubbing(false);
    setSeekBarPreviewMillis(null);
    scheduleAutoHide();
  }, [scheduleAutoHide]);

  const renderPlayer = (fullscreen: boolean) => (
    <View style={fullscreen ? styles.fullscreenRoot : [styles.root, style]}>
      <View
        style={
          fullscreen
            ? styles.fullscreenVideoContainer
            : [styles.videoContainer, { aspectRatio: videoAspectRatio }]
        }
        onLayout={event => setContainerWidth(event.nativeEvent.layout.width)}
      >
        {videoSource ? (
          <Video
            ref={videoRef}
            source={videoSource}
            resizeMode={ResizeMode.CONTAIN}
            posterSource={posterUri ? { uri: posterUri } : undefined}
            usePoster={!!posterUri}
            onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
            onLoadStart={() => setIsLoading(true)}
            onReadyForDisplay={event => {
              const { width, height } = event.naturalSize;
              if (width > 0 && height > 0) {
                setVideoAspectRatio(width / height);
              }
              setIsLoading(false);
            }}
            onError={message => {
              setError(message);
              onError?.(message);
            }}
            progressUpdateIntervalMillis={250}
            status={statusProp}
            style={styles.video}
          />
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No video source available.</Text>
          </View>
        )}

        <Pressable style={styles.gestureOverlay} onPress={handleOverlayPress} {...panHandlers} />

        <VideoControls
          visible={controlsVisibleEffective}
          isPlaying={isPlaying}
          currentPositionMillis={positionMillis}
          durationMillis={durationMillis}
          bufferedPositionMillis={bufferedMillis}
          previewPositionMillis={previewPositionMillis}
          onPlayPause={togglePlayPause}
          onSeek={handleSeek}
          onSeekStart={handleSeekStart}
          onSeekEnd={handleSeekEnd}
          onSeekPreview={handleSeekPreview}
          playbackRate={playbackRate}
          rateOptions={rateOptions}
          onChangeRate={handleChangeRate}
          qualityOptions={qualityOptions}
          selectedQualityId={selectedQualityId}
          onSelectQuality={handleSelectQuality}
          onToggleFullscreen={handleToggleFullscreen}
          isFullscreen={fullscreen}
          onTogglePiP={handleTogglePiP}
          isPiPSupported={isPiPSupported}
          isPiPActive={isPiPActive}
          isBuffering={isBuffering}
          isLoading={isLoading}
          isSwitchingQuality={isSwitchingQuality}
        />

        {(isLoading || isBuffering || isSwitchingQuality) && (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <ActivityIndicator size="small" color="#fff" />
          </View>
        )}

        {error ? (
          <View style={styles.errorOverlay} pointerEvents="none">
            <Text style={styles.errorText}>Playback error. Please try again.</Text>
          </View>
        ) : null}
      </View>
    </View>
  );

  if (isFullscreen) {
    return (
      <ErrorBoundary boundaryName="MobileVideoPlayer.FullscreenModal">
        <Modal
          visible
          animationType="fade"
          supportedOrientations={['portrait', 'landscape']}
          onRequestClose={handleToggleFullscreen}
        >
          {renderPlayer(true)}
        </Modal>
      </ErrorBoundary>
    );
  }

  return renderPlayer(false);
};

const styles = StyleSheet.create({
  root: {
    width: '100%',
    backgroundColor: '#000',
  },
  fullscreenRoot: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoContainer: {
    width: '100%',
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenVideoContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    ...StyleSheet.absoluteFillObject,
  },
  gestureOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  errorText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 14,
  },
  emptyState: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#fff',
    fontSize: 14,
  },
});

export default MobileVideoPlayer;
