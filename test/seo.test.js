/** @jest-environment node */
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { transformApiHtml } = require("../scripts/build-pages");
const { attribute } = require("../scripts/validate-seo");
const { API_URL, SITE_URL } = require("../scripts/site-config");

const typeDocThemeSelector =
  '<div class="tsd-theme-toggle"><label class="settings-label" for="tsd-theme">Theme</label><select id="tsd-theme"><option value="os">OS</option><option value="light">Light</option><option value="dark">Dark</option></select></div>';
const bootstrapThemeIconPaths = ["sun-fill.svg", "moon-stars-fill.svg"].flatMap(
  (name) =>
    [
      ...readFileSync(
        path.join("node_modules", "bootstrap-icons", "icons", name),
        "utf8",
      ).matchAll(/d="([^"]+)"/g),
    ].map((match) => match[1]),
);

function navigationLinks(file, navigationId) {
  const html = readFileSync(file, "utf8");
  const navigation = html.match(
    new RegExp(
      `<nav\\b[^>]*id=["']${navigationId}["'][^>]*>[\\s\\S]*?<ul>([\\s\\S]*?)<\\/ul>`,
    ),
  )[1];
  return [
    ...navigation.matchAll(
      /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/g,
    ),
  ].map((match) => [
    match[1],
    match[2]
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  ]);
}

test("SEO attribute parsing accepts unquoted HTML attributes", () => {
  const html =
    "<a href=./playground/ data-nav-toggle><button class=theme-toggle type=button id=install>Open</button></a>";
  expect(attribute(html, "a", "href", "./playground/")).not.toBeNull();
  expect(attribute(html, "button", "class", "theme-toggle")).not.toBeNull();
  expect(attribute(html, "button", "type", "button")).not.toBeNull();
  expect(attribute(html, "button", "id", "install")).not.toBeNull();
});

test("Home and Playground use the stable five-link navigation", () => {
  expect(navigationLinks("site/index.html", "primary-navigation")).toEqual([
    ["./", "Home"],
    ["./playground/", "Playground"],
    ["#install", "Install"],
    ["#usage", "Usage"],
    ["./api/", "API"],
  ]);
  expect(
    navigationLinks("examples/index.html", "playground-navigation"),
  ).toEqual([
    ["../", "Home"],
    ["./", "Playground"],
    ["../#install", "Install"],
    ["../#usage", "Usage"],
    ["../api/", "API"],
  ]);

  const home = readFileSync("site/index.html", "utf8");
  const playground = readFileSync("examples/index.html", "utf8");
  expect(home).toContain('id="install"');
  expect(home).toContain('id="usage"');
  expect(`${home}${playground}`).not.toMatch(
    /href=["'][^"']*#(?:features|installation|basic-usage)["']/,
  );
  expect(home).not.toMatch(/id=["'](?:installation|basic-usage)["']/);
});

test("API metadata transformation is complete and idempotent", () => {
  const source = `<!doctype html><html><head><title>vue-screenfull</title><meta name="description" content="old"/><link rel="canonical" href="https://example.com/"/><link rel="icon" href="old.png"/></head><body><script>document.body.style.display="none"</script><header><div class="tsd-toolbar-contents container"></div></header><div class="tsd-page-title"><h1>vue-screenfull</h1></div><main><h1>vue-screenfull</h1><h2>API</h2><p>Public API documentation content.</p></main>${typeDocThemeSelector}</body></html>`;
  const transformed = transformApiHtml(source, "index.html");
  expect(transformApiHtml(transformed, "index.html")).toBe(transformed);
  expect(transformed).toContain(`<link rel="canonical" href="${API_URL}"/>`);
  expect(transformed).toContain(`<a href="${SITE_URL}">Project home</a>`);
  expect(transformed).toContain('href="../theme.css"');
  expect(transformed).toContain('src="../assets/theme.js"');
  expect(transformed).toContain("data-theme-color-light=");
  expect(transformed).toContain("data-theme-color-dark=");
  expect(transformed).toContain("data-theme-toggle");
  expect(transformed).toContain(
    'aria-label="Current theme: Light. Switch to dark theme."',
  );
  expect(transformed).not.toContain("data-theme-select");
  expect(transformed).not.toContain("aria-pressed");
  expect(transformed).toContain('data-theme-icon="light"');
  expect(transformed).toContain('data-theme-icon="dark" hidden');
  expect(transformed).toContain(typeDocThemeSelector);
  expect(transformed.match(/id="tsd-theme"/g)).toHaveLength(1);
  const icons = [
    ...transformed.matchAll(
      /<svg\b[^>]*data-theme-icon="(?:light|dark)"[^>]*>/g,
    ),
  ];
  expect(icons).toHaveLength(2);
  for (const [icon] of icons) {
    expect(icon).toContain('width="16"');
    expect(icon).toContain('height="16"');
    expect(icon).toContain('aria-hidden="true"');
    expect(icon).toContain('focusable="false"');
  }
  for (const iconPath of bootstrapThemeIconPaths)
    expect(transformed).toContain(iconPath);
  expect(transformed.match(/<h1\b/g)).toHaveLength(1);
  expect(transformed).not.toContain('document.body.style.display="none"');
  expect(() =>
    JSON.parse(
      transformed.match(
        /<script type="application\/ld\+json">([^<]+)<\/script>/,
      )[1],
    ),
  ).not.toThrow();
});

test("API subpages receive self-referencing canonical URLs", () => {
  const source =
    '<html><head><title>useScreenfull | vue-screenfull</title></head><body><header><div class="tsd-toolbar-contents container"></div></header><main><h1>useScreenfull</h1></main></body></html>';
  const transformed = transformApiHtml(source, "functions/useScreenfull.html");
  expect(transformed).toContain(
    'href="https://chengchuu.github.io/vue-screenfull/api/functions/useScreenfull.html"',
  );
  expect(transformed).toContain('href="../../theme.css"');
  expect(transformed).toContain("useScreenfull | vue-screenfull API Reference");
});
