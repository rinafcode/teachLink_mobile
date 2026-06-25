import { Image as ExpoImage, ImageProps as ExpoImageProps } from 'expo-image';
import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ImageStyle,
  PixelRatio,
  StyleProp,
  StyleSheet,
  View,
} from 'react-native';

import { imagePerformanceService } from '../../services/imagePerformance';
import { useSettingsStore } from '../../store/settingsStore';
import { ImageCache } from '../../utils/imageCache';
import { buildOptimizedImageSources } from '../../utils/imageOptimization';
import { logger } from '../../utils/logger';

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
  /** Desired image width in layout units for adaptive 1x/2x/3x variants */
  targetWidth?: number;
  /** Desired image height in layout units for adaptive 1x/2x/3x variants */
  targetHeight?: number;
}

function resolveStyleDimension(
  style: StyleProp<ImageStyle>,
  key: 'width' | 'height'
): number | undefined {
  const flattened = StyleSheet.flatten(style) as ImageStyle | undefined;
  const value = flattened?.[key];
  return typeof value === 'number' ? value : undefined;
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
const CachedImageComponent: React.FC<CachedImageProps> = ({
  uri,
  alt,
  showLoadingIndicator = true,
  autoPrefetch = true,
  onLoadComplete,
  onLoadError,
  loadingIndicatorColor = '#2c8aec',
  targetWidth,
  targetHeight,
  style,
  ...expoImageProps
}) => {
  const dataSaverEnabled = useSettingsStore(state => state.dataSaverEnabled);
  const startedAtRef = useRef<number | null>(null);
  const usingFallbackRef = useRef(false);

  const styleWidth = resolveStyleDimension(style as StyleProp<ImageStyle>, 'width');
  const styleHeight = resolveStyleDimension(style as StyleProp<ImageStyle>, 'height');

  const resolvedUri = dataSaverEnabled && uri ? getLowQualityImageUrl(uri) : uri;
  const optimizedSources = useMemo(() => {
    if (!resolvedUri) {
      return null;
    }

    return buildOptimizedImageSources(resolvedUri, {
      width: targetWidth ?? styleWidth,
      height: targetHeight ?? styleHeight,
      pixelRatio: PixelRatio.get(),
      quality: dataSaverEnabled ? 45 : 72,
      lqipQuality: dataSaverEnabled ? 12 : 18,
      preferWebp: true,
    });
  }, [resolvedUri, targetWidth, targetHeight, styleWidth, styleHeight, dataSaverEnabled]);

  // These were part of a dimension-detection feature that was removed;
  // kept as undefined so the JSX guards below remain falsy without ReferenceError.
  const aspectRatioStyle: undefined = undefined;
  const detectedDimensions: undefined = undefined;

  const [isLoading, setIsLoading] = useState(!!resolvedUri);
  const [, setError] = useState<Error | null>(null);

  // ─── Prefetch image on mount or when URI changes ──────────────────────────

  useEffect(() => {
    if (!optimizedSources) {
      setIsLoading(false);
      return;
    }

    if (autoPrefetch && !dataSaverEnabled) {
      setIsLoading(true);
      ImageCache.prefetchImages([optimizedSources.primaryUri])
        .then(() => {
          logger.debug(`✅ Image prefetched: ${optimizedSources.primaryUri}`);
        })
        .catch(e => {
          logger.warn(`Failed to prefetch image: ${optimizedSources.primaryUri}`, e);
          setError(e instanceof Error ? e : new Error(String(e)));
          onLoadError?.(e instanceof Error ? e : new Error(String(e)));
        });
    } else {
      setIsLoading(true);
    }
  }, [optimizedSources, autoPrefetch, dataSaverEnabled, onLoadError]);

  // ─── Handle loading complete ───────────────────────────────────────────────

  const handleLoadingComplete = () => {
    setIsLoading(false);
    setError(null);

    const startedAt = startedAtRef.current;
    if (startedAt) {
      imagePerformanceService.recordImageLoad({
        loadTimeMs: Date.now() - startedAt,
        usedFallback: usingFallbackRef.current,
        dpr: optimizedSources?.dpr ?? 1,
      });
    }

    onLoadComplete?.();
    logger.debug(`✅ CachedImage rendered: ${optimizedSources?.primaryUri}`);
  };

  // ─── Handle loading error ──────────────────────────────────────────────────

  const handleError = (e: any) => {
    const error = e instanceof Error ? e : new Error(String(e));
    setIsLoading(false);
    setError(error);
    onLoadError?.(error);
    logger.warn(`Failed to load image: ${optimizedSources?.primaryUri}`, error);
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

  if (!optimizedSources) {
    return null;
  }

  return (
    <View style={getContainerStyle()}>
      <ExpoImage
        source={[{ uri: optimizedSources.primaryUri }, { uri: optimizedSources.fallbackUri }]}
        placeholder={{ uri: optimizedSources.lqipUri }}
        transition={250}
        onLoadStart={() => {
          startedAtRef.current = Date.now();
          usingFallbackRef.current = false;
        }}
        onLoadingComplete={handleLoadingComplete}
        onError={handleError}
        accessibilityLabel={alt}
        accessibilityRole="image"
        {...expoImageProps}
        style={[
          styles.image,
          aspectRatioStyle ? { aspectRatio: detectedDimensions?.aspectRatio } : null,
          style,
        ]}
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

export const CachedImage = memo(CachedImageComponent);
export default CachedImage;
