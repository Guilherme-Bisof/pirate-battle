import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("displays the main menu and navigation options", async ({ page }) => {
  await expect(
    page.getByRole("heading", { name: "PIRATE BATTLE" }),
  ).toBeVisible();

  await expect(page.getByRole("button", { name: "Play" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Options" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Ranking" })).toBeVisible();

  await expect(
    page.getByRole("button", { name: "Match History" }),
  ).toBeVisible();
});

test("opens options and returns to the main menu", async ({ page }) => {
  await page.getByRole("button", { name: "Options" }).click();

  await expect(page.getByRole("heading", { name: "Options" })).toBeVisible();

  await page.getByRole("button", { name: "Cancel" }).click();

  await expect(
    page.getByRole("heading", { name: "PIRATE BATTLE" }),
  ).toBeVisible();
});

test("starts the game from the Play button", async ({ page }) => {
  await page.getByRole("button", { name: "Play" }).click();

  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();

  await expect(page.getByText("SCORE", { exact: true })).toBeVisible();
});
