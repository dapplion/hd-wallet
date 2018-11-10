const path = require('path');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = {
  entry: './src/entrypoint.js',
  output: {
    filename: 'HdWallet.min.js',
    path: path.resolve(__dirname, 'dist')
  },
  target: 'web',
  node: {
    Uint8Array: true,
    Buffer: true
  },
  // plugins: [
  //   new BundleAnalyzerPlugin()
  // ]
};