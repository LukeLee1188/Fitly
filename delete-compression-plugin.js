const { withAppBuildGradle } = require('@expo/config-plugins');

module.exports = function withRemoveCompression(config) {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.contents.includes('enableBundleCompression')) {
      // This deletes the exact line causing the Line 17 crash
      config.modResults.contents = config.modResults.contents.replace(
        /enableBundleCompression\s*=\s*.*/g,
        '// Line removed for RN 0.75 compatibility'
      );
    }
    return config;
  });
};