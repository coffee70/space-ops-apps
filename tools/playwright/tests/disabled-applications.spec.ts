import { expect, test } from "@playwright/test";
import { appUrl } from "./support/application-routes";

const controlPlaneBaseUrl = "http://control-plane:8100";
const disabledApplicationId = "embedded-demo";

test.afterEach(async ({ request }) => {
  const response = await request.post(
    `${controlPlaneBaseUrl}/registry/applications/${disabledApplicationId}/enable`,
  );
  expect(response.ok()).toBeTruthy();
});

test("launcher hides disabled applications", async ({ page, request }) => {
  const disableResponse = await request.post(
    `${controlPlaneBaseUrl}/registry/applications/${disabledApplicationId}/disable`,
  );
  expect(disableResponse.ok()).toBeTruthy();

  await page.goto(appUrl("overview"));
  await page.getByTestId("applications-nav-item").click();
  await page.getByTestId("applications-launcher-search").fill("disabled");

  await expect(page.getByTestId(`application-option-${disabledApplicationId}`)).toHaveCount(0);
});

test("disabled embedded applications render the shell-owned unavailable state", async ({ page, request }) => {
  const disableResponse = await request.post(
    `${controlPlaneBaseUrl}/registry/applications/${disabledApplicationId}/disable`,
  );
  expect(disableResponse.ok()).toBeTruthy();

  await page.goto(appUrl(disabledApplicationId));

  await expect(page.getByText("Application unavailable")).toBeVisible();
  await expect(page.getByText("The requested application is currently disabled.")).toBeVisible();
  await expect(page.getByTestId("embedded-application-frame")).toHaveCount(0);
});
