const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");

const projectRoot = path.resolve(__dirname, "..");
const temporaryRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "vue-screenfull-browser-"),
);

const run = (command, args, cwd = temporaryRoot) =>
  execFileSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: "pipe",
    env: {
      ...process.env,
      npm_config_cache: path.join(temporaryRoot, "npm-cache"),
    },
  });

try {
  const packOutput = run(
    "npm",
    ["pack", "--json", "--pack-destination", temporaryRoot],
    projectRoot,
  );
  const [{ filename }] = JSON.parse(packOutput);
  const archive = path.join(temporaryRoot, filename);
  run("tar", ["-xzf", archive]);

  const consumerRoot = path.join(temporaryRoot, "consumer");
  const packageRoot = path.join(consumerRoot, "node_modules", "vue-screenfull");
  fs.mkdirSync(path.dirname(packageRoot), { recursive: true });
  fs.renameSync(path.join(temporaryRoot, "package"), packageRoot);
  const packedPackage = JSON.parse(
    fs.readFileSync(path.join(packageRoot, "package.json"), "utf8"),
  );
  assert.equal(packedPackage.peerDependenciesMeta.vue.optional, true);
  assert.deepEqual(packedPackage.exports["./browser"], {
    types: "./lib/browser.d.ts",
    import: "./lib/browser.mjs",
    require: "./lib/browser.cjs.js",
    default: "./lib/browser.mjs",
  });
  fs.writeFileSync(
    path.join(consumerRoot, "package.json"),
    `${JSON.stringify({ private: true }, null, 2)}\n`,
  );

  const artifacts = [
    "browser.cjs.js",
    "browser.esm.js",
    "browser.mjs",
    "browser.d.ts",
    "vue-screenfull.browser.min.js",
  ];
  for (const artifact of artifacts) {
    const source = fs.readFileSync(
      path.join(packageRoot, "lib", artifact),
      "utf8",
    );
    assert.doesNotMatch(
      source,
      /(?:\bfrom\s+|\brequire\s*\(\s*|\bimport\s*(?:\(\s*)?)["'](?:vue|mazey)(?:[/'"])/,
      `${artifact} must not import Vue or Mazey`,
    );
  }
  for (const artifact of [
    "browser.cjs.js.map",
    "browser.esm.js.map",
    "browser.mjs.map",
    "vue-screenfull.browser.min.js.map",
  ]) {
    assert.equal(fs.existsSync(path.join(packageRoot, "lib", artifact)), true);
  }

  fs.writeFileSync(
    path.join(consumerRoot, "consumer.cjs"),
    `const assert = require("node:assert/strict");
const browser = require("vue-screenfull/browser");
void (async () => {
  assert.deepEqual(Object.keys(browser).sort(), ["createScreenfullController", "detectFullscreenApi"]);
  const controller = browser.createScreenfullController();
  assert.equal(controller.status, "unsupported");
  await controller.destroy();
})();
`,
  );
  run(process.execPath, ["consumer.cjs"], consumerRoot);

  fs.writeFileSync(
    path.join(consumerRoot, "consumer.mjs"),
    `import assert from "node:assert/strict";
import { createScreenfullController, detectFullscreenApi } from "vue-screenfull/browser";
assert.equal(typeof detectFullscreenApi, "function");
const controller = createScreenfullController();
assert.equal(controller.status, "unsupported");
await controller.destroy();
const native = await import("./node_modules/vue-screenfull/lib/browser.mjs");
assert.equal(typeof native.createScreenfullController, "function");
`,
  );
  run(process.execPath, ["consumer.mjs"], consumerRoot);

  fs.writeFileSync(
    path.join(consumerRoot, "consumer.ts"),
    `import {
  createScreenfullController,
  detectFullscreenApi,
  type ScreenfullError,
  type ScreenfullResult,
} from "vue-screenfull/browser";

const controller = createScreenfullController();
const target: Element | null | undefined = undefined;
const result: Promise<ScreenfullResult> = controller.request(target);
result.then((value) => {
  if (value.ok) {
    const error: null = value.error;
    void error;
  } else {
    const error: ScreenfullError = value.error;
    void error;
  }
});
void detectFullscreenApi(document);
`,
  );
  fs.writeFileSync(
    path.join(consumerRoot, "tsconfig.json"),
    `${JSON.stringify(
      {
        compilerOptions: {
          target: "ES2015",
          module: "NodeNext",
          moduleResolution: "NodeNext",
          lib: ["DOM", "ES2015"],
          strict: true,
          skipLibCheck: false,
          types: [],
          noEmit: true,
        },
        files: ["consumer.ts"],
      },
      null,
      2,
    )}\n`,
  );
  run(
    process.execPath,
    [path.join(projectRoot, "node_modules", "typescript", "bin", "tsc")],
    consumerRoot,
  );

  const iifeSource = fs.readFileSync(
    path.join(packageRoot, "lib", "vue-screenfull.browser.min.js"),
    "utf8",
  );
  const context = {};
  vm.runInNewContext(iifeSource, context);
  assert.equal(typeof context.VUE_SCREENFULL_BROWSER, "object");
  assert.equal(
    typeof context.VUE_SCREENFULL_BROWSER.createScreenfullController,
    "function",
  );
  assert.deepEqual(Object.keys(context.VUE_SCREENFULL_BROWSER).sort(), [
    "createScreenfullController",
    "detectFullscreenApi",
  ]);

  console.log("Packed Vue-free browser consumers passed.");
} finally {
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
}
