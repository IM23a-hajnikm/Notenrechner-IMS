import { expect, test } from "@playwright/test";

test.describe("demo mode", () => {
  test("loads first-run sample data and resets local edits", async ({ page }) => {
    await page.goto("/demo");

    await expect(page.getByRole("heading", { name: "Demo-Modus" })).toBeVisible();
    await expect(page.getByText("Erfasste Noten")).toBeVisible();
    await expect(page.getByText("34", { exact: true }).first()).toBeVisible();

    const gradeForm = page.locator("form").filter({ hasText: "Note erfassen" });
    await gradeForm.getByLabel("Titel").fill("E2E Reset Probe");
    await gradeForm.getByLabel("Note").fill("5.75");
    await gradeForm.getByRole("button", { name: "Note speichern" }).click();
    await expect(page.getByText("E2E Reset Probe")).toBeVisible();

    await page.getByRole("button", { name: "Demo zuruecksetzen" }).click();
    await page.getByRole("button", { name: "Reset bestaetigen" }).click();

    await expect(page.getByText("E2E Reset Probe")).toHaveCount(0);
    await expect(page.getByText("Erfasste Noten")).toBeVisible();
    await expect(page.getByText("34", { exact: true }).first()).toBeVisible();
  });

  test("adds, edits, and deletes a grade", async ({ page }) => {
    await page.goto("/demo");

    const gradeForm = page.locator("form").filter({ hasText: "Note erfassen" });
    await gradeForm.getByLabel("Titel").fill("E2E Demo Probe");
    await gradeForm.getByLabel("Note").fill("5.75");
    await gradeForm.getByLabel("Gewicht").fill("2");
    await gradeForm.getByRole("button", { name: "Note speichern" }).click();

    const gradeCard = page.locator("div.border-b").filter({ hasText: "E2E Demo Probe" });
    await expect(gradeCard).toBeVisible();
    await expect(gradeCard).toContainText("5.75");

    await gradeCard.getByRole("button", { name: "Bearbeiten" }).click();
    const editForm = page.locator("form").filter({ hasText: "Note bearbeiten" });
    await editForm.getByLabel("Note").fill("4.25");
    await editForm.getByRole("button", { name: "Note aktualisieren" }).click();

    await expect(gradeCard).toContainText("4.25");

    await gradeCard.getByRole("button", { name: "Loeschen" }).click();
    await expect(page.getByText("E2E Demo Probe")).toHaveCount(0);
  });

  test("exports and imports CSV grades", async ({ page }) => {
    await page.goto("/demo");

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "CSV exportieren" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("notenrechner-demo-export.csv");

    await page
      .getByLabel("CSV einfuegen")
      .fill(
        "subjectName,termName,title,gradeValue,weight,date,type,notes\nMathematik,3. Semester,E2E CSV Probe,5.25,1,2026-05-01,exam,imported",
      );
    await page.getByRole("button", { name: "CSV pruefen" }).click();
    await expect(page.getByText("1 Notenzeile bereit.")).toBeVisible();

    await page.getByRole("button", { name: "Import bestaetigen" }).click();
    await expect(page.getByText("1 Note importiert.")).toBeVisible();
    await expect(page.getByText("E2E CSV Probe")).toBeVisible();
  });
});
