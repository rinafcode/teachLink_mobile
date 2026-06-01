import { Image as ExpoImage, ImageProps as ExpoImageProps } from 'expo-image';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useSettingsStore } from '../../store/settingsStore';
import { ImageCache } from '../../utils/imageCache';
import { 
  detectImageDimensions, 
  ImageDimensions, 
  dimensionsCache,
  calculateAspectRatioStyle 
} from '../../utils/imageDimensions';
import logger from '../../utils/logger';

// ─── Helper ───────────────────────────────────────────────────────────────────

export function getLowQualityImageUrl(uri: string): string {
  if (!uri) return uri;
  // Replace @2x or @3x with @1x
  let optimized = uri.replace(/@[23]x\b/g, '@1x');
  
  if (optimized.startsWith('http://') || optimized.startsWith('https://')) {
    const hashParts = optimized.split('#');
    let baseAndQuery = hashParts[0];
    const hash = hashParts[1] ? `#${hashParts[1]}` : '';
    
    const queryParts = baseAndQuery.split('?');
    let baseUrl = queryParts[0];
    let query = queryParts[1] || '';
    
    const params = new Map<string, string>();
    if (query) {
      query.split('&').forEach(pair => {
        const [k, v] = pair.split('=');
        if (k) params.set(decodeURIComponent(k), v ? decodeURIComponent(v) : '');
      });
    }
    
    params.set('quality', 'low');
    params.set('q', '30');
    
    const newQuery = Array.from(params.entries())
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
      
    optimized = `${baseUrl}?${newQuery}${hash}`;
  }
  return optimized;
}

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
  /** Pre-known image dimensions (from API) */
  knownDimensions?: ImageDimensions;
  /** Enable automatic dimension detection to prevent layout shift */
  enableDimensionDetection?: boolean;
  /** Container width for aspect ratio calculation */
  containerWidth?: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * CachedImage Component
 *
 * Wraps expo-image's Image component with automatic caching, prefetching, and dimension detection.
 * Provides performance optimization for image-heavy screens.
 *
 * Features:
 * - Automatic image prefetching via ImageCache
 * - Loading state management
 * - Error handling
 * - Accessibility support
 * - Optional loading indicator
 * - Automatic dimension detection to prevent layout shift
 * - Aspect ratio preservation
 *
 * @example
 * ```tsx
 * <CachedImage
 *   uri={user.avatarUrl}
 *   alt="User avatar"
 *   style={{ width: 100, height: 100 }}
 *   autoPrefetch={true}
 *   enableDimensionDetection={true}
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
  knownDimensions,
  enableDimensionDetection = false,
  containerWidth,
  style,
  ...expoImageProps
}) => {
  const dataSaverEnabled = useSettingsStore(state => state.dataSaverEnabled);
  const resolvedUri = dataSaverEnabled && uri ? getLowQualityImageUrl(uri) : uri;

  const [isLoading, setIsLoading] = useState(!!resolvedUri);
  const [error, setError] = useState<Error | null>(null);
  const [detectedDimensions, setDetectedDimensions] = useState<ImageDimensions | null>(knownDimensions || null);
  const [aspectRatioStyle, setAspectRatioStyle] = useState<{ width: number; height: number } | null>(null);

  // ─── Detect dimensions if enabled and not already known ─────────────────────

  useEffect(() => {
    if (!resolvedUri || !enableDimensionDetection || detectedDimensions) {
      return;
    }

    // Check cache first
    if (dimensionsCache.has(resolvedUri)) {
      const cached = dimensionsCache.get(resolvedUri);
      if (cached) {
        setDetectedDimensions(cached);
        if (containerWidth) {
          setAspectRatioStyle(calculateAspectRatioStyle(cached, containerWidth));
        }
        return;
      }

      // Detect dimensions
      detectImageDimensions(resolvedUri).then(dimensions => {
        if (dimensions) {
          setDetectedDimensions(dimensions);
          dimensionsCache.set(resolvedUri, dimensions);
          if (containerWidth) {
            setAspectRatioStyle(calculateAspectRatioStyle(dimensions, containerWidth));
          }
        }
      });
    }
  }, [resolvedUri, enableDimensionDetection, detectedDimensions, containerWidth]);

  // ─── Prefetch image on mount or when URI changes ──────────────────────────

  useEffect(() => {
    if (!resolvedUri) {
      setIsLoading(false);
      return;
    }

    if (autoPrefetch && !dataSaverEnabled) {
      setIsLoading(true);
      ImageCache.prefetchImages([resolvedUri])
        .then(() => {
          logger.debug(`✅ Image prefetched: ${resolvedUri}`);
        })
        .catch(e => {
          logger.warn(`Failed to prefetch image: ${resolvedUri}`, e);
          setError(e instanceof Error ? e : new Error(String(e)));
          onLoadError?.(e instanceof Error ? e : new Error(String(e)));
        });
    } else {
      setIsLoading(true);
    }
  }, [resolvedUri, autoPrefetch, dataSaverEnabled, onLoadError]);

  // ─── Handle loading complete ───────────────────────────────────────────────

  const handleLoadingComplete = () => {
    setIsLoading(false);
    setError(null);
    onLoadComplete?.();
    logger.debug(`✅ CachedImage rendered: ${resolvedUri}`);
  };

  // ─── Handle loading error ──────────────────────────────────────────────────

  const handleError = (e: any) => {
    const error = e instanceof Error ? e : new Error(String(e));
    setIsLoading(false);
    setError(error);
    onLoadError?.(error);
    logger.warn(`Failed to load image: ${resolvedUri}`, error);
  };

  // ─── Calculate container style with aspect ratio ─────────────────────────

  const getContainerStyle = () => {
    if (aspectRatioStyle) {
      return [
        styles.container,
        {
          width: aspectRatioStyle.width,
          height: aspectRatioStyle.height,
        },
        style,
      ];
    }
    return [styles.container, style];
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  if (!resolvedUri) {
    return null;
  }

  return (
    <View style={getContainerStyle()}>
      <ExpoImage
        source={{ uri: resolvedUri }}
        onLoadingComplete={handleLoadingComplete}
        onError={handleError}
        accessibilityLabel={alt}
        accessibilityRole="image"
        {...expoImageProps}
        style={[styles.image, aspectRatioStyle ? { aspectRatio: detectedDimensions?.aspectRatio } : null, style]}
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
