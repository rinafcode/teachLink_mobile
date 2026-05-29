import { activateKeepAwake, deactivateKeepAwake } from 'expo-keep-awake';
import { useVideoPlayer, VideoPlayerStatus, VideoSource, VideoView } from 'expo-video';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleProp, Text, View, ViewStyle } from 'react-native';

import { useVideoMetrics } from '@/hooks/useVideoMetrics';
import { appLogger } from '@/utils/logger';

export interface OptimizedVideoPlayerProps {
  uri: string;
  autoPlay?: boolean;
  onError?: (error: string) => void;
  style?: StyleProp<ViewStyle>;
}

const bufferOptions = {
  preferredForwardBufferDuration: 30, // seconds to buffer ahead
  minBufferForPlayback: 2.5, // seconds needed before playback starts
};

const errorMessageForStatus = (status: VideoPlayerStatus, errorMessage?: string) => {
  if (status === 'error') {
    return errorMessage ?? 'Video playback failed.';
  }
  return undefined;
};

const OptimizedVideoPlayer = ({
  uri,
  autoPlay = false,
  onError,
  style,
}: OptimizedVideoPlayerProps) => {
  const [isBuffering, setIsBuffering] = useState(true);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  const {
    metrics,
    recordBufferingStart,
    recordBufferingEnd,
    recordLoadComplete,
    recordError,
    resetMetrics,
  } = useVideoMetrics();

  const source = useMemo<VideoSource>(() => ({ uri, contentType: 'auto' }), [uri]);

  const player = useVideoPlayer(source, videoPlayer => {
    videoPlayer.keepScreenOnWhilePlaying = true;
    videoPlayer.bufferOptions = bufferOptions;

    if (autoPlay) {
      videoPlayer.play?.();
    }
  });

  const handleStatusChange = useCallback(
    ({ status, error }: { status: VideoPlayerStatus; error?: { message: string } }) => {
      setIsBuffering(status === 'loading');

      if (status === 'loading') {
        recordBufferingStart();
      } else {
        recordBufferingEnd();
      }

      if (status === 'readyToPlay') {
        recordLoadComplete();
      }

      const errorMessage = errorMessageForStatus(status, error?.message);
      if (errorMessage) {
        setPlaybackError(errorMessage);
        recordError(errorMessage);
        onError?.(errorMessage);
      }

      if (status === 'readyToPlay' && !errorMessage) {
        appLogger.debug('OptimizedVideoPlayer ready to play', { uri });
      }
    },
    [onError, recordBufferingEnd, recordBufferingStart, recordError, recordLoadComplete, uri]
  );

  useEffect(() => {
    activateKeepAwake();
    return () => {
      deactivateKeepAwake();
    };
  }, []);

  useEffect(() => {
    const subscription = player?.addListener('statusChange', handleStatusChange);

    return () => {
      subscription?.remove();
      try {
        player?.release();
      } catch (error) {
        appLogger.error('Failed to release video player', { error });
      }
    };
  }, [player, handleStatusChange]);

  useEffect(() => {
    resetMetrics();
  }, [uri, resetMetrics]);

  const VideoMetricsComponent = useMemo(() => {
    if (!__DEV__) {
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const module = require('./VideoPlayerMetrics');
    return module?.default ?? null;
  }, []);

  const renderError = () => {
    if (!playbackError) {
      return null;
    }

    return (
      <View
        className="absolute inset-0 items-center justify-center bg-black/80 p-4"
        pointerEvents="box-none"
      >
        <Text className="text-center text-base font-semibold text-white">Playback failed</Text>
        <Text className="mt-2 text-center text-sm text-white/80">{playbackError}</Text>
      </View>
    );
  };

  return (
    <View className="relative overflow-hidden rounded-2xl bg-black" style={style}>
      <VideoView className="h-full w-full" player={player} nativeControls={true} />
      {isBuffering && !playbackError ? (
        <View className="absolute inset-0 items-center justify-center bg-black/40">
          <ActivityIndicator size="large" color="#ffffff" testID="video-buffering-indicator" />
        </View>
      ) : null}
      {renderError()}
      {VideoMetricsComponent ? <VideoMetricsComponent metrics={metrics} /> : null}
    </View>
  );
};
export { OptimizedVideoPlayer as default };
