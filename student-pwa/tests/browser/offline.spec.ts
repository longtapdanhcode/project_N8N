import { test, expect } from "@playwright/test";

test("app shell, fonts and cached grades remain available offline", async ({
  page,
  context,
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
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Học tập", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Bạn đang ngoại tuyến.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Điểm số", exact: true }).click();
  await expect(page.getByText("8.5", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(() => document.fonts.check('14px "Be Vietnam Pro"')),
  ).toBe(true);
});

test("grades explain missing offline cache without an unhandled error", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await context.setOffline(true);
  await page.getByRole("button", { name: "Điểm số", exact: true }).click();
  await expect(
    page.getByText("Chưa tải được điểm số.", { exact: false }),
  ).toBeVisible();
});
