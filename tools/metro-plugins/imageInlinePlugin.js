const fs = require('fs');

const INLINE_LIMIT = 1024; // 1 KB
const SUPPORTED_TYPES = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp']);

module.exports = function imageInlinePlugin(assetData) {
  const type = assetData.type.toLowerCase();

  if (SUPPORTED_TYPES.has(type)) {
    const primaryFile = assetData.files[0];
    if (primaryFile && fs.existsSync(primaryFile)) {
      try {
        const stat = fs.statSync(primaryFile);
        if (stat.size < INLINE_LIMIT) {
          const mime = type === 'jpg' ? 'jpeg' : type;
          const base64 = fs.readFileSync(primaryFile, 'base64');
          assetData.base64 = `data:image/${mime};base64,${base64}`;
        }
      } catch (error) {
        // Non-fatal build warning: must not break compilation
        console.warn(
          `[image-inline-plugin] Failed to evaluate or inline asset ${primaryFile}:`,
          error.message
        );
      }
    }
  }

  return assetData;
};
