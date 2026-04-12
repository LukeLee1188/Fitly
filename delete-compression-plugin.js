const { withAppBuildGradle } = require('@expo/config-plugins');

module.exports = function withRemoveCompression(config) {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.contents.includes('enableBundleCompression')) {
      config.modResults.contents = config.modResults.contents.replace(
        /enableBundleCompression\s*=\s*.*/g,
        '// Line removed by Fitly Plugin'
      );
    }
    return config;
  });
};