const { test, expect } = require("@playwright/test");
const text =
  "Name: Alex Import\nEmail: alex@example.com\nSummary\nBuilds reliable tools.\nExperience\nEngineer | Example Co\nDelivered services.\nEducation\nBSc | Example University\n";
const upload = (page, content = text, name = "resume.txt") =>
  page
    .getByLabel("Choose TXT resume")
    .setInputFiles({
      name,
      mimeType: "text/plain",
      buffer: Buffer.from(content),
    });
const stored = (page) =>
  page.evaluate(() => localStorage.getItem("voca_career_profile_v1"));

test.beforeEach(async ({ page }) => {
  await page.goto("./#/resume");
  await expect(
    page.getByRole("heading", { name: "Resume Builder" }),
  ).toBeVisible();
});

test("review, edit, confirm, reload and export an imported resume", async ({
  page,
}) => {
  const before = await stored(page);
  await page.getByRole('button', { name: 'Add Profile Info', exact: true }).first().click();
  await page.getByLabel('Full Name').fill('Unsaved old editor');
  await upload(page);
  await expect(page.getByLabel("Import name", { exact: true })).toHaveValue(
    "Alex Import",
  );
  expect(await stored(page)).toBe(before);
  await page.getByLabel("Import name", { exact: true }).fill("Alex Reviewed");
  await page.getByLabel("Experience 1: Company").fill("Reviewed Company");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Confirm Resume Import" }).click();
  await expect(page.getByRole("status")).toContainText("Resume imported");
  await expect(page.getByLabel('Full Name')).toHaveCount(0);
  await page.reload();
  const preview = page.getByTestId("resume-preview");
  await expect(preview).toContainText("Alex Reviewed");
  await expect(preview).toContainText("Reviewed Company");
  await expect(preview).toContainText("Example University");
  for (const template of ['Classic', 'Modern', 'Minimal']) {
    await page.getByRole('button', { name: new RegExp(`^${template}`) }).click();
    await expect(preview).not.toContainText('0 months');
    await expect(preview).toContainText('Reviewed Company');
  }
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PDF", exact: true }).click();
  expect((await download).suggestedFilename()).toMatch(
    /Resume_Alex Reviewed.*\.pdf$/,
  );
  await page.getByRole("button", { name: "Edit Profile", exact: true }).click();
  await expect(page.getByLabel("Full Name")).toHaveValue(
    "Alex Reviewed",
  );
});

test("cancel and rejected confirmation preserve saved data; HTML stays literal", async ({
  page,
}) => {
  await upload(page);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Confirm Resume Import" }).click();
  const before = await stored(page);
  await upload(
    page,
    "Name: Replacement\n<script>window.importExecuted=true</script>",
  );
  await expect(
    page.getByLabel("Unmapped text (included in summary)"),
  ).toHaveValue("<script>window.importExecuted=true</script>");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Confirm Resume Import" }).click();
  expect(await stored(page)).toBe(before);
  await page
    .getByRole("button", { name: "Cancel Import", exact: true })
    .click();
  await expect(page.getByLabel("Import name", { exact: true })).toHaveCount(0);
  expect(await stored(page)).toBe(before);
  expect(await page.evaluate(() => window.importExecuted)).toBeUndefined();
});

test("invalid files and storage failure preserve the previous profile", async ({
  page,
}) => {
  await upload(page);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Confirm Resume Import" }).click();
  const before = await stored(page);
  for (const [content, name, message] of [
    ["", "empty.txt", "empty"],
    ["text", "resume.pdf", "not supported"],
    ["a".repeat(1048577), "large.txt", "1 MiB"],
    ["binary\0data", "binary.txt", "binary"],
  ]) {
    await upload(page, content, name);
    await expect(page.getByRole("alert")).toContainText(message);
    expect(await stored(page)).toBe(before);
  }
  await upload(page, "Name: Replacement");
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Full", "QuotaExceededError");
    };
  });
  page.on("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Confirm Resume Import" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Could not save the import",
  );
  await expect(page.getByLabel("Import name", { exact: true })).toHaveValue(
    "Replacement",
  );
  expect(await stored(page)).toBe(before);
});
