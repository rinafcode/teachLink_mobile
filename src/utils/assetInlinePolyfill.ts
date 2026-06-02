import AssetSourceResolver from 'react-native/Libraries/Image/AssetSourceResolver';

const originalDefaultAsset = AssetSourceResolver.prototype.defaultAsset;

AssetSourceResolver.prototype.defaultAsset = function () {
  try {
    if (this.asset && typeof this.asset.base64 === 'string') {
      return this.fromSource(this.asset.base64);
    }
  } catch (error) {
    // Non-blocking warning: fall back to normal asset resolution
    console.warn('[asset-inline-polyfill] Error resolving inline asset:', error);
  }
  return originalDefaultAsset.call(this);
};
