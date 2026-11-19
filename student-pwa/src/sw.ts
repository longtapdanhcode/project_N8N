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
// Activate the updated shell without requiring every student tab to close first.
void self.skipWaiting();
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

// Web Push: thông báo khi AI chấm xong bài. Chỉ mở đường dẫn trong phạm vi PWA.
const scope = new URL(import.meta.env.BASE_URL, self.location.origin);
const safeUrl = (value: unknown) => {
  try {
    const url = new URL(String(value), scope);
    if (url.origin === scope.origin && url.pathname.startsWith(scope.pathname))
      return url.href;
  } catch {
    // Bỏ qua URL hỏng, mở trang chính.
  }
  return scope.href;
};
self.addEventListener("push", (event) => {
  let data: { title?: string; body?: string; url?: string; tag?: string } = {};
  try {
    data = event.data?.json() ?? {};
  } catch {
    data = { body: event.data?.text() };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "VKU · Cổng sinh viên", {
      body: data.body,
      tag: data.tag,
      icon: `${import.meta.env.BASE_URL}icon.svg`,
      data: { url: safeUrl(data.url) },
    }),
  );
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url: string = event.notification.data?.url || scope.href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const open = windows.find((client) =>
        new URL(client.url).pathname.startsWith(scope.pathname),
      );
      if (open) {
        // Ứng dụng đang mở: chuyển tab, không tải lại trang.
        open.postMessage({ type: "open-tab", tab: new URL(url).hash.slice(1) });
        await open.focus();
      } else {
        await self.clients.openWindow(url);
      }
    })(),
  );
});

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
