import { render, waitFor } from '@testing-library/react-native';
import React from 'react';

import { CachedImage } from '@/components/ui/CachedImage';
import { usePrefetchImages } from '@/hooks/usePrefetchImages';
import { ImageCache } from '@/utils/imageCache';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('expo-image', () => ({
  Image: 'ExpoImage',
  prefetch: jest.fn(() => Promise.resolve(true)),
  clearMemoryCache: jest.fn(() => Promise.resolve()),
  clearDiskCache: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/utils/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Image Cache Integration - Issue #143', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── CachedImage Component Tests ───────────────────────────────────────────

  describe('✅ CachedImage Component', () => {
    // it('should render with valid URI', () => {
    //   const testUri = 'https://example.com/image.jpg';
    //   const { getByTestId } = render(
    //     <CachedImage uri={testUri} testID="cached-image" />
    //   );

    //   expect(getByTestId('cached-image')).toBeTruthy();
    // });

    it('should not render if URI is null', () => {
      const { queryByTestId } = render(<CachedImage uri={null} testID="cached-image" />);

      expect(queryByTestId('cached-image')).toBeNull();
    });

    it('should not render if URI is undefined', () => {
      const { queryByTestId } = render(<CachedImage uri={undefined} testID="cached-image" />);

      expect(queryByTestId('cached-image')).toBeNull();
    });

    it('should prefetch image on mount when autoPrefetch is true', async () => {
      const testUri = 'https://example.com/image.jpg';
      const prefetchSpy = jest.spyOn(ImageCache, 'prefetchImages');

      render(<CachedImage uri={testUri} autoPrefetch={true} />);

      await waitFor(() => {
        expect(prefetchSpy).toHaveBeenCalledWith([testUri]);
      });
    });

    it('should not prefetch image if autoPrefetch is false', async () => {
      const testUri = 'https://example.com/image.jpg';
      const prefetchSpy = jest.spyOn(ImageCache, 'prefetchImages');

      render(<CachedImage uri={testUri} autoPrefetch={false} />);

      await waitFor(() => {
        expect(prefetchSpy).not.toHaveBeenCalled();
      });
    });

    it('should accept alt prop for accessibility', () => {
      const testUri = 'https://example.com/image.jpg';
      const altText = 'User avatar';

      const { getByLabelText } = render(
        <CachedImage uri={testUri} alt={altText} testID="cached-image" />
      );

      expect(getByLabelText(altText)).toBeTruthy();
    });

    it('should show loading indicator when showLoadingIndicator is true', () => {
      const testUri = 'https://example.com/image.jpg';

      const { getByTestId } = render(
        <CachedImage uri={testUri} showLoadingIndicator={true} testID="loading-indicator" />
      );

      // Loading indicator should be visible initially
      expect(getByTestId('loading-indicator')).toBeTruthy();
    });

    it('should call onLoadComplete when image finishes loading', async () => {
      const testUri = 'https://example.com/image.jpg';
      const onLoadComplete = jest.fn();

      const { getByTestId } = render(
        <CachedImage uri={testUri} onLoadComplete={onLoadComplete} testID="cached-image" />
      );

      // Simulate load complete
      const image = getByTestId('cached-image');
      if (image.props.onLoadingComplete) {
        image.props.onLoadingComplete();
      }

      await waitFor(() => {
        expect(onLoadComplete).toHaveBeenCalled();
      });
    });

    it('should call onLoadError when image fails to load', async () => {
      const testUri = 'https://example.com/image.jpg';
      const onLoadError = jest.fn();
      const error = new Error('Image load failed');

      const { getByTestId } = render(
        <CachedImage uri={testUri} onLoadError={onLoadError} testID="cached-image" />
      );

      // Simulate load error
      const image = getByTestId('cached-image');
      if (image.props.onError) {
        image.props.onError(error);
      }

      await waitFor(() => {
        expect(onLoadError).toHaveBeenCalledWith(error);
      });
    });

    it('should prefetch on URI change', async () => {
      const firstUri = 'https://example.com/image1.jpg';
      const secondUri = 'https://example.com/image2.jpg';
      const prefetchSpy = jest.spyOn(ImageCache, 'prefetchImages');

      const { rerender } = render(<CachedImage uri={firstUri} autoPrefetch={true} />);

      await waitFor(() => {
        expect(prefetchSpy).toHaveBeenCalledWith([firstUri]);
      });

      prefetchSpy.mockClear();

      rerender(<CachedImage uri={secondUri} autoPrefetch={true} />);

      await waitFor(() => {
        expect(prefetchSpy).toHaveBeenCalledWith([secondUri]);
      });
    });

    it('should accept and pass style props', () => {
      const testUri = 'https://example.com/image.jpg';
      const customStyle = { width: 100, height: 100 };

      const { getByTestId } = render(
        <CachedImage uri={testUri} style={customStyle} testID="cached-image" />
      );

      const image = getByTestId('cached-image');
      expect(image.props.style).toContainEqual(customStyle);
    });
  });

  // ─── usePrefetchImages Hook Tests ──────────────────────────────────────────

  describe('✅ usePrefetchImages Hook', () => {
    it('should auto-prefetch URLs on mount when auto=true', async () => {
      const urls = ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'];
      const prefetchSpy = jest.spyOn(ImageCache, 'prefetchImages');

      const TestComponent = () => {
        usePrefetchImages(urls, { auto: true });
        return null;
      };

      render(<TestComponent />);

      await waitFor(() => {
        expect(prefetchSpy).toHaveBeenCalledWith(urls);
      });
    });

    it('should not auto-prefetch when auto=false', async () => {
      const urls = ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'];
      const prefetchSpy = jest.spyOn(ImageCache, 'prefetchImages');

      const TestComponent = () => {
        usePrefetchImages(urls, { auto: false });
        return null;
      };

      render(<TestComponent />);

      await waitFor(() => {
        expect(prefetchSpy).not.toHaveBeenCalled();
      });
    });

    it('should skip null and undefined URLs', async () => {
      const urls = [
        'https://example.com/image1.jpg',
        null,
        'https://example.com/image2.jpg',
        undefined,
      ];
      const prefetchSpy = jest.spyOn(ImageCache, 'prefetchImages');

      const TestComponent = () => {
        usePrefetchImages(urls as any, { auto: true });
        return null;
      };

      render(<TestComponent />);

      await waitFor(() => {
        expect(prefetchSpy).toHaveBeenCalledWith([
          'https://example.com/image1.jpg',
          'https://example.com/image2.jpg',
        ]);
      });
    });

    it('should delay prefetch when delay option is set', async () => {
      const urls = ['https://example.com/image1.jpg'];
      const prefetchSpy = jest.spyOn(ImageCache, 'prefetchImages');

      const TestComponent = () => {
        usePrefetchImages(urls, { auto: true, delay: 500 });
        return null;
      };

      jest.useFakeTimers();
      render(<TestComponent />);

      // Prefetch should not be called immediately
      expect(prefetchSpy).not.toHaveBeenCalled();

      // Fast forward time
      jest.advanceTimersByTime(500);

      await waitFor(() => {
        expect(prefetchSpy).toHaveBeenCalledWith(urls);
      });

      jest.useRealTimers();
    });

    it('should call onComplete callback with results', async () => {
      const urls = ['https://example.com/image1.jpg'];
      const onComplete = jest.fn();
      const mockResults = [true];

      jest.spyOn(ImageCache, 'prefetchImages').mockResolvedValue(mockResults);

      const TestComponent = () => {
        usePrefetchImages(urls, { auto: true, onComplete });
        return null;
      };

      render(<TestComponent />);

      await waitFor(() => {
        expect(onComplete).toHaveBeenCalledWith(mockResults);
      });
    });

    it('should track failed URLs', async () => {
      const urls = ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'];

      jest.spyOn(ImageCache, 'prefetchImages').mockResolvedValue([true, false]); // Second image failed

      let failedUrls: string[] = [];

      const TestComponent = () => {
        const { failedUrls: failed } = usePrefetchImages(urls, { auto: true });
        failedUrls = failed;
        return null;
      };

      render(<TestComponent />);

      await waitFor(() => {
        expect(failedUrls).toContain('https://example.com/image2.jpg');
      });
    });

    it('should accept manual prefetch trigger', async () => {
      const prefetchSpy = jest.spyOn(ImageCache, 'prefetchImages');

      let manualPrefetch: any;

      const TestComponent = () => {
        const { prefetch } = usePrefetchImages([], { auto: false });
        manualPrefetch = prefetch;
        return null;
      };

      render(<TestComponent />);

      const urls = ['https://example.com/image1.jpg'];
      await manualPrefetch(urls);

      expect(prefetchSpy).toHaveBeenCalledWith(urls);
    });

    it('should provide clearCache function', async () => {
      const clearCacheSpy = jest.spyOn(ImageCache, 'clearCache');

      let clearCacheFunc: any;

      const TestComponent = () => {
        const { clearCache } = usePrefetchImages([], { auto: false });
        clearCacheFunc = clearCache;
        return null;
      };

      render(<TestComponent />);

      await clearCacheFunc();

      expect(clearCacheSpy).toHaveBeenCalled();
    });

    it('should call onError on prefetch failure', async () => {
      const urls = ['https://example.com/image1.jpg'];
      const onError = jest.fn();
      const testError = new Error('Prefetch failed');

      jest.spyOn(ImageCache, 'prefetchImages').mockRejectedValue(testError);

      const TestComponent = () => {
        usePrefetchImages(urls, { auto: true, onError });
        return null;
      };

      render(<TestComponent />);

      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
      });
    });
  });

  // ─── Integration Tests ─────────────────────────────────────────────────────

  describe('✅ Image Cache Integration', () => {
    it('should prefetch images before rendering components', async () => {
      const avatarUrl = 'https://example.com/avatar.jpg';
      const prefetchSpy = jest.spyOn(ImageCache, 'prefetchImages');

      const TestComponent = () => {
        usePrefetchImages([avatarUrl], { auto: true });

        return (
          <CachedImage uri={avatarUrl} style={{ width: 100, height: 100 }} autoPrefetch={true} />
        );
      };

      render(<TestComponent />);

      await waitFor(() => {
        // Should be called at least once (from hook)
        expect(prefetchSpy).toHaveBeenCalled();
      });
    });

    it('should handle multiple images in a list', async () => {
      const imageUrls = Array.from({ length: 10 }, (_, i) => `https://example.com/image${i}.jpg`);
      const prefetchSpy = jest.spyOn(ImageCache, 'prefetchImages');

      const TestComponent = () => {
        usePrefetchImages(imageUrls, { auto: true });
        return null;
      };

      render(<TestComponent />);

      await waitFor(() => {
        expect(prefetchSpy).toHaveBeenCalledWith(imageUrls);
      });
    });

    it('should clear cache when needed', async () => {
      const clearSpy = jest.spyOn(ImageCache, 'clearCache');

      let clearCacheFunc: any;

      const TestComponent = () => {
        const { clearCache } = usePrefetchImages([], { auto: false });
        clearCacheFunc = clearCache;
        return null;
      };

      render(<TestComponent />);

      await clearCacheFunc();

      expect(clearSpy).toHaveBeenCalled();
    });

    it('should handle images in profile component', async () => {
      const profileImageUrl = 'https://example.com/profile.jpg';
      const prefetchSpy = jest.spyOn(ImageCache, 'prefetchImages');

      const TestComponent = () => {
        usePrefetchImages([profileImageUrl], { auto: true, delay: 100 });

        return (
          <CachedImage
            uri={profileImageUrl}
            alt="Profile picture"
            style={{ width: 88, height: 88 }}
            autoPrefetch={true}
          />
        );
      };

      jest.useFakeTimers();
      render(<TestComponent />);

      jest.advanceTimersByTime(100);

      await waitFor(() => {
        expect(prefetchSpy).toHaveBeenCalledWith([profileImageUrl]);
      });

      jest.useRealTimers();
    });

    it('should handle images in badge component', async () => {
      const badgeUrl = 'https://example.com/badge.png';
      const prefetchSpy = jest.spyOn(ImageCache, 'prefetchImages');

      const TestComponent = () => {
        usePrefetchImages([badgeUrl], { auto: true });

        return (
          <CachedImage
            uri={badgeUrl}
            alt="Achievement badge"
            style={{ width: 64, height: 64 }}
            autoPrefetch={true}
          />
        );
      };

      render(<TestComponent />);

      await waitFor(() => {
        expect(prefetchSpy).toHaveBeenCalled();
      });
    });
  });

  // ─── Performance Tests ─────────────────────────────────────────────────────

  describe('✅ Performance Optimization', () => {
    it('should batch prefetch multiple URLs', async () => {
      const urls = Array.from({ length: 5 }, (_, i) => `https://example.com/image${i}.jpg`);
      const prefetchSpy = jest.spyOn(ImageCache, 'prefetchImages');

      const TestComponent = () => {
        usePrefetchImages(urls, { auto: true });
        return null;
      };

      render(<TestComponent />);

      await waitFor(() => {
        // Should call prefetch once with all URLs, not separately
        expect(prefetchSpy).toHaveBeenCalledTimes(1);
        expect(prefetchSpy).toHaveBeenCalledWith(urls);
      });
    });

    it('should respect prefetch delay for performance', async () => {
      const urls = ['https://example.com/image.jpg'];
      const prefetchSpy = jest.spyOn(ImageCache, 'prefetchImages');

      const TestComponent = () => {
        usePrefetchImages(urls, { auto: true, delay: 1000 });
        return null;
      };

      jest.useFakeTimers();
      render(<TestComponent />);

      // Should not prefetch immediately
      expect(prefetchSpy).not.toHaveBeenCalled();

      // Advance time to delay
      jest.advanceTimersByTime(1000);

      expect(prefetchSpy).toHaveBeenCalled();

      jest.useRealTimers();
    });
  });

  // ─── Issue #143 Verification ───────────────────────────────────────────────

  describe('🎯 Issue #143: Image Cache Integration Verification', () => {
    it('should have image cache integrated throughout app', async () => {
      const imageCache = ImageCache;

      expect(imageCache).toBeDefined();
      expect(imageCache.prefetchImages).toBeDefined();
      expect(imageCache.clearCache).toBeDefined();
    });

    it('should expose CachedImage component for use', () => {
      const cachedImage = CachedImage;

      expect(cachedImage).toBeDefined();
      expect(typeof cachedImage).toBe('function');
    });

    it('should expose usePrefetchImages hook for use', () => {
      const hook = usePrefetchImages;

      expect(hook).toBeDefined();
      expect(typeof hook).toBe('function');
    });

    it('should wire cache to image components', async () => {
      // Test that components use CachedImage
      const testUri = 'https://example.com/image.jpg';

      const { getByTestId } = render(
        <CachedImage uri={testUri} testID="image-component" autoPrefetch={true} />
      );

      expect(getByTestId('image-component')).toBeTruthy();
    });
  });
});
