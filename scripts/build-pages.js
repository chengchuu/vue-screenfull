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
  const themeInitializer =
    '(()=>{try{const k="vue-screenfull-theme",v=localStorage.getItem(k)||"system",t=v==="system"?(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):v;document.documentElement.dataset.theme=t==="dark"?"dark":"light";document.documentElement.style.colorScheme=document.documentElement.dataset.theme;localStorage.setItem("tsd-theme",v==="system"?"os":v)}catch{}})();';
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
    `<meta name="theme-color" content="${THEME_COLOR}"/>`,
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
    `<script>${themeInitializer}</script>`,
    `<script src="${assetPrefix}theme.js" defer></script>`,
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
      `<div class="tsd-toolbar-contents container"><nav class="vue-screenfull-project-links" aria-label="Project links"><a href="${SITE_URL}">Project home</a><a href="${API_URL}">API overview</a><a href="${NPM_URL}">npm</a><label class="theme-control"><span>Theme</span><select data-theme-select aria-label="Choose API documentation theme"><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></label></nav>`,
    );

  output = output.replace(
    /<div class="tsd-theme-toggle">[\s\S]*?<\/div>/,
    '<div class="tsd-theme-toggle"><label class="settings-label" for="vue-screenfull-footer-theme">Theme</label><select id="vue-screenfull-footer-theme" data-theme-select aria-label="Choose API documentation theme"><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></div>',
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
    path.join(site, "theme.js"),
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
    "theme.js",
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
