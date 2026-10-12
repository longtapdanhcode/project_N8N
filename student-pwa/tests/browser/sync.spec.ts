import { test, expect, type Page } from "@playwright/test";

async function queueCount(page: Page) {
  return page.evaluate(
    () =>
      new Promise<number>((resolve, reject) => {
        const open = indexedDB.open("vku-student");
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const database = open.result;
          const count = database
            .transaction("syncQueue")
            .objectStore("syncQueue")
            .count();
          count.onsuccess = () => {
            resolve(count.result);
            database.close();
          };
          count.onerror = () => {
            reject(count.error);
            database.close();
          };
        };
      }),
  );
}

test.beforeEach(async ({ request }) => {
  await request.post("/api/_mock/control", { data: { reset: true } });
});

test("offline attendance survives reload and drains in FIFO order on reconnect", async ({
  page,
  context,
  request,
}) => {
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect(
    page.getByRole("button", { name: "Điểm danh", exact: true }),
  ).toHaveCount(4);
  await context.setOffline(true);
  await page
    .getByRole("article", { name: "Lập trình Web", exact: true })
    .getByRole("button", { name: "Điểm danh" })
    .click();
  await page
    .getByRole("article", { name: "Cơ sở dữ liệu", exact: true })
    .getByRole("button", { name: "Điểm danh" })
    .click();
  await expect(page.getByText("Chờ đồng bộ", { exact: true })).toHaveCount(2);
  await expect(page.getByText("Đang chờ 2 mục", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Chờ đồng bộ", { exact: true })).toHaveCount(2);
  expect(await queueCount(page)).toBe(2);
  await context.setOffline(false);
  await expect(page.getByText("Đã đồng bộ", { exact: true })).toBeVisible();
  await expect(page.getByText("Đã điểm danh", { exact: true })).toHaveCount(2);
  expect(await queueCount(page)).toBe(0);
  const events = await (await request.get("/api/_mock/events")).json();
  expect(events.map((item: { lessonId: string }) => item.lessonId)).toEqual([
    "web-20261012",
    "db-20261012",
  ]);
});

test("online listener drains without Background Sync (Safari/iOS fallback)", async ({
  page,
  context,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(ServiceWorkerRegistration.prototype, "sync", {
      get: () => undefined,
    });
  });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Điểm danh", exact: true }),
  ).toHaveCount(4);
  await context.setOffline(true);
  await page
    .getByRole("button", { name: "Điểm danh", exact: true })
    .first()
    .click();
  await expect(page.getByText("Đang chờ 1 mục")).toBeVisible();
  await context.setOffline(false);
  await expect(page.getByText("Đã điểm danh", { exact: true })).toBeVisible();
  expect(await queueCount(page)).toBe(0);
});

test("failed delivery is visible, retained, and retry sends it only once", async ({
  page,
  request,
}) => {
  await request.post("/api/_mock/control", { data: { failNext: 20 } });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Điểm danh", exact: true })
    .first()
    .click();
  await expect(page.getByText("Lỗi · 1 mục chờ")).toBeVisible();
  expect(await queueCount(page)).toBe(1);
  await request.post("/api/_mock/control", { data: { failNext: 0 } });
  await page.getByRole("button", { name: "Thử lại", exact: true }).click();
  await expect(page.getByText("Đã điểm danh", { exact: true })).toBeVisible();
  expect(await queueCount(page)).toBe(0);
  expect(await (await request.get("/api/_mock/events")).json()).toHaveLength(1);
});

test("service worker sync event drains while page is frozen", async ({
  page,
  context,
  request,
}) => {
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  const cdp = await context.newCDPSession(page);
  let registrationId = "";
  cdp.on(
    "ServiceWorker.workerRegistrationUpdated",
    (event: {
      registrations: Array<{ registrationId: string; scopeURL: string }>;
    }) => {
      registrationId =
        event.registrations.find(
          (item) => item.scopeURL === "http://localhost:4173/",
        )?.registrationId || registrationId;
    },
  );
  await cdp.send("ServiceWorker.enable");
  await expect.poll(() => registrationId).not.toBe("");
  await context.setOffline(true);
  await page
    .getByRole("button", { name: "Điểm danh", exact: true })
    .first()
    .click();
  await expect(page.getByText("Chờ đồng bộ", { exact: true })).toBeVisible();
  await cdp.send("Page.setWebLifecycleState", { state: "frozen" });
  try {
    await context.setOffline(false);
    await cdp.send("ServiceWorker.dispatchSyncEvent", {
      origin: "http://localhost:4173",
      registrationId,
      tag: "sync-events",
      lastChance: false,
    });
    await expect
      .poll(
        async () =>
          (await (await request.get("/api/_mock/events")).json()).length,
      )
      .toBe(1);
  } finally {
    await cdp.send("Page.setWebLifecycleState", { state: "active" });
  }
  await expect(page.getByText("Đã điểm danh", { exact: true })).toBeVisible();
  expect(await queueCount(page)).toBe(0);
});

test("grades fall back to cache after a 3 second network timeout", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.getByRole("button", { name: "Điểm số", exact: true }).click();
  await expect(page.getByText("8.5", { exact: true })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(async () =>
        (await caches.open("vku-personal-grades-v1"))
          .keys()
          .then((keys) => keys.length),
      ),
    )
    .toBe(1);
  await page.getByRole("button", { name: "Lịch học", exact: true }).click();
  await request.post("/api/_mock/control", { data: { gradeDelayMs: 8000 } });
  try {
    const start = Date.now();
    await page.getByRole("button", { name: "Điểm số", exact: true }).click();
    await expect(page.getByText("8.5", { exact: true })).toBeVisible({
      timeout: 5000,
    });
    expect(Date.now() - start).toBeGreaterThanOrEqual(2800);
    expect(Date.now() - start).toBeLessThan(5000);
  } finally {
    await request.post("/api/_mock/control", { data: {} });
  }
});
