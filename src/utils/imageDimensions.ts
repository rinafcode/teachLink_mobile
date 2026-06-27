import { Image } from 'expo-image';

import logger from './logger';

export interface ImageDimensions {
  width: number;
  height: number;
  aspectRatio: number;
}

export interface ImageMetadata {
  uri: string;
  dimensions?: ImageDimensions;
  loaded?: boolean;
}

/**
 * Detects image dimensions from a remote URI
 * Uses expo-image's built-in dimension detection capabilities
 * 
 * @param uri - Image URI to detect dimensions for
 * @returns Promise resolving to image dimensions or null if detection fails
 */
export async function detectImageDimensions(uri: string): Promise<ImageDimensions | null> {
  if (!uri) {
    logger.warn('detectImageDimensions: No URI provided');
    return null;
  }

  try {
    // Use expo-image's getSize to get dimensions
    return new Promise((resolve, reject) => {
      Image.getSize(
        uri,
        (width, height) => {
          const dimensions: ImageDimensions = {
            width,
            height,
            aspectRatio: width / height,
          };
          logger.debug(`Detected dimensions for ${uri}: ${width}x${height}`);
          resolve(dimensions);
        },
        (error) => {
          logger.warn(`Failed to detect dimensions for ${uri}`, error);
          resolve(null);
        }
      );
    });
  } catch (error) {
    logger.error(`Error detecting image dimensions for ${uri}`, error);
    return null;
  }
}

/**
 * Batch detect dimensions for multiple images
 * 
 * @param uris - Array of image URIs
 * @returns Promise resolving to array of dimension results
 */
export async function detectImageDimensionsBatch(
  uris: string[]
): Promise<(ImageDimensions | null)[]> {
  if (!uris || uris.length === 0) return [];

  try {
    const results = await Promise.all(
      uris.map(uri => detectImageDimensions(uri))
    );
    return results;
  } catch (error) {
    logger.error('Error in batch dimension detection', error);
    return uris.map(() => null);
  }
}

/**
 * Calculates aspect ratio style for maintaining image proportions
 * 
 * @param dimensions - Image dimensions
 * @param containerWidth - Width of the container
 * @returns Style object with calculated height
 */
export function calculateAspectRatioStyle(
  dimensions: ImageDimensions,
  containerWidth: number
): { width: number; height: number } {
  const height = containerWidth / dimensions.aspectRatio;
  return {
    width: containerWidth,
    height: Math.round(height),
  };
}

/**
 * Caches detected dimensions to avoid redundant network calls
 */
class ImageDimensionsCache {
  private cache = new Map<string, ImageDimensions>();
  private pendingRequests = new Map<string, Promise<ImageDimensions | null>>();

  async get(uri: string): Promise<ImageDimensions | null> {
    // Return cached value if available
    if (this.cache.has(uri)) {
      return this.cache.get(uri)!;
    }

    // Return existing pending request if in progress
    if (this.pendingRequests.has(uri)) {
      return this.pendingRequests.get(uri)!;
    }

    // Create new detection request
    const promise = detectImageDimensions(uri);
    this.pendingRequests.set(uri, promise);

    try {
      const dimensions = await promise;
      if (dimensions) {
        this.cache.set(uri, dimensions);
      }
      this.pendingRequests.delete(uri);
      return dimensions;
    } catch (error) {
      this.pendingRequests.delete(uri);
      return null;
    }
  }

  set(uri: string, dimensions: ImageDimensions): void {
    this.cache.set(uri, dimensions);
  }

  has(uri: string): boolean {
    return this.cache.has(uri);
  }

  clear(): void {
    this.cache.clear();
    this.pendingRequests.clear();
  }
}

export const dimensionsCache = new ImageDimensionsCache();
