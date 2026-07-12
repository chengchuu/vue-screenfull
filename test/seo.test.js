/** @jest-environment node */
const { transformApiHtml } = require("../scripts/build-pages");
const { API_URL, SITE_URL } = require("../scripts/site-config");

test("API metadata transformation is complete and idempotent", () => {
  const source =
    '<!doctype html><html><head><title>vue-screenfull</title><meta name="description" content="old"/><link rel="canonical" href="https://example.com/"/><link rel="icon" href="old.png"/></head><body><script>document.body.style.display="none"</script><header><div class="tsd-toolbar-contents container"></div></header><div class="tsd-page-title"><h1>vue-screenfull</h1></div><main><h1>vue-screenfull</h1><h2>API</h2><p>Public API documentation content.</p></main></body></html>';
  const transformed = transformApiHtml(source, "index.html");
  expect(transformApiHtml(transformed, "index.html")).toBe(transformed);
  expect(transformed).toContain(`<link rel="canonical" href="${API_URL}"/>`);
  expect(transformed).toContain(`<a href="${SITE_URL}">Project home</a>`);
  expect(transformed).toContain('href="../theme.css"');
  expect(transformed).toContain('src="../theme.js"');
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
