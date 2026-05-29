import { StyleSheet, Text, View } from 'react-native';

import type { VideoMetrics } from '../../hooks/useVideoMetrics';

interface VideoPlayerMetricsProps {
  metrics: VideoMetrics;
}

const VideoPlayerMetrics = ({ metrics }: VideoPlayerMetricsProps) => {
  if (!__DEV__) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Video Metrics</Text>
      <Text style={styles.text}>Load: {metrics.loadTime}ms</Text>
      <Text style={styles.text}>Buffers: {metrics.bufferingCount}</Text>
      <Text style={styles.text}>Buffered: {metrics.totalBufferingTime}ms</Text>
      <Text style={styles.text}>Errors: {metrics.playbackErrors}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 12,
    top: 12,
    zIndex: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  text: {
    color: '#ffffff',
    fontSize: 11,
    lineHeight: 16,
  },
});

export default VideoPlayerMetrics;
