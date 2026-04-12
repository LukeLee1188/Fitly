const { withAppBuildGradle } = require('@expo/config-plugins');

module.exports = function withKotlinFix(config) {
  return withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    // This targets the exact property causing the "unknown property" crash
    if (contents.includes('enableBundleCompression')) {
      console.log("Found the ghost property! Deleting from app/build.gradle...");
      contents = contents.replace(/enableBundleCompression\s*=\s*(true|false)/g, '// Removed for RN 0.76');
    }

    config.modResults.contents = contents;
    return config;
  });
};