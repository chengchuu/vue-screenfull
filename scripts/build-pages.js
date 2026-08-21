const {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} = require("node:fs");
const { createHash } = require("node:crypto");
const path = require("node:path");
const { injectManifest } = require("workbox-build");
const {
  API_DESCRIPTION,
  API_TITLE,
  API_URL,
  FAVICON_URL,
  FAVICON_FILE,
  GITHUB_URL,
  MANIFEST_URL,
  NPM_URL,
  PWA_ICONS,
  PWA_NAME,
  PWA_SHORT_NAME,
  SITE_BASE,
  SITE_URL,
  BACKGROUND_COLOR,
  THEME_COLOR,
  THEME_CONFIG,
} = require("./site-config");

const root = path.resolve(__dirname, "..");
const docs = path.join(root, "docs");
const api = path.join(docs, "api");
const site = path.join(root, "site");

function escapeAttribute(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function themeToggleHtml() {
  return '<button class="theme-toggle" type="button" data-theme-toggle aria-label="Current theme: Light. Switch to dark theme."><svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true" focusable="false" data-theme-icon="light"><path d="M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0m0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13m8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5M3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8m10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0m-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0m9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707M4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708"/></svg><svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true" focusable="false" data-theme-icon="dark" hidden><path d="M6 .278a.77.77 0 0 1 .08.858 7.2 7.2 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277q.792-.001 1.533-.16a.79.79 0 0 1 .81.316.73.73 0 0 1-.031.893A8.35 8.35 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.75.75 0 0 1 6 .278"/><path d="M10.794 3.148a.217.217 0 0 1 .412 0l.387 1.162c.173.518.579.924 1.097 1.097l1.162.387a.217.217 0 0 1 0 .412l-1.162.387a1.73 1.73 0 0 0-1.097 1.097l-.387 1.162a.217.217 0 0 1-.412 0l-.387-1.162A1.73 1.73 0 0 0 9.31 6.593l-1.162-.387a.217.217 0 0 1 0-.412l1.162-.387a1.73 1.73 0 0 0 1.097-1.097zM13.863.099a.145.145 0 0 1 .274 0l.258.774c.115.346.386.617.732.732l.774.258a.145.145 0 0 1 0 .274l-.774.258a1.16 1.16 0 0 0-.732.732l-.258.774a.145.145 0 0 1-.274 0l-.258-.774a1.16 1.16 0 0 0-.732-.732l-.774-.258a.145.145 0 0 1 0-.274l.774-.258c.346-.115.617-.386.732-.732z"/></svg></button>';
}

function apiPageUrl(relativeFile) {
  const route = relativeFile
    .replaceAll(path.sep, "/")
    .replace(/index\.html$/, "");
  return new URL(route, API_URL).href;
}

function transformApiHtml(html, relativeFile) {
  const cleanHtml = html
    .replace(
      /<!-- vue-screenfull-seo:start -->[\s\S]*?<!-- vue-screenfull-seo:end -->/g,
      "",
    )
    .replace(/<nav class="vue-screenfull-project-links"[\s\S]*?<\/nav>/g, "")
    .replace(/<aside class="pwa-update"[\s\S]*?<\/aside>/g, "")
    .replace(/<p class="pwa-status"[\s\S]*?<\/p>/g, "");
  const isIndex = relativeFile === "index.html";
  const routeName = path.basename(relativeFile, ".html");
  const existingTitle = cleanHtml
    .match(/<title>([^<]+)<\/title>/i)?.[1]
    ?.replace(/ API Reference$/, "")
    .trim();
  if (!existingTitle)
    throw new Error(`Missing TypeDoc title in ${relativeFile}`);

  const isGenericTypeDocPage = ["hierarchy", "modules"].includes(routeName);
  const title = isIndex
    ? API_TITLE
    : isGenericTypeDocPage
      ? `vue-screenfull ${routeName.replace(/^./, (value) => value.toUpperCase())} API Reference`
      : `${existingTitle} API Reference`;
  const description = isIndex
    ? API_DESCRIPTION
    : `TypeScript API reference for ${title.replace(/ API Reference$/, "")} in vue-screenfull.`;
  const url = apiPageUrl(relativeFile);
  const assetPrefix = "../".repeat(
    relativeFile.replaceAll(path.sep, "/").split("/").length,
  );
  const structuredData = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "TechArticle",
    name: title,
    description,
    url,
    isPartOf: {
      "@type": "WebSite",
      name: "vue-screenfull",
      url: SITE_URL,
    },
    about: {
      "@type": "SoftwareSourceCode",
      name: "vue-screenfull",
      codeRepository: GITHUB_URL,
    },
  });
  const metadata = `<title>${escapeAttribute(title)}</title>${[
    "<!-- vue-screenfull-seo:start -->",
    `<meta name="description" content="${escapeAttribute(description)}"/>`,
    `<link rel="canonical" href="${url}"/>`,
    `<link rel="icon" href="${FAVICON_URL}" type="image/png"/>`,
    `<link rel="manifest" href="${MANIFEST_URL}"/>`,
    `<meta name="theme-color" content="${THEME_COLOR}" data-theme-color data-theme-color-light="${THEME_CONFIG.colorLight}" data-theme-color-dark="${THEME_CONFIG.colorDark}"/>`,
    `<script src="${assetPrefix}assets/theme.js"></script>`,
    `<link rel="stylesheet" href="${assetPrefix}theme.css"/>`,
    '<meta property="og:type" content="website"/>',
    '<meta property="og:site_name" content="vue-screenfull"/>',
    `<meta property="og:title" content="${escapeAttribute(title)}"/>`,
    `<meta property="og:description" content="${escapeAttribute(description)}"/>`,
    `<meta property="og:url" content="${url}"/>`,
    '<meta name="twitter:card" content="summary"/>',
    `<meta name="twitter:title" content="${escapeAttribute(title)}"/>`,
    `<meta name="twitter:description" content="${escapeAttribute(description)}"/>`,
    `<script type="application/ld+json">${structuredData}</script>`,
    `<script src="${assetPrefix}assets/pwa.js" defer></script>`,
    "<!-- vue-screenfull-seo:end -->",
  ].join("")}`;

  let output = cleanHtml
    .replace(/<title>[^<]*<\/title>/i, "")
    .replace(/<meta name="description"[^>]*\/>/i, "")
    .replace(/<link rel="canonical"[^>]*\/>/i, "")
    .replace(/<link rel="icon"[^>]*\/>/i, "")
    .replace(/<script>[^<]*document\.body\.style\.display[^<]*<\/script>/i, "")
    .replace("</head>", `${metadata}</head>`)
    .replace(
      '<div class="tsd-toolbar-contents container">',
      `<div class="tsd-toolbar-contents container"><nav class="vue-screenfull-project-links" aria-label="Project links"><a href="${SITE_URL}">Project home</a><a href="${API_URL}">API overview</a><a href="${NPM_URL}">npm</a>${themeToggleHtml()}</nav>`,
    );

  if (isIndex) {
    output = output.replace(
      /<div class="tsd-page-title">\s*<h1>vue-screenfull<\/h1><\/div>/i,
      "",
    );
  }
  const pwaUi =
    '<aside class="pwa-update" aria-label="Website update" data-pwa-update hidden><span>A new website version is available.</span><button type="button" data-pwa-update-now>Update now</button></aside><p class="pwa-status" role="status" aria-live="polite" data-pwa-status></p>';
  return output.replace("</body>", `${pwaUi}</body>`);
}

function htmlFiles(directory) {
  return readdirSync(directory).flatMap((name) => {
    const absolute = path.join(directory, name);
    if (statSync(absolute).isDirectory()) return htmlFiles(absolute);
    return absolute.endsWith(".html") ? [absolute] : [];
  });
}

function artifactFiles(directory) {
  return readdirSync(directory).flatMap((name) => {
    const file = path.join(directory, name);
    return statSync(file).isDirectory() ? artifactFiles(file) : [file];
  });
}

function fingerprintPages(directory) {
  const hash = createHash("sha256");
  const excluded = new Set(["service-worker.js", "site-version.json"]);
  const files = artifactFiles(directory)
    .filter((file) => {
      const relative = path.relative(directory, file).replaceAll(path.sep, "/");
      return !excluded.has(relative) && !relative.endsWith(".map");
    })
    .sort();
  for (const file of files) {
    hash.update(path.relative(directory, file).replaceAll(path.sep, "/"));
    hash.update("\0");
    hash.update(readFileSync(file));
  }
  return hash.digest("hex").slice(0, 16);
}

function requirePath(file) {
  if (!existsSync(file))
    throw new Error(`Required Pages source is missing: ${file}`);
}

function createManifest() {
  return {
    name: PWA_NAME,
    short_name: PWA_SHORT_NAME,
    description:
      "Installable project website, playground, and API documentation for vue-screenfull.",
    id: SITE_BASE,
    start_url: SITE_BASE,
    scope: SITE_BASE,
    display: "standalone",
    background_color: BACKGROUND_COLOR,
    theme_color: THEME_COLOR,
    icons: PWA_ICONS.map(({ file, ...icon }) => ({
      ...icon,
      src: `${SITE_BASE}images/${file}`,
    })),
  };
}

async function buildPages() {
  const required = [
    api,
    path.join(root, "dist-dev", "index.html"),
    path.join(root, "dist-dev", "playground", "index.html"),
    path.join(root, "dist-dev", "assets", "service-worker-source.js"),
    path.join(site, "offline.html"),
    path.join(site, "robots.txt"),
    path.join(site, "sitemap.xml"),
    path.join(site, "theme.css"),
    path.join(root, "dist-dev", "assets", "theme.js"),
    ...[FAVICON_FILE, ...PWA_ICONS.map(({ file }) => file)].map((file) =>
      path.join(root, "images", file),
    ),
  ];
  required.forEach(requirePath);

  for (const name of readdirSync(docs)) {
    if (name !== "api")
      rmSync(path.join(docs, name), { recursive: true, force: true });
  }
  cpSync(path.join(root, "dist-dev"), docs, { recursive: true });
  rmSync(path.join(docs, "assets", "service-worker-source.js"), {
    force: true,
  });
  rmSync(path.join(docs, "assets", "service-worker-source.js.map"), {
    force: true,
  });
  for (const name of [
    "robots.txt",
    "sitemap.xml",
    "theme.css",
    "offline.html",
  ]) {
    cpSync(path.join(site, name), path.join(docs, name));
  }

  mkdirSync(path.join(docs, "images"), { recursive: true });
  for (const file of [FAVICON_FILE, ...PWA_ICONS.map((icon) => icon.file)]) {
    cpSync(path.join(root, "images", file), path.join(docs, "images", file));
  }
  writeFileSync(
    path.join(docs, "manifest.webmanifest"),
    `${JSON.stringify(createManifest(), null, 2)}\n`,
  );

  for (const file of htmlFiles(api)) {
    const relative = path.relative(api, file);
    const input = readFileSync(file, "utf8");
    writeFileSync(file, transformApiHtml(input, relative));
  }

  writeFileSync(
    path.join(docs, "site-version.json"),
    `${JSON.stringify({ version: fingerprintPages(docs) }, null, 2)}\n`,
  );

  const result = await injectManifest({
    swSrc: path.join(root, "dist-dev", "assets", "service-worker-source.js"),
    swDest: path.join(docs, "service-worker.js"),
    globDirectory: docs,
    globPatterns: ["offline.html", "site-version.json"],
    globIgnores: ["**/*.map", "service-worker.js"],
    maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
  });
  if (!result.count)
    throw new Error("Workbox did not inject any precache entries");
  return result;
}

if (require.main === module) {
  buildPages().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = {
  apiPageUrl,
  buildPages,
  createManifest,
  fingerprintPages,
  transformApiHtml,
};
