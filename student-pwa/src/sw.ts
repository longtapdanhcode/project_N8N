/// <reference lib="webworker" />
import { clientsClaim } from "workbox-core";
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { CacheFirst, NetworkFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { apiUrl } from "./lib/api";
import { flushQueue } from "./lib/syncQueue";

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

// Versioned build assets are precached (cache-first), including the offline app shell.
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
clientsClaim();
registerRoute(
  new NavigationRoute(createHandlerBoundToURL(`${import.meta.env.BASE_URL}index.html`), {
    allowlist: [new RegExp(`^${import.meta.env.BASE_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`)],
    denylist: [/^\/api\//],
  }),
);
registerRoute(
  ({ request }) =>
    ["script", "style", "font", "image"].includes(request.destination),
  new CacheFirst({
    cacheName: "vku-static-v1",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 30 * 86400 }),
    ],
  }),
);
const gradesUrl = new URL(apiUrl("grades/me"), self.location.origin);
registerRoute(
  ({ url, request }) =>
    request.method === "GET" &&
    (url.href === gradesUrl.href ||
      (url.origin === gradesUrl.origin &&
        url.pathname.startsWith(
          new URL(apiUrl("students/"), self.location.origin).pathname,
        ))),
  new NetworkFirst({
    cacheName: "vku-personal-grades-v1",
    networkTimeoutSeconds: 3,
    plugins: [new CacheableResponsePlugin({ statuses: [200] })],
  }),
);

interface BackgroundSyncEvent extends ExtendableEvent {
  tag: string;
}
self.addEventListener("sync", ((event: BackgroundSyncEvent) => {
  if (event.tag !== "sync-events") return;
  event.waitUntil(
    (async () => {
      const result = await flushQueue();
      // Rejection asks the browser to retry. Queue failures remain persisted in Dexie.
      if (result.failed || result.busy) throw new Error("Hàng đợi cần thử lại");
    })(),
  );
}) as EventListener);
