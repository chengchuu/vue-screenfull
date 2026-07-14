/** @jest-environment node */

const {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createManifest, fingerprintPages } = require("../scripts/build-pages");
const { pngDimensions } = require("../scripts/validate-pwa");
const { PWA_ICONS, SITE_BASE } = require("../scripts/site-config");

const root = path.resolve(__dirname, "..");

test("manifest identity, scope, icons, and maskable artwork are valid", () => {
  const manifest = createManifest();
  expect(manifest.id).toBe(SITE_BASE);
  expect(manifest.start_url).toBe(SITE_BASE);
  expect(manifest.scope).toBe(SITE_BASE);
  expect(manifest.icons.some((icon) => icon.purpose === "maskable")).toBe(true);
  for (const icon of PWA_ICONS) {
    const dimensions = pngDimensions(path.join(root, "images", icon.file));
    expect(`${dimensions.width}x${dimensions.height}`).toBe(icon.sizes);
  }
});

test("Workbox worker keeps activation explicit and routes only scoped GETs", () => {
  const source = readFileSync(
    path.join(root, "site", "service-worker.ts"),
    "utf8",
  );
  expect(source).toContain(".__WB_MANIFEST)");
  expect(source).toContain('event.data?.type === "SKIP_WAITING"');
  expect(source).toContain('request.method === "GET"');
  expect(source).toContain("url.origin === worker.location.origin");
  expect(source).toContain("url.pathname.startsWith(__PWA_SCOPE__)");
  expect(source).toContain('request.destination === "image"');
  expect(source).toContain('request.destination === "font"');
  expect(source).toContain('request.destination === "script"');
  expect(source).toContain('request.destination === "style"');
  expect(source).toContain('cacheName: "vue-screenfull-static"');
  expect(source.match(/skipWaiting\(\)/g)).toHaveLength(1);
});

test("the Pages fingerprint changes with deployable content only", () => {
  const directory = mkdtempSync(
    path.join(os.tmpdir(), "vue-screenfull-pages-"),
  );
  try {
    mkdirSync(path.join(directory, "assets"));
    writeFileSync(path.join(directory, "index.html"), "first");
    writeFileSync(path.join(directory, "assets", "site.js"), "first");
    const initial = fingerprintPages(directory);

    writeFileSync(path.join(directory, "assets", "site.js"), "second");
    expect(fingerprintPages(directory)).not.toBe(initial);
    const deployable = fingerprintPages(directory);

    writeFileSync(path.join(directory, "service-worker.js"), "generated");
    writeFileSync(path.join(directory, "site-version.json"), "generated");
    writeFileSync(path.join(directory, "assets", "site.js.map"), "generated");
    expect(fingerprintPages(directory)).toBe(deployable);
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
});
