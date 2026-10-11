import { test, expect } from "@playwright/test";

test("pauses and resumes a running match", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Play" }).click();
  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();

  await page.getByRole("button", { name: "Pause" }).click();
  await expect(page.getByRole("heading", { name: "PAUSED" })).toBeVisible();

  await page.getByRole("button", { name: "Continuar partida" }).click();

  await expect(page.getByRole("heading", { name: "PAUSED" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
});

test("pauses automatically when the browser window loses focus", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Play" }).click();
  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();

  await page.evaluate(() => {
    window.dispatchEvent(new Event("blur"));
  });

  await expect(page.getByRole("heading", { name: "PAUSED" })).toBeVisible();
});

test("returns to the main menu from the pause screen", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Play" }).click();
  await page.getByRole("button", { name: "Pause" }).click();

  await expect(page.getByRole("heading", { name: "PAUSED" })).toBeVisible();

  await page.getByRole("button", { name: "MAIN MENU" }).click();

  await expect(
    page.getByRole("heading", { name: "PIRATE BATTLE" }),
  ).toBeVisible();

  await expect(page.getByRole("button", { name: "Play" })).toBeVisible();
});

test("persists game options after reloading the page", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Options" }).click();

  await expect(page.getByRole("heading", { name: "Options" })).toBeVisible();
  await expect(page.getByText("90 s", { exact: true })).toBeVisible();

  await page
    .getByRole("button", { name: "Increase game session time" })
    .click();

  await expect(page.getByText("120 s", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "MAIN MENU" }).click();

  await expect(
    page.getByRole("heading", { name: "PIRATE BATTLE" }),
  ).toBeVisible();

  await page.reload();

  await page.getByRole("button", { name: "Options" }).click();

  await expect(page.getByText("120 s", { exact: true })).toBeVisible();
});
