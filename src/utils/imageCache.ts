import { Image } from 'expo-image';

export class ImageCache {
  /**
   * Prefetches an array of image URLs to memory or disk.
   * Useful for pre-loading images before they are rendered in a fast-scrolling list.
   *
   * @param urls Array of image URLs to prefetch
   * @returns A promise that resolves to an array of boolean flags indicating success
   */
  static async prefetchImages(urls: string[]): Promise<boolean[]> {
    try {
      if (!urls || urls.length === 0) return [];
      
      const promises = urls.map(async (url) => {
        if (!url) return false;
        try {
          return await Image.prefetch(url);
        } catch (e) {
          console.warn(`Failed to prefetch image: ${url}`, e);
          return false;
        }
      });

      return await Promise.all(promises);
    } catch (e) {
      console.warn('Error prefetching images', e);
      return [];
    }
  }

  /**
   * Clears all cached images from memory and disk.
   */
  static async clearCache(): Promise<void> {
    try {
      await Image.clearMemoryCache();
      await Image.clearDiskCache();
    } catch (e) {
      console.warn('Failed to clear image cache', e);
    }
  }
}
