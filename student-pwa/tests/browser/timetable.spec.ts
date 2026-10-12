import { test, expect } from "@playwright/test";

test("Dexie timetable survives offline reload", async ({ page, context }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Lập trình Web", exact: true }),
  ).toBeVisible();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Lập trình Web", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("K.A301", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Lịch học đã lưu trên thiết bị", { exact: false }),
  ).toBeVisible();
});

test("local timetable renders before a delayed API response", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Lập trình Web", exact: true }),
  ).toBeVisible();
  await page.route("**/api/timetable", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const response = await route.fetch();
    const data = await response.json();
    data[0].room = "K.A999";
    await route.fulfill({ json: data });
  });
  await page.reload();
  await expect(page.getByText("K.A301", { exact: true })).toBeVisible({
    timeout: 1500,
  });
  await expect(page.getByText("K.A999", { exact: true })).toBeVisible();
});
