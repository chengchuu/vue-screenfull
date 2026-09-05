import { babel } from "@rollup/plugin-babel";
import typescript from "@rollup/plugin-typescript";
import { DEFAULT_EXTENSIONS } from "@babel/core";
import terser from "@rollup/plugin-terser";
import { dts } from "rollup-plugin-dts";
import { rmSync } from "node:fs";
import { createRequire } from "node:module";
import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pkg from "../package.json" with { type: "json" };

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);
const _resolve = (_path) => path.resolve(__dirname, _path);
const pkgName = pkg.name;
const iifeName = pkgName.replace(/-/g, "_").toUpperCase();
const pkgVersion =
  process.env.SCRIPTS_NPM_PACKAGE_VERSION || process.env.VERSION || "unknown";
const inputResolve = _resolve("../src/index.ts");
const browserInputResolve = _resolve("../src/browser.ts");
const browserIifeName = `${iifeName}_BROWSER`;
const banner =
  "/*!\n" +
  ` * ${pkgName} v${pkgVersion}\n` +
  ` * (c) 2018-${new Date().getFullYear()} Cheng https://www.npmjs.com/package/vue-screenfull\n` +
  " * Released under the MIT License.\n" +
  " */";
const moduleExternal = ["vue", "mazey"];
const browserExternal = ["vue"];

const mazeyPackagePath = require.resolve("mazey/package.json");
const mazeyPackage = require(mazeyPackagePath);
const mazeyEntry = path.resolve(dirname(mazeyPackagePath), mazeyPackage.module);

const resolveMazey = () => ({
  name: "resolve-mazey",
  resolveId(source) {
    return source === "mazey" ? mazeyEntry : null;
  },
});

const clean = () => ({
  name: "clean-lib",
  buildStart() {
    rmSync(_resolve("../lib"), { recursive: true, force: true });
  },
});

const plugins = [
  typescript({
    compilerOptions: {
      declaration: false,
      declarationMap: false,
    },
  }),
  babel({
    babelHelpers: "bundled",
    // Just convert the source code, don't run external dependencies.
    exclude: "**/node_modules/**",
    // Babel does not support TypeScript by default; it needs to be manually added.
    extensions: [...DEFAULT_EXTENSIONS, ".ts"],
  }),
];
const iifePlugins = [];
const typingDtsConf = {
  input: _resolve("../src/typing.ts"),
  // https://rollupjs.org/guide/en/#outputformat
  output: [
    {
      file: _resolve("../lib/typing.d.ts"),
      format: "es",
    },
  ],
  plugins: [dts()],
  external: moduleExternal,
};
const indexDtsConf = {
  input: _resolve("../src/index.ts"),
  output: [
    {
      file: _resolve("../lib/index.d.ts"),
      format: "es",
      banner: `/// <reference path="./global.d.ts" />`,
    },
  ],
  plugins: [dts()],
  external: moduleExternal,
};
const browserDtsConf = {
  input: browserInputResolve,
  output: [
    {
      file: _resolve("../lib/browser.d.ts"),
      format: "es",
    },
  ],
  plugins: [dts()],
};
const globalDtsConf = {
  input: _resolve("../types/global.d.ts"),
  output: [
    {
      file: _resolve("../lib/global.d.ts"),
      format: "es",
      footer: "export {};",
    },
  ],
  plugins: [dts()],
  external: moduleExternal,
};

iifePlugins.push(
  // Add minification.
  // https://github.com/TrySound/rollup-plugin-terser
  terser({
    format: {
      // https://github.com/terser/terser#format-options
      comments: /^!\n\s\*\svue-screenfull|[@#]__PURE__/, // Preserve license and tree-shaking annotations.
      preserve_annotations: true,
    },
  }),
);

// https://rollupjs.org/guide/en/
export default [
  {
    input: inputResolve,
    // https://rollupjs.org/guide/en/#outputformat
    output: [
      {
        file: _resolve("../lib/index.cjs.js"),
        format: "cjs",
        exports: "named",
        banner,
        sourcemap: true,
        plugins: iifePlugins,
      },
      {
        file: _resolve("../lib/index.esm.js"),
        format: "esm",
        banner,
        sourcemap: true,
        plugins: iifePlugins,
      },
      {
        file: _resolve("../lib/index.mjs"),
        format: "esm",
        banner,
        sourcemap: true,
        plugins: iifePlugins,
      },
    ],
    plugins: [clean(), ...plugins],
    external: moduleExternal,
  },
  {
    input: inputResolve,
    output: [
      {
        file: _resolve(`../lib/${pkgName}.min.js`),
        format: "iife",
        name: iifeName,
        exports: "named",
        globals: { vue: "Vue" },
        banner,
        sourcemap: true,
        plugins: iifePlugins,
      },
    ],
    plugins: [resolveMazey(), ...plugins],
    external: browserExternal,
  },
  {
    input: browserInputResolve,
    output: [
      {
        file: _resolve("../lib/browser.cjs.js"),
        format: "cjs",
        exports: "named",
        banner,
        sourcemap: true,
        plugins: iifePlugins,
      },
      {
        file: _resolve("../lib/browser.esm.js"),
        format: "esm",
        banner,
        sourcemap: true,
        plugins: iifePlugins,
      },
      {
        file: _resolve("../lib/browser.mjs"),
        format: "esm",
        banner,
        sourcemap: true,
        plugins: iifePlugins,
      },
    ],
    plugins,
  },
  {
    input: browserInputResolve,
    output: [
      {
        file: _resolve(`../lib/${pkgName}.browser.min.js`),
        format: "iife",
        name: browserIifeName,
        exports: "named",
        banner,
        sourcemap: true,
        plugins: iifePlugins,
      },
    ],
    plugins,
  },
  indexDtsConf,
  browserDtsConf,
  typingDtsConf,
  globalDtsConf,
];
