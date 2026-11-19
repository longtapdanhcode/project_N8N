import { afterEach, describe, expect, it, vi } from "vitest";
import { decodeKey, disablePush, enablePush, getPushState } from "../../src/lib/push";

const KEY = "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U";

function fakeSubscription(endpoint = "https://push.example.com/1", key = decodeKey(KEY)) {
  return {
    endpoint,
    options: { applicationServerKey: key.buffer },
    toJSON: () => ({ endpoint, keys: { p256dh: "p", auth: "a" } }),
    unsubscribe: vi.fn(async () => true),
  };
}

function setup({
  permission = "default" as NotificationPermission,
  grant = "granted" as NotificationPermission,
  existing = null as ReturnType<typeof fakeSubscription> | null,
  userAgent = "Mozilla/5.0 (X11; Linux x86_64)",
  push = true,
} = {}) {
  const created = fakeSubscription("https://push.example.com/new");
  const pushManager = {
    getSubscription: vi.fn(async () => existing),
    subscribe: vi.fn(async () => created),
  };
  const registration = { pushManager };
  const fetch = vi.fn(async (url: string) =>
    url.endsWith("vapid-public-key")
      ? new Response(JSON.stringify({ publicKey: KEY }), { status: 200 })
      : new Response(JSON.stringify({ success: true }), { status: 200 }),
  );
  vi.stubGlobal("fetch", fetch);
  vi.stubGlobal("navigator", {
    userAgent,
    platform: "Linux",
    maxTouchPoints: 0,
    serviceWorker: {
      ready: Promise.resolve(registration),
      getRegistration: vi.fn(async () => registration),
    },
  });
  vi.stubGlobal("window", {
    ...(push ? { PushManager: class {}, Notification: class {} } : {}),
    matchMedia: () => ({ matches: false }),
  });
  vi.stubGlobal("Notification", {
    permission,
    requestPermission: vi.fn(async () => grant),
  });
  return { fetch, pushManager, created };
}

afterEach(() => vi.unstubAllGlobals());

describe("push state", () => {
  it("asks iPhone users to install the PWA when Push API is missing", async () => {
    setup({ push: false, userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)" });
    expect(await getPushState()).toBe("needs-install");
  });

  it("reports unsupported, denied, off and on", async () => {
    setup({ push: false });
    expect(await getPushState()).toBe("unsupported");
    setup({ permission: "denied" });
    expect(await getPushState()).toBe("denied");
    setup();
    expect(await getPushState()).toBe("off");
    setup({ existing: fakeSubscription() });
    expect(await getPushState()).toBe("on");
  });
});

describe("enablePush", () => {
  it("subscribes with the server key and registers the subscription", async () => {
    const { fetch, pushManager } = setup();
    expect(await enablePush()).toBe("on");
    expect(pushManager.subscribe).toHaveBeenCalledWith({
      userVisibleOnly: true,
      applicationServerKey: decodeKey(KEY),
    });
    const [url, init] = fetch.mock.calls[1] as unknown as [string, RequestInit];
    expect(url).toBe("/api/push/subscriptions");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body)).subscription.endpoint).toBe(
      "https://push.example.com/new",
    );
  });

  it("does nothing when the user declines", async () => {
    const { fetch, pushManager } = setup({ grant: "denied" });
    expect(await enablePush()).toBe("denied");
    expect(fetch).not.toHaveBeenCalled();
    expect(pushManager.subscribe).not.toHaveBeenCalled();
  });

  it("replaces a subscription made with an old server key", async () => {
    const old = fakeSubscription("https://push.example.com/old", new Uint8Array([1, 2, 3]));
    const { pushManager } = setup({ existing: old });
    await enablePush();
    expect(old.unsubscribe).toHaveBeenCalled();
    expect(pushManager.subscribe).toHaveBeenCalled();
  });
});

describe("disablePush", () => {
  it("tells the server, then unsubscribes the browser", async () => {
    const existing = fakeSubscription();
    const { fetch } = setup({ existing });
    expect(await disablePush()).toBe("off");
    const [, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.method).toBe("DELETE");
    expect(JSON.parse(String(init.body))).toEqual({ endpoint: existing.endpoint });
    expect(existing.unsubscribe).toHaveBeenCalled();
  });

  it("still unsubscribes the browser when the server call fails", async () => {
    const existing = fakeSubscription();
    const { fetch } = setup({ existing });
    fetch.mockRejectedValueOnce(new TypeError("offline"));
    await expect(disablePush()).rejects.toThrow();
    expect(existing.unsubscribe).toHaveBeenCalled();
  });
});
