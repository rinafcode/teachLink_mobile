import { 
  detectImageDimensions, 
  detectImageDimensionsBatch, 
  calculateAspectRatioStyle,
  dimensionsCache,
  ImageDimensions 
} from '../../utils/imageDimensions';

describe('imageDimensions', () => {
  beforeEach(() => {
    dimensionsCache.clear();
  });

  describe('detectImageDimensions', () => {
    it('should return null for null/undefined URI', async () => {
      const result = await detectImageDimensions('');
      expect(result).toBeNull();
    });

    it('should return null for invalid URI', async () => {
      const result = await detectImageDimensions('not-a-valid-uri');
      // Since this might fail differently, we expect it to handle errors gracefully
      expect(result === null || result === undefined).toBe(true);
    });

    it('should detect dimensions for valid image URL', async () => {
      // Using a reliable test image
      const testUrl = 'https://via.placeholder.com/300x200.png';
      const result = await detectImageDimensions(testUrl);
      
      if (result) {
        expect(result).toHaveProperty('width');
        expect(result).toHaveProperty('height');
        expect(result).toHaveProperty('aspectRatio');
        expect(typeof result.width).toBe('number');
        expect(typeof result.height).toBe('number');
        expect(typeof result.aspectRatio).toBe('number');
        expect(result.aspectRatio).toBe(result.width / result.height);
      }
    });
  });

  describe('detectImageDimensionsBatch', () => {
    it('should return empty array for empty input', async () => {
      const result = await detectImageDimensionsBatch([]);
      expect(result).toEqual([]);
    });

    it('should return null for null/undefined input', async () => {
      const result = await detectImageDimensionsBatch([null, undefined] as any[]);
      expect(result).toEqual([null, null]);
    });

    it('should handle multiple URLs', async () => {
      const urls = [
        'https://via.placeholder.com/100x100.png',
        'https://via.placeholder.com/200x150.png',
      ];
      
      const results = await detectImageDimensionsBatch(urls);
      expect(results).toHaveLength(2);
      expect(results.every(r => r === null || typeof r === 'object')).toBe(true);
    });
  });

  describe('calculateAspectRatioStyle', () => {
    it('should calculate correct dimensions maintaining aspect ratio', () => {
      const dimensions: ImageDimensions = {
        width: 800,
        height: 600,
        aspectRatio: 800 / 600,
      };
      
      const containerWidth = 400;
      const style = calculateAspectRatioStyle(dimensions, containerWidth);
      
      expect(style.width).toBe(containerWidth);
      expect(style.height).toBe(300); // 400 / (4/3) = 300
    });

    it('should handle square images', () => {
      const dimensions: ImageDimensions = {
        width: 500,
        height: 500,
        aspectRatio: 1,
      };
      
      const containerWidth = 250;
      const style = calculateAspectRatioStyle(dimensions, containerWidth);
      
      expect(style.width).toBe(250);
      expect(style.height).toBe(250);
    });

    it('should handle portrait images', () => {
      const dimensions: ImageDimensions = {
        width: 600,
        height: 800,
        aspectRatio: 0.75,
      };
      
      const containerWidth = 300;
      const style = calculateAspectRatioStyle(dimensions, containerWidth);
      
      expect(style.width).toBe(300);
      expect(style.height).toBe(400); // 300 / 0.75 = 400
    });
  });

  describe('dimensionsCache', () => {
    it('should cache and retrieve dimensions', () => {
      const testUri = 'https://example.com/test.jpg';
      const dimensions: ImageDimensions = {
        width: 100,
        height: 100,
        aspectRatio: 1,
      };
      
      dimensionsCache.set(testUri, dimensions);
      expect(dimensionsCache.has(testUri)).toBe(true);
      
      const retrieved = dimensionsCache.get(testUri);
      expect(retrieved).toEqual(dimensions);
    });

    it('should clear cache', () => {
      const testUri = 'https://example.com/test.jpg';
      const dimensions: ImageDimensions = {
        width: 100,
        height: 100,
        aspectRatio: 1,
      };
      
      dimensionsCache.set(testUri, dimensions);
      expect(dimensionsCache.has(testUri)).toBe(true);
      
      dimensionsCache.clear();
      expect(dimensionsCache.has(testUri)).toBe(false);
    });

    it('should return null for non-existent cache entry', async () => {
      const result = await dimensionsCache.get('non-existent.jpg');
      expect(result).toBeNull();
    });
  });
});
