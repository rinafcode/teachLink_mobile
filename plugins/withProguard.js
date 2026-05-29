const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withProguard(config) {
  return withDangerousMod(config, [
    'android',
    async config => {
      const projectRoot = config.modRequest.projectRoot;
      const androidAppPath = path.join(projectRoot, 'android', 'app');
      const targetProguardPath = path.join(androidAppPath, 'proguard-rules.pro');
      const sourceProguardPath = path.join(projectRoot, 'proguard-rules.pro');

      if (fs.existsSync(sourceProguardPath)) {
        const customRules = fs.readFileSync(sourceProguardPath, 'utf8');
        let existingRules = '';
        if (fs.existsSync(targetProguardPath)) {
          existingRules = fs.readFileSync(targetProguardPath, 'utf8');
        }
        // Append our custom rules to the existing proguard-rules.pro if it exists, or create it.
        fs.writeFileSync(targetProguardPath, existingRules + '\n' + customRules);
      }
      return config;
    },
  ]);
};
