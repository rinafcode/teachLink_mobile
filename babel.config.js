module.exports = function (api) {
  const isProduction = api.env(envName => envName === 'production');

  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
    plugins: [
      [
        require.resolve('./tools/babel-plugins/productionOptimizer'),
        { production: isProduction },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};
