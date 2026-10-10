import { test, expect } from "@playwright/test";

test("displays fixture entries in the ranking", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Ranking" }).click();

  await expect(page.getByRole("heading", { name: "Ranking" })).toBeVisible();

  await expect(page.getByText("Captain Morgan")).toBeVisible();
  await expect(page.getByText("Anne Bonny")).toBeVisible();
  await expect(page.getByText("Blackbeard")).toBeVisible();
});

test("displays the empty state when ranking has no entries", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("pirate-battle-network-scenario", "empty");
  });

  await page.goto("/");

  await page.getByRole("button", { name: "Ranking" }).click();

  await expect(
    page.getByText("No ranking entries for this configuration yet."),
  ).toBeVisible();
});

test("displays the empty state when match history has no entries", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Match History" }).click();

  await expect(
    page.getByRole("heading", { name: "Match History" }),
  ).toBeVisible();

  await expect(
    page.getByText("No completed matches have been registered yet."),
  ).toBeVisible();
});

test("shows an error and offers a retry when ranking fails", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("pirate-battle-network-scenario", "network-error");
  });

  await page.goto("/");

  await page.getByRole("button", { name: "Ranking" }).click();

  await expect(page.getByRole("alert")).toContainText(
    "Unable to load the ranking.",
  );

  await expect(page.getByRole("button", { name: "Try Again" })).toBeVisible();
});
