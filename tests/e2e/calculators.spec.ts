import { expect, test } from "@playwright/test";

test.describe("calculator smoke tests", () => {
  test("required-grade calculator updates the needed grade", async ({ page }) => {
    await page.goto("/calculators/required-grade");

    await expect(page.getByRole("heading", { name: "Benoetigte Note" })).toBeVisible();
    await expect(page.getByText("3.00")).toBeVisible();

    await page.getByLabel("Ziel-Zeugnisnote").fill("5.0");
    await expect(page.getByText("5.50")).toBeVisible();
  });

  test("BMS calculator loads a passing example", async ({ page }) => {
    await page.goto("/calculators/bms");

    await expect(page.getByRole("heading", { name: "BMS Rechner" })).toBeVisible();
    await expect(page.getByText("Bestanden")).toBeVisible();
    await expect(page.getByText("Alle BMS-Kriterien sind erfuellt.")).toBeVisible();
  });

  test("EFZ calculator loads a passing example", async ({ page }) => {
    await page.goto("/calculators/efz");

    await expect(page.getByRole("heading", { name: "EFZ Rechner" })).toBeVisible();
    await expect(page.getByText("Bestanden")).toBeVisible();
    await expect(page.getByText("Alle EFZ-Kriterien sind erfuellt.")).toBeVisible();
  });
});
