import { expect, test } from "@playwright/test";

test("primary navigation exposes the embedded workspace route", async ({ page }) => {
  await page.goto("/overview");

  const workspaceLink = page.getByRole("link", { name: "Workspace" });
  await expect(workspaceLink).toBeVisible();
  await expect(workspaceLink).toHaveAttribute("href", "/workspace");
});

