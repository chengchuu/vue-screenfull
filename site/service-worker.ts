import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { clientsClaim, setCacheNameDetails } from "workbox-core";
import { ExpirationPlugin } from "workbox-expiration";
import { enable as enableNavigationPreload } from "workbox-navigation-preload";
import {
  cleanupOutdatedCaches,
  matchPrecache,
  precacheAndRoute,
} from "workbox-precaching";
import { registerRoute, setCatchHandler } from "workbox-routing";
import { CacheFirst, NetworkFirst } from "workbox-strategies";

declare const __PWA_SCOPE__: string;

interface InjectManifestGlobal extends ServiceWorkerGlobalScope {
  __WB_MANIFEST: Array<{ revision: string | null; url: string }>;
}

const worker = self as unknown as InjectManifestGlobal;
const OFFLINE_URL = `${__PWA_SCOPE__}offline.html`;
const DAY = 24 * 60 * 60;

setCacheNameDetails({ prefix: "vue-screenfull", suffix: "v1" });
cleanupOutdatedCaches();
precacheAndRoute((self as unknown as InjectManifestGlobal).__WB_MANIFEST);
enableNavigationPreload();
clientsClaim();

function isScopedGet(request: Request, url: URL): boolean {
  return (
    request.method === "GET" &&
    url.origin === worker.location.origin &&
    url.pathname.startsWith(__PWA_SCOPE__) &&
    !url.pathname.endsWith(".map")
  );
}

registerRoute(
  ({ request, url }) =>
    isScopedGet(request, url) &&
    (request.mode === "navigate" ||
      request.destination === "document" ||
      url.pathname.endsWith("/") ||
      url.pathname.endsWith(".html")),
  new NetworkFirst({
    cacheName: "vue-screenfull-pages",
    networkTimeoutSeconds: 5,
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({
        maxEntries: 48,
        maxAgeSeconds: 7 * DAY,
        purgeOnQuotaError: true,
      }),
    ],
  }),
  "GET",
);

registerRoute(
  ({ request, url }) =>
    isScopedGet(request, url) &&
    (request.destination === "script" || request.destination === "style"),
  new NetworkFirst({
    cacheName: "vue-screenfull-static",
    networkTimeoutSeconds: 5,
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({
        maxEntries: 96,
        maxAgeSeconds: 30 * DAY,
        purgeOnQuotaError: true,
      }),
    ],
  }),
  "GET",
);

registerRoute(
  ({ request, url }) =>
    isScopedGet(request, url) &&
    (request.destination === "image" || request.destination === "font"),
  new CacheFirst({
    cacheName: "vue-screenfull-assets",
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({
        maxEntries: 64,
        maxAgeSeconds: 30 * DAY,
        purgeOnQuotaError: true,
      }),
    ],
  }),
  "GET",
);

setCatchHandler(async ({ request }) => {
  if (request.destination === "document" || request.mode === "navigate") {
    return (await matchPrecache(OFFLINE_URL)) ?? Response.error();
  }
  return Response.error();
});

worker.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") void worker.skipWaiting();
});
