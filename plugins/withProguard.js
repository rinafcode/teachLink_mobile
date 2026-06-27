const fs = require('fs');
const path = require('path');

const { withDangerousMod } = require('@expo/config-plugins');

const PROGUARD_MARKER = '# --- TeachLink custom ProGuard rules ---';

/**
 * Copies root proguard-rules.pro into the generated Android project during prebuild.
 * Uses a marker to avoid duplicating rules on repeated prebuilds.
 */
module.exports = function withProguard(config) {
  return withDangerousMod(config, [
    'android',
    async config => {
      const projectRoot = config.modRequest.projectRoot;
      const sourceProguardPath = path.join(projectRoot, 'proguard-rules.pro');
      const targetProguardPath = path.join(projectRoot, 'android', 'app', 'proguard-rules.pro');

      if (!fs.existsSync(sourceProguardPath)) {
        return config;
      }

      const customRules = fs.readFileSync(sourceProguardPath, 'utf8');
      let existingRules = '';

      if (fs.existsSync(targetProguardPath)) {
        existingRules = fs.readFileSync(targetProguardPath, 'utf8');
        const markerIndex = existingRules.indexOf(PROGUARD_MARKER);
        if (markerIndex !== -1) {
          existingRules = existingRules.slice(0, markerIndex).trimEnd();
        }
      }

      fs.mkdirSync(path.dirname(targetProguardPath), { recursive: true });
      fs.writeFileSync(
        targetProguardPath,
        `${existingRules}\n\n${PROGUARD_MARKER}\n${customRules}\n`
      );

      return config;
    },
  ]);
};
