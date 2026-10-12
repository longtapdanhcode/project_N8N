import { db } from "./db";
import { flushQueue } from "./syncQueue";

export type SyncRegistration = ServiceWorkerRegistration & {
  sync?: { register: (tag: string) => Promise<void> };
};
let retryTimer: ReturnType<typeof setTimeout> | undefined;
let running: Promise<void> | undefined;
let stopped = true;

export function registerBackgroundSync() {
  if (!("serviceWorker" in navigator)) return;
  // Never await this from the UI: ready can stay pending in dev/unsupported environments.
  void navigator.serviceWorker.ready
    .then((registration: SyncRegistration) =>
      registration.sync?.register("sync-events"),
    )
    .catch(() => {
      // Safari/iOS or permission denied: online listener and page retry remain active.
    });
}

export function syncNow(): Promise<void> {
  if (running) return running;
  if (!navigator.onLine || stopped) return Promise.resolve();
  clearTimeout(retryTimer);
  running = (async () => {
    window.dispatchEvent(new CustomEvent("sync-state", { detail: "syncing" }));
    try {
      const result = await flushQueue();
      const oldest = await db.syncQueue.orderBy("[createdAt+id]").first();
      window.dispatchEvent(
        new CustomEvent("sync-state", {
          detail: result.failed ? "error" : "idle",
        }),
      );
      if (oldest && !stopped) {
        const delay = result.busy
          ? 1000
          : Math.min(60_000, 2000 * 2 ** Math.min(oldest.retries, 5));
        retryTimer = setTimeout(() => void syncNow(), delay);
        registerBackgroundSync();
      }
    } catch {
      window.dispatchEvent(new CustomEvent("sync-state", { detail: "error" }));
      if (!stopped) retryTimer = setTimeout(() => void syncNow(), 10_000);
    }
  })().finally(() => {
    running = undefined;
  });
  return running;
}

export function scheduleSync() {
  registerBackgroundSync();
  void syncNow();
}

export function startSync() {
  stopped = false;
  const online = () => scheduleSync();
  const visible = () => {
    if (document.visibilityState === "visible") scheduleSync();
  };
  window.addEventListener("online", online); // Required fallback on Safari/iOS.
  document.addEventListener("visibilitychange", visible);
  scheduleSync();
  return () => {
    stopped = true;
    clearTimeout(retryTimer);
    window.removeEventListener("online", online);
    document.removeEventListener("visibilitychange", visible);
  };
}
