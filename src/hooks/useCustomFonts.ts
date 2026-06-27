import { Asset } from 'expo-asset';
import { loadAsync } from 'expo-font';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

// Font configuration
export interface FontConfig {
  name: string;
  source: string | number;
  display?: 'swap' | 'fallback' | 'optional' | 'block';
}

// Font loading status
export interface FontLoadingStatus {
  loaded: boolean;
  error: Error | null;
  progress: number;
}

// Predefined font configurations
export const FONT_CONFIGS: Record<string, FontConfig> = {
  Inter: {
    name: 'Inter',
    source: require('../../assets/fonts/Inter-Regular.ttf'),
    display: 'swap',
  },
  'Inter-Bold': {
    name: 'Inter-Bold',
    source: require('../../assets/fonts/Inter-Bold.ttf'),
    display: 'swap',
  },
  'Inter-Medium': {
    name: 'Inter-Medium',
    source: require('../../assets/fonts/Inter-Medium.ttf'),
    display: 'swap',
  },
  'Inter-SemiBold': {
    name: 'Inter-SemiBold',
    source: require('../../assets/fonts/Inter-SemiBold.ttf'),
    display: 'swap',
  },
};

// Font cache management
class FontCache {
  private cache: Map<string, boolean> = new Map();
  private loading: Map<string, Promise<boolean>> = new Map();

  isLoaded(fontName: string): boolean {
    return this.cache.get(fontName) || false;
  }

  isLoading(fontName: string): boolean {
    return this.loading.has(fontName);
  }

  setLoaded(fontName: string): void {
    this.cache.set(fontName, true);
    this.loading.delete(fontName);
  }

  setLoading(fontName: string, promise: Promise<boolean>): void {
    this.loading.set(fontName, promise);
  }

  clear(): void {
    this.cache.clear();
    this.loading.clear();
  }
}

const fontCache = new FontCache();

// Load a single font with caching
async function loadSingleFont(config: FontConfig): Promise<boolean> {
  // Check if already loaded
  if (fontCache.isLoaded(config.name)) {
    return true;
  }

  // Check if currently loading
  if (fontCache.isLoading(config.name)) {
    return fontCache.loading.get(config.name)!;
  }

  const loadPromise = loadAsync({
    [config.name]: config.source,
  })
    .then(() => {
      fontCache.setLoaded(config.name);
      return true;
    })
    .catch((error) => {
      console.error(`Failed to load font ${config.name}:`, error);
      return false;
    });

  fontCache.setLoading(config.name, loadPromise);
  return loadPromise;
}

// Load multiple fonts with progress tracking
async function loadFontsWithProgress(
  configs: FontConfig[],
  onProgress?: (progress: number) => void
): Promise<{ loaded: string[]; failed: string[] }> {
  const total = configs.length;
  let completed = 0;
  const loaded: string[] = [];
  const failed: string[] = [];

  const results = await Promise.allSettled(
    configs.map(async (config) => {
      const success = await loadSingleFont(config);
      completed++;
      onProgress?.((completed / total) * 100);
      return { name: config.name, success };
    })
  );

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      if (result.value.success) {
        loaded.push(result.value.name);
      } else {
        failed.push(result.value.name);
      }
    } else {
      failed.push(configs[index].name);
    }
  });

  return { loaded, failed };
}

// Main hook for custom font loading
export function useCustomFonts(
  fontConfigs: FontConfig[] = Object.values(FONT_CONFIGS),
  options: {
    autoLoad?: boolean;
    onProgress?: (progress: number) => void;
    onComplete?: (status: FontLoadingStatus) => void;
  } = {}
) {
  const { autoLoad = true, onProgress, onComplete } = options;
  const [status, setStatus] = useState<FontLoadingStatus>({
    loaded: false,
    error: null,
    progress: 0,
  });

  useEffect(() => {
    if (!autoLoad) {
      return;
    }

    let mounted = true;

    const loadFonts = async () => {
      try {
        setStatus({ loaded: false, error: null, progress: 0 });

        const { loaded, failed } = await loadFontsWithProgress(fontConfigs, (progress) => {
          if (mounted) {
            setStatus({ loaded: false, error: null, progress });
            onProgress?.(progress);
          }
        });

        if (mounted) {
          if (failed.length > 0) {
            const error = new Error(`Failed to load fonts: ${failed.join(', ')}`);
            setStatus({ loaded: true, error, progress: 100 });
            onComplete?.({ loaded: true, error, progress: 100 });
          } else {
            setStatus({ loaded: true, error: null, progress: 100 });
            onComplete?.({ loaded: true, error: null, progress: 100 });
          }
        }
      } catch (error) {
        if (mounted) {
          const err = error instanceof Error ? error : new Error('Font loading failed');
          setStatus({ loaded: false, error: err, progress: 0 });
          onComplete?.({ loaded: false, error: err, progress: 0 });
        }
      }
    };

    loadFonts();

    return () => {
      mounted = false;
    };
  }, [fontConfigs, autoLoad, onProgress, onComplete]);

  return status;
}

// Hook for lazy loading fonts on demand
export function useLazyFont(config: FontConfig) {
  const [status, setStatus] = useState<FontLoadingStatus>({
    loaded: false,
    error: null,
    progress: 0,
  });

  const load = async () => {
    setStatus({ loaded: false, error: null, progress: 0 });
    
    try {
      const success = await loadSingleFont(config);
      if (success) {
        setStatus({ loaded: true, error: null, progress: 100 });
      } else {
        setStatus({ loaded: false, error: new Error('Font load failed'), progress: 0 });
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Font load failed');
      setStatus({ loaded: false, error: err, progress: 0 });
    }
  };

  return { ...status, load };
}

// Preload fonts for critical UI elements
export async function preloadCriticalFonts() {
  const criticalFonts = [
    FONT_CONFIGS.Inter,
    FONT_CONFIGS['Inter-Bold'],
    FONT_CONFIGS['Inter-Medium'],
  ];

  const { loaded, failed } = await loadFontsWithProgress(criticalFonts);

  if (failed.length > 0) {
    console.warn('Some critical fonts failed to load:', failed);
  }

  return { loaded, failed };
}

// Font utility functions
export const fontUtils = {
  // Check if a specific font is loaded
  isLoaded: (fontName: string): boolean => fontCache.isLoaded(fontName),
  
  // Clear font cache (useful for testing or font updates)
  clearCache: (): void => fontCache.clear(),
  
  // Get all loaded fonts
  getLoadedFonts: (): string[] => Array.from(fontCache.cache.keys()),
  
  // Get font loading status
  getLoadingStatus: (fontName: string): { loaded: boolean; loading: boolean } => ({
    loaded: fontCache.isLoaded(fontName),
    loading: fontCache.isLoading(fontName),
  }),
};
