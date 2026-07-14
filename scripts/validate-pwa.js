const { existsSync, readFileSync, readdirSync, statSync } = require("node:fs");
const path = require("node:path");
const {
  MANIFEST_URL,
  PWA_ICONS,
  SERVICE_WORKER_URL,
  SITE_BASE,
} = require("./site-config");

const root = path.resolve(__dirname, "..");

function pngDimensions(file) {
  const contents = readFileSync(file);
  if (contents.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a")
    throw new Error(`${file}: expected PNG data`);
  return {
    width: contents.readUInt32BE(16),
    height: contents.readUInt32BE(20),
  };
}

function filesIn(directory) {
  return readdirSync(directory).flatMap((name) => {
    const file = path.join(directory, name);
    return statSync(file).isDirectory() ? filesIn(file) : [file];
  });
}

function validatePwa({ rootDir = root } = {}) {
  const failures = [];
  const docs = path.join(rootDir, "docs");
  const manifestFile = path.join(docs, "manifest.webmanifest");
  const workerFile = path.join(docs, "service-worker.js");
  const versionFile = path.join(docs, "site-version.json");
  if (!existsSync(manifestFile)) failures.push("Manifest is missing");
  const manifest = existsSync(manifestFile)
    ? JSON.parse(readFileSync(manifestFile, "utf8"))
    : null;
  if (manifest) {
    for (const field of ["id", "start_url", "scope"]) {
      if (manifest[field] !== SITE_BASE)
        failures.push(`Manifest ${field} must be ${SITE_BASE}`);
    }
    if (!/^#[0-9a-f]{6}$/i.test(manifest.theme_color))
      failures.push("Manifest theme_color is invalid");
    if (!/^#[0-9a-f]{6}$/i.test(manifest.background_color))
      failures.push("Manifest background_color is invalid");
    for (const icon of manifest.icons ?? []) {
      const file = path.join(docs, icon.src.slice(SITE_BASE.length));
      if (!existsSync(file)) {
        failures.push(`Manifest icon is missing: ${icon.src}`);
        continue;
      }
      const dimensions = pngDimensions(file);
      if (`${dimensions.width}x${dimensions.height}` !== icon.sizes)
        failures.push(`Manifest icon size mismatch: ${icon.src}`);
    }
    for (const expected of PWA_ICONS) {
      if (
        !(manifest.icons ?? []).some(
          (icon) =>
            icon.sizes === expected.sizes && icon.purpose === expected.purpose,
        )
      )
        failures.push(
          `Manifest is missing ${expected.sizes} ${expected.purpose}`,
        );
    }
  }

  for (const file of [
    path.join(docs, "index.html"),
    path.join(docs, "playground", "index.html"),
    path.join(docs, "api", "index.html"),
  ]) {
    if (!existsSync(file)) {
      failures.push(`Entry page is missing: ${file}`);
      continue;
    }
    const html = readFileSync(file, "utf8");
    if (!html.includes(`rel="manifest" href="${MANIFEST_URL}"`))
      failures.push(`${file} does not link the manifest`);
    if (!html.includes('name="theme-color"'))
      failures.push(`${file} is missing theme-color metadata`);
    if (!html.includes("data-pwa-update-now"))
      failures.push(`${file} is missing update controls`);
    if (!html.includes("data-pwa-status"))
      failures.push(`${file} is missing a PWA live region`);
  }

  if (!existsSync(workerFile)) failures.push("Service worker is missing");
  else {
    const worker = readFileSync(workerFile, "utf8");
    if (worker.includes("self.__WB_MANIFEST"))
      failures.push("Workbox precache manifest was not injected");
    if (!worker.includes("SKIP_WAITING"))
      failures.push("Service worker lacks explicit activation messaging");
    if (!worker.includes("site-version.json"))
      failures.push("Service worker does not include the site version marker");
    if ((worker.match(/\.skipWaiting\(\)/g) ?? []).length !== 1)
      failures.push(
        "Service worker must contain one explicit skip-waiting path",
      );
  }

  if (!existsSync(versionFile)) failures.push("Site version marker is missing");
  else {
    try {
      const version = JSON.parse(readFileSync(versionFile, "utf8")).version;
      if (!/^[0-9a-f]{16}$/.test(version ?? ""))
        failures.push("Site version marker is invalid");
    } catch (error) {
      failures.push(`Site version marker is invalid JSON: ${error.message}`);
    }
  }

  const browserCode = filesIn(path.join(docs, "assets"))
    .filter((file) => file.endsWith(".js"))
    .map((file) => readFileSync(file, "utf8"))
    .join("\n");
  if (!browserCode.includes(SERVICE_WORKER_URL))
    failures.push("Page bundle does not contain the scoped worker URL");
  if (failures.length)
    throw new Error(`PWA validation failed:\n- ${failures.join("\n- ")}`);
  return { icons: manifest.icons.length, pages: 3 };
}

if (require.main === module) {
  try {
    const result = validatePwa();
    console.log(
      `PWA validation passed for ${result.pages} pages and ${result.icons} icons.`,
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { pngDimensions, validatePwa };
