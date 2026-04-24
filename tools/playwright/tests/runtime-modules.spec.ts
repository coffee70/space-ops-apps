import { expect, test } from "@playwright/test";

test("modules page renders registry-driven entries and opens a module launcher", async ({
  page,
}) => {
  await page.route("**/api/runtime-registry/modules", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          unit_id: "battery-efficiency-module",
          display_name: "Battery Efficiency",
          unit_kind: "module",
          route_slug: "battery-efficiency",
          status: "healthy",
          description: "Live battery efficiency workspace module.",
        },
      ]),
    });
  });

  await page.goto("/modules");

  await expect(page.getByRole("heading", { name: "Modules" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Battery Efficiency" })).toBeVisible();
  await page.getByRole("link", { name: "Open Module" }).click();

  await expect(page).toHaveURL(/\/modules\/battery-efficiency$/);
  await expect(page.locator("iframe")).toHaveAttribute(
    "src",
    "/runtime-modules/battery-efficiency"
  );
});
