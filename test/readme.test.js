/** @jest-environment node */

const { readFileSync } = require("node:fs");
const packageJson = require("../package.json");

const readmes = ["README.md", "README.zh-CN.md"].map((file) => ({
  file,
  source: readFileSync(file, "utf8"),
}));

test("Vue examples support the declared Vue 3.3 peer range", () => {
  expect(packageJson.peerDependencies.vue).toBe("^3.3.0");

  for (const { source } of readmes) {
    expect(source).not.toContain("useTemplateRef");
    expect(source).toContain('import { ref } from "vue";');
    expect(source).toContain("const target = ref<HTMLElement | null>(null);");
    expect(source).toContain("const panel = ref<HTMLElement | null>(null);");
  }
});

test("renderless component examples keep the exit control inside the target", () => {
  for (const { source } of readmes) {
    const match = source.match(/<Screenfull[\s\S]*?<\/Screenfull>/);
    expect(match).not.toBeNull();
    const [example] = match;

    expect(example).toContain('target="#article"');
    expect(example).toContain('<article id="article">');
    expect(example).toContain("screenfull.isFullscreen.value");
    expect(example).not.toMatch(/screenfull\.isFullscreen\s*\?/);
    expect(example).not.toContain('v-if="screenfull.isFullscreen');
  }
});

test("maintainer documentation does not advertise a CI-only Node version", () => {
  for (const { source } of readmes) {
    expect(source).not.toContain("Node.js 22 is used in CI.");
    expect(source).not.toContain("CI 使用 Node.js 22。");
  }
});
