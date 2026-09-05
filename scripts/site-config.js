const pkg = require("../package.json");

const SITE_URL = new URL(pkg.homepage).href;
const SITE_BASE = new URL(SITE_URL).pathname;
const FAVICON_FILE = "logo-dark-circle-transparent-32x32.png";
const THEME_CONFIG = Object.freeze({
  storageKey: "vue-screenfull-theme",
  colorLight: "#f7f8fc",
  colorDark: "#0d1220",
});
const PWA_ICONS = [
  {
    file: "logo-dark-circle-transparent-192x192.png",
    sizes: "192x192",
    type: "image/png",
    purpose: "any",
  },
  {
    file: "logo-dark-circle-transparent-512x512.png",
    sizes: "512x512",
    type: "image/png",
    purpose: "any",
  },
  {
    file: "logo-dark-circle-transparent-maskable-512x512.png",
    sizes: "512x512",
    type: "image/png",
    purpose: "maskable",
  },
];

module.exports = Object.freeze({
  SITE_URL,
  SITE_BASE,
  API_URL: `${SITE_URL}api/`,
  PLAYGROUND_URL: `${SITE_URL}playground/`,
  GITHUB_URL: "https://github.com/chengchuu/vue-screenfull",
  NPM_URL: "https://www.npmjs.com/package/vue-screenfull",
  FAVICON_FILE,
  FAVICON_URL: `${SITE_BASE}images/${FAVICON_FILE}`,
  MANIFEST_URL: `${SITE_BASE}manifest.webmanifest`,
  SERVICE_WORKER_URL: `${SITE_BASE}service-worker.js`,
  THEME_COLOR: "#5b3fd6",
  THEME_CONFIG,
  BACKGROUND_COLOR: THEME_CONFIG.colorLight,
  PWA_ICONS,
  PWA_NAME: "vue-screenfull documentation",
  PWA_SHORT_NAME: "vue-screenfull",
  ROOT_TITLE: "vue-screenfull - Vue 3 Fullscreen API Utilities",
  ROOT_DESCRIPTION:
    "Reactive, strongly typed fullscreen utilities for Vue 3, including composables, a component, directive, plugin, structured errors, and an optional CSS fallback.",
  PLAYGROUND_TITLE: "vue-screenfull Playground - Vue 3 Fullscreen Examples",
  PLAYGROUND_DESCRIPTION:
    "Try vue-screenfull examples for page, element, image, video, native fullscreen, CSS fallback behavior, events, and structured errors.",
  API_TITLE: "vue-screenfull API Documentation",
  API_DESCRIPTION:
    "API documentation for vue-screenfull composables, controller, component, directive, plugin, options, results, errors, and public TypeScript types.",
});
