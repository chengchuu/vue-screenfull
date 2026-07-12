const HtmlWebpackPlugin = require("html-webpack-plugin");
const path = require("path");
const webpack = require("webpack");
const _resolve = (_path) => path.resolve(__dirname, _path);

module.exports = {
  mode: "development",
  entry: {
    index: _resolve("../examples/index.ts"),
  },
  output: {
    clean: true,
    filename: "[name].js",
    path: _resolve("../dist-dev"),
  },
  devServer: {
    port: 8080,
    host: "0.0.0.0",
    static: [
      { directory: _resolve("../dist-dev") },
      { directory: _resolve("../site") },
    ],
    allowedHosts: [".mazey.net"],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      filename: _resolve("../dist-dev/index.html"),
      template: _resolve("../examples/index.html"),
      inject: true,
    }),
    new webpack.DefinePlugin({
      __VUE_OPTIONS_API__: JSON.stringify(false),
      __VUE_PROD_DEVTOOLS__: JSON.stringify(false),
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: JSON.stringify(false),
    }),
  ],
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
};
