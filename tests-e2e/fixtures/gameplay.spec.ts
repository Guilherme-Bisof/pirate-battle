import { test, expect } from "@playwright/test";

async function startMatch(page: import("@playwright/test").Page) {
  await page.goto("/");

  await page.getByRole("button", { name: "Play" }).click();

  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
  await expect(page.getByText("SCORE", { exact: true })).toBeVisible();
  await expect(page.locator("canvas").first()).toBeVisible({
    timeout: 15_000,
  });
}

test("initializes the game arena and HUD", async ({ page }) => {
  await startMatch(page);

  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
  await expect(page.getByText("SCORE", { exact: true })).toBeVisible();
});

test("accepts movement and rotation keyboard controls", async ({ page }) => {
  await startMatch(page);

  for (const key of ["w", "ArrowLeft", "ArrowRight"]) {
    await page.keyboard.down(key);
    await page.waitForTimeout(150);
    await page.keyboard.up(key);
  }

  await expect(page.locator("canvas").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();

  await expect(page.getByRole("heading", { name: "GAME OVER" })).toHaveCount(0);
});

test("accepts frontal and lateral firing controls", async ({ page }) => {
  await startMatch(page);

  await page.keyboard.down("Space");
  await page.waitForTimeout(400);
  await page.keyboard.up("Space");

  await page.keyboard.down("q");
  await page.waitForTimeout(150);
  await page.keyboard.up("q");

  // O disparo lateral tem cooldown de 1,2 segundo.
  await page.waitForTimeout(1_300);

  await page.keyboard.down("e");
  await page.waitForTimeout(150);
  await page.keyboard.up("e");

  await expect(page.locator("canvas").first()).toBeVisible();
  await expect(page.getByText("SCORE", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
});
