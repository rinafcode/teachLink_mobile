import { describe, it, expect } from '@jest/globals';
import AssetSourceResolver from 'react-native/Libraries/Image/AssetSourceResolver';
import '../../src/utils/assetInlinePolyfill'; // Import to apply the polyfill

describe('Asset Inlining Polyfill', () => {
  it('should resolve an inlined asset to its base64 data URL', () => {
    const mockInlinedAsset = {
      __packager_asset: true,
      fileSystemLocation: '/path/to/assets',
      httpServerLocation: '/assets',
      width: 48,
      height: 48,
      scales: [1],
      hash: '4f1cb2cac2370cd5050681232e8575a8',
      name: 'test-tiny-icon',
      type: 'png',
      base64: 'data:image/png;base64,iVBORw0KGgoAAAANS...', // custom inlined data URL
    } as any;

    const resolver = new AssetSourceResolver('http://localhost:8081', null, mockInlinedAsset);
    const resolved = resolver.defaultAsset();

    expect(resolved).toBeDefined();
    expect(resolved.uri).toBe(mockInlinedAsset.base64);
    expect(resolved.width).toBe(48);
    expect(resolved.height).toBe(48);
  });

  it('should fall back to standard resolution for non-inlined assets', () => {
    const mockStandardAsset = {
      __packager_asset: true,
      fileSystemLocation: '/path/to/assets',
      httpServerLocation: '/assets',
      width: 48,
      height: 48,
      scales: [1],
      hash: '4f1cb2cac2370cd5050681232e8575a8',
      name: 'react-logo',
      type: 'png',
      // no base64 key
    } as any;

    const resolver = new AssetSourceResolver('http://localhost:8081', null, mockStandardAsset);
    const resolved = resolver.defaultAsset();

    expect(resolved).toBeDefined();
    // Default URL-based asset resolution
    expect(resolved.uri).toContain('react-logo.png');
    expect(resolved.uri.startsWith('data:')).toBe(false);
  });
});
