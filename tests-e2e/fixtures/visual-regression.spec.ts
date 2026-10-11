import { test, expect } from "@playwright/test";

test("main menu visual baseline", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "PIRATE BATTLE" }),
  ).toBeVisible();

  await expect(page).toHaveScreenshot("main-menu.png", {
    animations: "disabled",
    caret: "hide",
    maxDiffPixelRatio: 0.01,
  });
});

test("arena canvas visual baseline", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Play" }).click();

  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();

  const canvas = page.locator("canvas").first();

  await expect(canvas).toBeVisible({ timeout: 15_000 });

  // Dá tempo para os assets do jogo serem carregados.
  await page.waitForTimeout(1_500);

  // Pausar congela a simulação para facilitar a comparação visual.
  await page.getByRole("button", { name: "Pause" }).click();

  await expect(page.getByRole("heading", { name: "PAUSED" })).toBeVisible();

  await expect(canvas).toHaveScreenshot("arena-canvas.png", {
    animations: "disabled",
    timeout: 15_000,
    maxDiffPixels: 50,
  });
});
