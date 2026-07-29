const { existsSync, readFileSync, readdirSync, statSync } = require("node:fs");
const path = require("node:path");
const {
  API_DESCRIPTION,
  API_TITLE,
  API_URL,
  PLAYGROUND_DESCRIPTION,
  PLAYGROUND_TITLE,
  PLAYGROUND_URL,
  ROOT_DESCRIPTION,
  ROOT_TITLE,
  SITE_URL,
  THEME_CONFIG,
} = require("./site-config");

const root = path.resolve(__dirname, "..");
const docs = path.join(root, "docs");
const failures = [];

function fail(message) {
  failures.push(message);
}

function matches(html, expression) {
  return [...html.matchAll(expression)];
}

function attribute(html, tag, name, value) {
  const tags = matches(html, new RegExp(`<${tag}\\b[^>]*>`, "gi"));
  for (const match of tags) {
    const attributes = Object.fromEntries(
      matches(match[0], /([:\w-]+)=["']([^"']*)["']/g).map((item) => [
        item[1].toLowerCase(),
        item[2],
      ]),
    );
    if (attributes[name] === value) return attributes;
  }
  return null;
}

function visibleText(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(?:nbsp|amp|lt|gt|quot|#39);/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function validateHeadingOrder(label, html) {
  const levels = matches(html, /<h([1-6])\b/gi).map((match) =>
    Number(match[1]),
  );
  for (let index = 1; index < levels.length; index += 1) {
    if (levels[index] > levels[index - 1] + 1) {
      fail(
        `${label}: heading level jumps from h${levels[index - 1]} to h${levels[index]}`,
      );
    }
  }
}

function validateJsonLd(label, html, expectedUrl) {
  const blocks = matches(
    html,
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  if (blocks.length !== 1) {
    fail(
      `${label}: expected exactly one JSON-LD block, found ${blocks.length}`,
    );
    return;
  }
  try {
    const data = JSON.parse(blocks[0][1]);
    if (data.url !== expectedUrl)
      fail(`${label}: JSON-LD url must be ${expectedUrl}`);
  } catch (error) {
    fail(`${label}: JSON-LD is invalid JSON (${error.message})`);
  }
}

function validatePage({
  label,
  file,
  canonical,
  requiredLinks,
  requireFavicon = false,
  expectedTitle,
  expectedDescription,
  expectedThemeHref,
  expectedThemeScript,
  requireNavigationToggle = false,
}) {
  if (!existsSync(file)) {
    fail(`${label}: missing generated file ${file}`);
    return null;
  }
  const html = readFileSync(file, "utf8");
  const titles = matches(html, /<title>([^<]*)<\/title>/gi);
  if (titles.length !== 1 || !titles[0][1].trim())
    fail(`${label}: expected exactly one non-empty title`);
  const description = attribute(html, "meta", "name", "description");
  if (!description?.content?.trim()) fail(`${label}: missing meta description`);
  if (titles[0]?.[1]?.trim() !== expectedTitle)
    fail(`${label}: title does not match shared site configuration`);
  if (description?.content?.trim() !== expectedDescription)
    fail(`${label}: description does not match shared site configuration`);
  const canonicalTag = attribute(html, "link", "rel", "canonical");
  if (canonicalTag?.href !== canonical)
    fail(`${label}: canonical must be ${canonical}`);
  for (const property of [
    "og:type",
    "og:site_name",
    "og:title",
    "og:description",
    "og:url",
  ]) {
    const tag = attribute(html, "meta", "property", property);
    if (!tag?.content) fail(`${label}: missing ${property}`);
  }
  const ogUrl = attribute(html, "meta", "property", "og:url");
  if (ogUrl?.content !== canonical)
    fail(`${label}: og:url must match canonical`);
  if (
    attribute(html, "meta", "property", "og:title")?.content !==
    titles[0]?.[1]?.trim()
  )
    fail(`${label}: og:title must match the page title`);
  if (
    attribute(html, "meta", "property", "og:description")?.content !==
    description?.content?.trim()
  )
    fail(`${label}: og:description must match the meta description`);
  for (const name of ["twitter:card", "twitter:title", "twitter:description"]) {
    if (!attribute(html, "meta", "name", name)?.content)
      fail(`${label}: missing ${name}`);
  }
  const h1s = matches(html, /<h1\b[^>]*>([\s\S]*?)<\/h1>/gi);
  if (h1s.length !== 1 || !visibleText(h1s[0][1]))
    fail(`${label}: expected exactly one non-empty h1, found ${h1s.length}`);
  if (visibleText(html).length < 180)
    fail(`${label}: initial HTML does not contain enough crawlable text`);
  validateHeadingOrder(label, html);
  validateJsonLd(label, html, canonical);
  for (const href of requiredLinks) {
    if (!attribute(html, "a", "href", href))
      fail(`${label}: missing crawlable link to ${href}`);
  }
  if (requireFavicon && !attribute(html, "link", "rel", "icon"))
    fail(`${label}: missing favicon`);
  if (!attribute(html, "link", "href", expectedThemeHref))
    fail(`${label}: missing shared theme stylesheet ${expectedThemeHref}`);
  if (!attribute(html, "script", "src", expectedThemeScript))
    fail(`${label}: missing shared theme script ${expectedThemeScript}`);
  const themeColor = attribute(html, "meta", "name", "theme-color");
  if (
    themeColor?.["data-theme-color-light"] !== THEME_CONFIG.colorLight ||
    themeColor?.["data-theme-color-dark"] !== THEME_CONFIG.colorDark
  )
    fail(`${label}: theme-color metadata is missing resolved theme colors`);
  if (!/<select\b[^>]*data-theme-select/.test(html))
    fail(`${label}: missing accessible theme selector`);
  if (
    requireNavigationToggle &&
    !/<button\b[^>]*aria-expanded="false"[^>]*data-nav-toggle/.test(html)
  )
    fail(`${label}: missing collapsed mobile navigation control`);
  return {
    title: titles[0]?.[1]?.trim(),
    description: description?.content?.trim(),
  };
}

function findHtml(directory) {
  return readdirSync(directory).flatMap((name) => {
    const file = path.join(directory, name);
    if (statSync(file).isDirectory()) return findHtml(file);
    return file.endsWith(".html") ? [file] : [];
  });
}

function validateApiPages() {
  const apiDirectory = path.join(docs, "api");
  if (!existsSync(apiDirectory)) return;
  const canonicals = new Set();
  const titles = new Set();
  for (const file of findHtml(apiDirectory)) {
    const html = readFileSync(file, "utf8");
    const relative = path
      .relative(apiDirectory, file)
      .replaceAll(path.sep, "/");
    const assetPrefix = "../".repeat(relative.split("/").length);
    const canonical = attribute(html, "link", "rel", "canonical")?.href;
    if (!canonical?.startsWith(API_URL) || !canonical.startsWith("https://"))
      fail(`API ${relative}: invalid canonical ${canonical ?? "(missing)"}`);
    if (canonicals.has(canonical))
      fail(`API ${relative}: duplicate canonical ${canonical}`);
    canonicals.add(canonical);
    if (!attribute(html, "meta", "name", "description"))
      fail(`API ${relative}: missing description`);
    if (!attribute(html, "meta", "property", "og:url"))
      fail(`API ${relative}: missing Open Graph metadata`);
    else if (
      attribute(html, "meta", "property", "og:url")?.content !== canonical
    )
      fail(`API ${relative}: Open Graph URL does not match canonical`);
    if (!attribute(html, "link", "rel", "icon"))
      fail(`API ${relative}: missing favicon`);
    if (!attribute(html, "link", "href", `${assetPrefix}theme.css`))
      fail(`API ${relative}: missing shared theme stylesheet`);
    if (!attribute(html, "script", "src", `${assetPrefix}assets/theme.js`))
      fail(`API ${relative}: missing shared theme script`);
    const themeColor = attribute(html, "meta", "name", "theme-color");
    if (
      themeColor?.["data-theme-color-light"] !== THEME_CONFIG.colorLight ||
      themeColor?.["data-theme-color-dark"] !== THEME_CONFIG.colorDark
    )
      fail(`API ${relative}: missing resolved theme-color metadata`);
    const h1s = matches(html, /<h1\b[^>]*>([\s\S]*?)<\/h1>/gi);
    if (h1s.length !== 1 || !visibleText(h1s[0][1]))
      fail(`API ${relative}: expected exactly one non-empty h1`);
    validateJsonLd(`API ${relative}`, html, canonical);
    const title = html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim();
    if (!title) fail(`API ${relative}: missing title`);
    else if (titles.has(title))
      fail(`API ${relative}: duplicate title ${title}`);
    else titles.add(title);
  }
  return titles;
}

function validateStaticFiles() {
  const robotsPath = path.join(docs, "robots.txt");
  const sitemapPath = path.join(docs, "sitemap.xml");
  for (const asset of ["theme.css", "assets/theme.js"]) {
    if (!existsSync(path.join(docs, asset)))
      fail(`${asset}: missing from Pages artifact`);
  }
  const themeCssPath = path.join(docs, "theme.css");
  if (existsSync(themeCssPath)) {
    const themeCss = readFileSync(themeCssPath, "utf8");
    if (
      !/\[data-nav-enhanced="true"\]\s+\.nav-toggle\s*\{[^}]*display:\s*inline-flex/.test(
        themeCss,
      )
    )
      fail("theme.css: mobile menu control is not gated by enhancement state");
  }
  if (!existsSync(robotsPath)) fail("robots.txt: missing from Pages artifact");
  else {
    const robots = readFileSync(robotsPath, "utf8");
    if (!robots.includes("User-agent: *") || !robots.includes("Allow: /"))
      fail("robots.txt: crawler policy is incomplete");
    if (!robots.includes(`${SITE_URL}sitemap.xml`))
      fail("robots.txt: canonical sitemap URL is missing");
  }
  if (!existsSync(sitemapPath)) {
    fail("sitemap.xml: missing from Pages artifact");
    return;
  }
  const sitemap = readFileSync(sitemapPath, "utf8");
  if (!/^<\?xml[^?]*\?>/.test(sitemap) || !/<urlset\b/.test(sitemap))
    fail("sitemap.xml: invalid XML envelope");
  const locations = matches(sitemap, /<loc>([^<]+)<\/loc>/g).map(
    (match) => match[1],
  );
  const expected = [SITE_URL, API_URL, PLAYGROUND_URL];
  for (const url of expected) {
    if (!locations.includes(url)) fail(`sitemap.xml: missing ${url}`);
  }
  if (new Set(locations).size !== locations.length)
    fail("sitemap.xml: contains duplicate loc entries");
  for (const url of locations) {
    if (!url.startsWith("https://")) fail(`sitemap.xml: non-HTTPS URL ${url}`);
  }
}

function validateSite() {
  failures.length = 0;
  const pages = [
    validatePage({
      label: "Root page",
      file: path.join(docs, "index.html"),
      canonical: SITE_URL,
      requiredLinks: ["./api/", "./playground/"],
      requireFavicon: true,
      expectedTitle: ROOT_TITLE,
      expectedDescription: ROOT_DESCRIPTION,
      expectedThemeHref: "./theme.css",
      expectedThemeScript: "./assets/theme.js",
      requireNavigationToggle: true,
    }),
    validatePage({
      label: "Playground",
      file: path.join(docs, "playground", "index.html"),
      canonical: PLAYGROUND_URL,
      requiredLinks: ["../", "../api/"],
      requireFavicon: true,
      expectedTitle: PLAYGROUND_TITLE,
      expectedDescription: PLAYGROUND_DESCRIPTION,
      expectedThemeHref: "../theme.css",
      expectedThemeScript: "../assets/theme.js",
      requireNavigationToggle: true,
    }),
    validatePage({
      label: "API documentation",
      file: path.join(docs, "api", "index.html"),
      canonical: API_URL,
      requiredLinks: [SITE_URL],
      requireFavicon: true,
      expectedTitle: API_TITLE,
      expectedDescription: API_DESCRIPTION,
      expectedThemeHref: "../theme.css",
      expectedThemeScript: "../assets/theme.js",
    }),
  ].filter(Boolean);
  const titles = pages.map((page) => page.title);
  const descriptions = pages.map((page) => page.description);
  if (new Set(titles).size !== titles.length)
    fail("Primary page titles must be unique");
  if (new Set(descriptions).size !== descriptions.length)
    fail("Primary page descriptions must be unique");
  const apiTitles = validateApiPages() ?? new Set();
  for (const title of titles) {
    if (title !== API_TITLE && apiTitles.has(title))
      fail(`Primary title duplicates an API page title: ${title}`);
  }
  validateStaticFiles();
  if (failures.length) {
    throw new Error(`SEO validation failed:\n- ${failures.join("\n- ")}`);
  }
  return {
    apiPages: findHtml(path.join(docs, "api")).length,
    pages: pages.length,
  };
}

if (require.main === module) {
  try {
    const result = validateSite();
    console.log(
      `SEO validation passed for ${result.pages} primary pages and ${result.apiPages} API pages.`,
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { attribute, validateSite, visibleText };
