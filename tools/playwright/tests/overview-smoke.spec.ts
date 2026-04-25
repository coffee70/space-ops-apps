import { expect, test } from "@playwright/test";

test("home redirects to the overview application shell @smoke", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/apps\/overview$/);
  await expect(
    page.getByRole("heading", { name: "Operator Overview" })
  ).toBeVisible();
  await expect(page.getByRole("tabpanel", { name: "Watchlist" })).toBeVisible();
  await expect(page.getByText("Key channels: power, thermal, ADCS, comms")).toBeVisible();
  await expect(page.getByText("Loading overview…")).toHaveCount(0);
  await expect(page.getByTestId("applications-nav-item")).toBeVisible();
  await expect(page.getByTestId("current-application-nav-item")).toContainText("Overview");
  await expect(page.getByRole("link", { name: "Documentation", exact: true })).toBeVisible();
});
