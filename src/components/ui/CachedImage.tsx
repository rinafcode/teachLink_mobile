import { Image as ExpoImage, ImageProps as ExpoImageProps } from 'expo-image';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { ImageCache } from '../../utils/imageCache';
import logger from '../../utils/logger';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CachedImageProps extends Omit<ExpoImageProps, 'source'> {
  /** Image source URI */
  uri: string | null | undefined;
  /** Alternative text for accessibility */
  alt?: string;
  /** Show loading indicator while image loads */
  showLoadingIndicator?: boolean;
  /** Automatically prefetch image on mount */
  autoPrefetch?: boolean;
  /** Callback when image finishes loading */
  onLoadComplete?: () => void;
  /** Callback when image fails to load */
  onLoadError?: (error: Error) => void;
  /** Loading indicator color */
  loadingIndicatorColor?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * CachedImage Component
 * 
 * Wraps expo-image's Image component with automatic caching and prefetching.
 * Provides performance optimization for image-heavy screens.
 * 
 * Features:
 * - Automatic image prefetching via ImageCache
 * - Loading state management
 * - Error handling
 * - Accessibility support
 * - Optional loading indicator
 * 
 * @example
 * ```tsx
 * <CachedImage
 *   uri={user.avatarUrl}
 *   alt="User avatar"
 *   style={{ width: 100, height: 100 }}
 *   autoPrefetch={true}
 *   onLoadComplete={() => console.log('Image loaded')}
 * />
 * ```
 */
export const CachedImage: React.FC<CachedImageProps> = ({
  uri,
  alt,
  showLoadingIndicator = true,
  autoPrefetch = true,
  onLoadComplete,
  onLoadError,
  loadingIndicatorColor = '#2c8aec',
  style,
  ...expoImageProps
}) => {
  const [isLoading, setIsLoading] = useState(!!uri);
  const [error, setError] = useState<Error | null>(null);

  // ─── Prefetch image on mount or when URI changes ──────────────────────────

  useEffect(() => {
    if (!uri) {
      setIsLoading(false);
      return;
    }

    if (autoPrefetch) {
      setIsLoading(true);
      ImageCache.prefetchImages([uri])
        .then(() => {
          logger.debug(`✅ Image prefetched: ${uri}`);
        })
        .catch((e) => {
          logger.warn(`Failed to prefetch image: ${uri}`, e);
          setError(e instanceof Error ? e : new Error(String(e)));
          onLoadError?.(e instanceof Error ? e : new Error(String(e)));
        });
    }
  }, [uri, autoPrefetch, onLoadError]);

  // ─── Handle loading complete ───────────────────────────────────────────────

  const handleLoadingComplete = () => {
    setIsLoading(false);
    setError(null);
    onLoadComplete?.();
    logger.debug(`✅ CachedImage rendered: ${uri}`);
  };

  // ─── Handle loading error ──────────────────────────────────────────────────

  const handleError = (e: any) => {
    const error = e instanceof Error ? e : new Error(String(e));
    setIsLoading(false);
    setError(error);
    onLoadError?.(error);
    logger.warn(`Failed to load image: ${uri}`, error);
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  if (!uri) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      <ExpoImage
        source={{ uri }}
        onLoadingComplete={handleLoadingComplete}
        onError={handleError}
        accessibilityLabel={alt}
        accessibilityRole="image"
        {...expoImageProps}
        style={[styles.image, style]}
      />

      {/* Loading indicator overlay */}
      {isLoading && showLoadingIndicator && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={loadingIndicatorColor} />
        </View>
      )}
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
});

export default CachedImage;
