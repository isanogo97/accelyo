// Configuration Babel requise par Expo (Metro bundler + transformations RN).
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
