import { expect, test } from "@playwright/test";

import { installMockAccountApi } from "./support/mock-account-api";

test.describe("account mode", () => {
  test.beforeEach(async ({ page }) => {
    await installMockAccountApi(page);
  });

  test("registers, logs in, and logs out through the account UI", async ({ page }) => {
    await page.goto("/account/register");

    await page.getByLabel("Name").fill("E2E Student");
    await page.getByLabel("E-Mail").fill("e2e.student@example.test");
    await page.getByLabel("Passwort").fill("DemoStudent123!");
    await page.getByRole("button", { name: "Account erstellen" }).click();

    await expect(page.getByRole("heading", { name: "Account-Modus" })).toBeVisible();
    await expect(page.getByText("e2e.student@example.test")).toBeVisible();

    await page.getByRole("button", { name: "Logout" }).click();
    await expect(page.getByRole("heading", { name: /Noten planen/ })).toBeVisible();

    await page.goto("/account/login");
    await page.getByLabel("E-Mail").fill("e2e.student@example.test");
    await page.getByLabel("Passwort").fill("DemoStudent123!");
    await page.getByRole("button", { name: "Einloggen" }).click();

    await expect(page.getByRole("heading", { name: "Account-Modus" })).toBeVisible();
  });

  test("creates, updates, and deletes subjects, terms, and grades", async ({ page }) => {
    page.on("dialog", (dialog) => dialog.accept());

    await page.goto("/account?view=subjects");

    const subjectForm = page.locator("form").filter({ hasText: "Fach erfassen" });
    await subjectForm.getByLabel("Name", { exact: true }).fill("E2E Fach");
    await subjectForm.getByLabel("Kurzname").fill("E2E");
    await subjectForm.getByRole("button", { name: "Fach speichern" }).click();
    await expect(page.locator("article").filter({ hasText: "E2E Fach" })).toBeVisible();

    await page.locator("article").filter({ hasText: "E2E Fach" }).getByRole("button", { name: "Bearbeiten" }).click();
    const editSubjectForm = page.locator("form").filter({ hasText: "Fach bearbeiten" });
    await editSubjectForm.getByLabel("Name", { exact: true }).fill("E2E Fach Updated");
    await editSubjectForm.getByRole("button", { name: "Fach aktualisieren" }).click();
    await expect(page.locator("article").filter({ hasText: "E2E Fach Updated" })).toBeVisible();

    await page.goto("/account?view=terms");
    const termForm = page.locator("form").filter({ hasText: "Semester erfassen" });
    await termForm.getByLabel("Name", { exact: true }).fill("E2E Semester");
    await termForm.getByLabel("Start").fill("2026-08-01");
    await termForm.getByLabel("Ende").fill("2027-01-31");
    await termForm.getByRole("button", { name: "Semester speichern" }).click();
    const termRow = page.locator("div.border-b").filter({ hasText: "E2E Semester" });
    await expect(termRow).toBeVisible();

    await termRow.getByRole("button", { name: "Bearbeiten" }).click();
    const editTermForm = page.locator("form").filter({ hasText: "Semester bearbeiten" });
    await editTermForm.getByLabel("Name", { exact: true }).fill("E2E Semester Updated");
    await editTermForm.getByRole("button", { name: "Semester aktualisieren" }).click();
    const updatedTermRow = page.locator("div.border-b").filter({ hasText: "E2E Semester Updated" });
    await expect(updatedTermRow).toBeVisible();

    await page.goto("/account?view=grades");
    const gradeForm = page.locator("form").filter({ hasText: "Note erfassen" });
    await gradeForm.getByLabel("Fach").selectOption({ label: "E2E Fach Updated" });
    await gradeForm.getByLabel("Semester").selectOption({ label: "E2E Semester Updated" });
    await gradeForm.getByLabel("Titel").fill("E2E Account Probe");
    await gradeForm.getByLabel("Note").fill("5.5");
    await gradeForm.getByRole("button", { name: "Note speichern" }).click();

    const gradeCard = page.locator("div.border-b").filter({ hasText: "E2E Account Probe" });
    await expect(gradeCard).toBeVisible();
    await expect(gradeCard).toContainText("5.50");

    await gradeCard.getByRole("button", { name: "Bearbeiten" }).click();
    const editGradeForm = page.locator("form").filter({ hasText: "Note bearbeiten" });
    await editGradeForm.getByLabel("Titel").fill("E2E Account Probe Updated");
    await editGradeForm.getByLabel("Note").fill("4.75");
    await editGradeForm.getByRole("button", { name: "Note aktualisieren" }).click();

    const updatedGradeCard = page.locator("div.border-b").filter({ hasText: "E2E Account Probe Updated" });
    await expect(updatedGradeCard).toBeVisible();
    await expect(updatedGradeCard).toContainText("4.75");

    await updatedGradeCard.getByRole("button", { name: "Loeschen" }).click();
    await expect(page.getByText("E2E Account Probe Updated")).toHaveCount(0);

    await page.goto("/account?view=terms");
    await page
      .locator("div.border-b")
      .filter({ hasText: "E2E Semester Updated" })
      .getByRole("button", { name: "Loeschen" })
      .click();
    await expect(page.getByText("E2E Semester Updated")).toHaveCount(0);

    await page.goto("/account?view=subjects");
    await page
      .locator("article")
      .filter({ hasText: "E2E Fach Updated" })
      .getByRole("button", { name: "Loeschen" })
      .click();
    await expect(page.getByText("E2E Fach Updated")).toHaveCount(0);
  });

  test("exports and imports account CSV through the API contract", async ({ page }) => {
    await page.goto("/account");

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "CSV exportieren" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("notenrechner-account-export.csv");

    await page
      .getByLabel("CSV einfuegen")
      .fill(
        "subjectName,termName,title,gradeValue,weight,date,type,notes\nMathematik,3. Semester,E2E Account CSV Probe,5,1,2026-05-01,exam,imported",
      );
    await page.getByRole("button", { name: "CSV pruefen" }).click();
    await expect(page.getByText("1 Notenzeile bereit.")).toBeVisible();

    await page.getByRole("button", { name: "Import bestaetigen" }).click();
    await expect(page.getByText("1 Note importiert.")).toBeVisible();
  });
});
