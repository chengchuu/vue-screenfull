const HtmlWebpackPlugin = require("html-webpack-plugin");
const path = require("node:path");
const webpack = require("webpack");
const {
  FAVICON_FILE,
  MANIFEST_URL,
  SERVICE_WORKER_URL,
  SITE_BASE,
  THEME_COLOR,
  THEME_CONFIG,
} = require("./site-config");
const _resolve = (_path) => path.resolve(__dirname, _path);
const productionPages = process.env.GITHUB_PAGES === "true";
const publicPath = productionPages ? SITE_BASE : "/";
const pwaConfig = {
  appName: "vue-screenfull",
  enabled: productionPages || process.env.PWA_ENABLED === "true",
  scope: SITE_BASE,
  url: SERVICE_WORKER_URL,
};

module.exports = {
  mode: "development",
  entry: {
    pwa: _resolve("../site/pwa.ts"),
    theme: _resolve("../site/theme-entry.ts"),
    playground: _resolve("../examples/index.ts"),
    ...(pwaConfig.enabled
      ? {
          "service-worker-source": _resolve("../site/service-worker.ts"),
        }
      : {}),
  },
  output: {
    clean: true,
    filename: "assets/[name].js",
    path: _resolve("../dist-dev"),
    publicPath,
  },
  devServer: {
    port: 8080,
    host: "0.0.0.0",
    static: [
      { directory: _resolve("../dist-dev") },
      { directory: _resolve("../site") },
      { directory: _resolve("../images"), publicPath: "/images" },
      { directory: _resolve("../docs") },
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
      filename: "index.html",
      template: _resolve("../site/index.html"),
      chunks: ["pwa"],
      inject: "body",
      templateParameters: {
        FAVICON_URL: `${publicPath}images/${FAVICON_FILE}`,
        MANIFEST_URL: productionPages ? MANIFEST_URL : null,
        THEME_COLOR,
        THEME_COLOR_DARK: THEME_CONFIG.colorDark,
        THEME_COLOR_LIGHT: THEME_CONFIG.colorLight,
        THEME_SCRIPT_URL: "./assets/theme.js",
      },
    }),
    new HtmlWebpackPlugin({
      filename: "playground/index.html",
      template: _resolve("../examples/index.html"),
      chunks: ["pwa", "playground"],
      inject: "body",
      templateParameters: {
        FAVICON_URL: `${publicPath}images/${FAVICON_FILE}`,
        MANIFEST_URL: productionPages ? MANIFEST_URL : null,
        THEME_COLOR,
        THEME_COLOR_DARK: THEME_CONFIG.colorDark,
        THEME_COLOR_LIGHT: THEME_CONFIG.colorLight,
        THEME_SCRIPT_URL: "../assets/theme.js",
      },
    }),
    new webpack.DefinePlugin({
      __PWA_SCOPE__: JSON.stringify(SITE_BASE),
      __SITE_PWA_CONFIG__: JSON.stringify(pwaConfig),
      __SITE_THEME_CONFIG__: JSON.stringify(THEME_CONFIG),
      __VUE_OPTIONS_API__: JSON.stringify(false),
      __VUE_PROD_DEVTOOLS__: JSON.stringify(false),
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: JSON.stringify(false),
    }),
  ],
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  optimization: {
    runtimeChunk: false,
  },
};
