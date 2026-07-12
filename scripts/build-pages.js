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
const path = require("node:path");
const {
  API_DESCRIPTION,
  API_TITLE,
  API_URL,
  FAVICON_URL,
  GITHUB_URL,
  NPM_URL,
  SITE_URL,
} = require("./site-config");

const root = path.resolve(__dirname, "..");
const docs = path.join(root, "docs");
const api = path.join(docs, "api");
const playground = path.join(docs, "playground");
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
    .replace(/<nav class="vue-screenfull-project-links"[\s\S]*?<\/nav>/g, "");
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
  return output;
}

function htmlFiles(directory) {
  return readdirSync(directory).flatMap((name) => {
    const absolute = path.join(directory, name);
    if (statSync(absolute).isDirectory()) return htmlFiles(absolute);
    return absolute.endsWith(".html") ? [absolute] : [];
  });
}

function requirePath(file) {
  if (!existsSync(file))
    throw new Error(`Required Pages source is missing: ${file}`);
}

function buildPages() {
  const required = [
    api,
    path.join(root, "dist-dev", "index.html"),
    path.join(site, "index.html"),
    path.join(site, "robots.txt"),
    path.join(site, "sitemap.xml"),
    path.join(site, "theme.css"),
    path.join(site, "theme.js"),
  ];
  required.forEach(requirePath);

  rmSync(playground, { recursive: true, force: true });
  mkdirSync(playground, { recursive: true });
  cpSync(path.join(root, "dist-dev"), playground, { recursive: true });
  for (const name of [
    "index.html",
    "robots.txt",
    "sitemap.xml",
    "theme.css",
    "theme.js",
  ]) {
    cpSync(path.join(site, name), path.join(docs, name));
  }

  for (const file of htmlFiles(api)) {
    const relative = path.relative(api, file);
    const input = readFileSync(file, "utf8");
    writeFileSync(file, transformApiHtml(input, relative));
  }
}

if (require.main === module) buildPages();

module.exports = { apiPageUrl, buildPages, transformApiHtml };
