const { withAppBuildGradle } = require('@expo/config-plugins');

module.exports = function withRemoveCompression(config) {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.contents.includes('enableBundleCompression')) {
      config.modResults.contents = config.modResults.contents.replace(
        /enableBundleCompression\s*=\s*(true|false)/g,
        '// Line removed by plugin'
      );
    }
    return config;
  });
};