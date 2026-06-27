import AsyncStorage from '@react-native-async-storage/async-storage';
import { Asset } from 'expo-asset';
import { loadAsync } from 'expo-font';
import { Platform } from 'react-native';

// Font metadata interface
export interface FontMetadata {
  name: string;
  version: string;
  size: number;
  subset: string;
  lastUsed: number;
  priority: 'critical' | 'important' | 'optional';
}

// Font optimization settings
export interface FontOptimizationSettings {
  enableSubsetting: boolean;
  enableCompression: boolean;
  enableCaching: boolean;
  cacheMaxAge: number; // in milliseconds
  preloadCriticalFonts: boolean;
}

class FontService {
  private cacheKey = '@font_cache_metadata';
  private settingsKey = '@font_settings';
  private loadedFonts: Set<string> = new Set();
  private metadata: Map<string, FontMetadata> = new Map();

  // Default optimization settings
  private defaultSettings: FontOptimizationSettings = {
    enableSubsetting: true,
    enableCompression: true,
    enableCaching: true,
    cacheMaxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    preloadCriticalFonts: true,
  };

  constructor() {
    this.loadMetadata();
    this.loadSettings();
  }

  // Load font metadata from cache
  private async loadMetadata(): Promise<void> {
    try {
      const cached = await AsyncStorage.getItem(this.cacheKey);
      if (cached) {
        const data = JSON.parse(cached);
        Object.entries(data).forEach(([key, value]) => {
          this.metadata.set(key, value as FontMetadata);
        });
      }
    } catch (error) {
      console.error('Failed to load font metadata:', error);
    }
  }

  // Save font metadata to cache
  private async saveMetadata(): Promise<void> {
    try {
      const data = Object.fromEntries(this.metadata);
      await AsyncStorage.setItem(this.cacheKey, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save font metadata:', error);
    }
  }

  // Load optimization settings
  private async loadSettings(): Promise<void> {
    try {
      const cached = await AsyncStorage.getItem(this.settingsKey);
      if (cached) {
        this.defaultSettings = JSON.parse(cached);
      }
    } catch (error) {
      console.error('Failed to load font settings:', error);
    }
  }

  // Save optimization settings
  private async saveSettings(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.settingsKey, JSON.stringify(this.defaultSettings));
    } catch (error) {
      console.error('Failed to save font settings:', error);
    }
  }

  // Get current optimization settings
  getSettings(): FontOptimizationSettings {
    return { ...this.defaultSettings };
  }

  // Update optimization settings
  async updateSettings(settings: Partial<FontOptimizationSettings>): Promise<void> {
    this.defaultSettings = { ...this.defaultSettings, ...settings };
    await this.saveSettings();
  }

  // Register a font with metadata
  async registerFont(
    name: string,
    source: string | number,
    metadata: Partial<FontMetadata>
  ): Promise<void> {
    const fontMetadata: FontMetadata = {
      name,
      version: '1.0.0',
      size: 0, // Will be calculated when loaded
      subset: 'full',
      lastUsed: Date.now(),
      priority: 'optional',
      ...metadata,
    };

    this.metadata.set(name, fontMetadata);
    await this.saveMetadata();
  }

  // Load a font with optimization
  async loadFont(
    name: string,
    source: string | number,
    options: {
      priority?: 'critical' | 'important' | 'optional';
      forceReload?: boolean;
    } = {}
  ): Promise<boolean> {
    const { priority = 'optional', forceReload = false } = options;

    // Check if already loaded
    if (!forceReload && this.loadedFonts.has(name)) {
      this.updateLastUsed(name);
      return true;
    }

    // Check cache validity
    if (this.defaultSettings.enableCaching && !forceReload) {
      const metadata = this.metadata.get(name);
      if (metadata) {
        const age = Date.now() - metadata.lastUsed;
        if (age < this.defaultSettings.cacheMaxAge) {
          this.loadedFonts.add(name);
          this.updateLastUsed(name);
          return true;
        }
      }
    }

    try {
      // Load the font
      await loadAsync({ [name]: source });
      this.loadedFonts.add(name);

      // Update metadata
      await this.registerFont(name, source, {
        priority,
        lastUsed: Date.now(),
      });

      return true;
    } catch (error) {
      console.error(`Failed to load font ${name}:`, error);
      return false;
    }
  }

  // Update last used timestamp
  private async updateLastUsed(name: string): Promise<void> {
    const metadata = this.metadata.get(name);
    if (metadata) {
      metadata.lastUsed = Date.now();
      this.metadata.set(name, metadata);
      await this.saveMetadata();
    }
  }

  // Check if a font is loaded
  isLoaded(name: string): boolean {
    return this.loadedFonts.has(name);
  }

  // Get font metadata
  getMetadata(name: string): FontMetadata | undefined {
    return this.metadata.get(name);
  }

  // Get all loaded fonts
  getLoadedFonts(): string[] {
    return Array.from(this.loadedFonts);
  }

  // Get all font metadata
  getAllMetadata(): FontMetadata[] {
    return Array.from(this.metadata.values());
  }

  // Clear font cache
  async clearCache(): Promise<void> {
    this.loadedFonts.clear();
    this.metadata.clear();
    await AsyncStorage.removeItem(this.cacheKey);
  }

  // Clear expired cache entries
  async clearExpiredCache(): Promise<void> {
    const now = Date.now();
    const expired: string[] = [];

    this.metadata.forEach((metadata, name) => {
      const age = now - metadata.lastUsed;
      if (age > this.defaultSettings.cacheMaxAge) {
        expired.push(name);
      }
    });

    expired.forEach(name => {
      this.metadata.delete(name);
      this.loadedFonts.delete(name);
    });

    if (expired.length > 0) {
      await this.saveMetadata();
    }

    return expired;
  }

  // Get cache statistics
  getCacheStats(): {
    totalFonts: number;
    loadedFonts: number;
    cachedFonts: number;
    totalSize: number;
    expiredFonts: number;
  } {
    const now = Date.now();
    let totalSize = 0;
    let expiredCount = 0;

    this.metadata.forEach((metadata) => {
      totalSize += metadata.size;
      if (now - metadata.lastUsed > this.defaultSettings.cacheMaxAge) {
        expiredCount++;
      }
    });

    return {
      totalFonts: this.metadata.size,
      loadedFonts: this.loadedFonts.size,
      cachedFonts: this.metadata.size,
      totalSize,
      expiredFonts: expiredCount,
    };
  }

  // Preload critical fonts
  async preloadCriticalFonts(fonts: { name: string; source: string | number }[]): Promise<{
    loaded: string[];
    failed: string[];
  }> {
    const results = await Promise.allSettled(
      fonts.map(font => this.loadFont(font.name, font.source, { priority: 'critical' }))
    );

    const loaded: string[] = [];
    const failed: string[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        loaded.push(fonts[index].name);
      } else {
        failed.push(fonts[index].name);
      }
    });

    return { loaded, failed };
  }

  // Unload a font to free memory
  async unloadFont(name: string): Promise<void> {
    this.loadedFonts.delete(name);
    // Note: expo-font doesn't have an unload method, so we just remove from our tracking
  }

  // Unload all fonts
  async unloadAllFonts(): Promise<void> {
    this.loadedFonts.clear();
  }
}

// Singleton instance
export const fontService = new FontService();

// Utility functions for font optimization
export const fontOptimization = {
  // Calculate font subset based on character usage
  calculateSubset(text: string): string {
    const uniqueChars = new Set(text.split(''));
    return Array.from(uniqueChars).join('');
  },

  // Estimate font size reduction
  estimateReduction(originalSize: number, subsetSize: number): number {
    return ((1 - subsetSize / originalSize) * 100).toFixed(2);
  },

  // Get font file info
  async getFontInfo(source: string | number): Promise<{ size: number; type: string }> {
    try {
      const asset = Asset.fromModule(source);
      await asset.downloadAsync();
      return {
        size: asset.localUri ? 0 : 0, // Size calculation depends on platform
        type: 'ttf',
      };
    } catch {
      return { size: 0, type: 'unknown' };
    }
  },
};
