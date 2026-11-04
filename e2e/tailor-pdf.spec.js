const { test, expect } = require('@playwright/test');
const { jsPDF } = require('jspdf');

function resumePdf(pages, options) {
  const pdf = new jsPDF({ compress: true, ...options });
  pages.forEach((text, i) => {
    if (i) pdf.addPage();
    if (text) pdf.text(text, 15, 20);
    else pdf.addImage({ data: new Uint8ClampedArray([0, 0, 0, 255]), width: 1, height: 1 }, 'RGBA', 10, 10, 5, 5);
  });
  return Buffer.from(pdf.output('arraybuffer'));
}

test.beforeEach(async ({ page }) => {
  await page.goto('./#/tailor');
  await page.getByLabel('Paste text or open a TXT, DOCX or PDF file').check();
});
const upload = (page, buffer) => page.getByLabel('Open TXT (1 MiB), DOCX or PDF (5 MiB)').setInputFiles({
  name: 'Resume.PDF', mimeType: 'application/pdf', buffer
});

test('review multipage text, flag scanned pages and use the corrected resume', async ({ page }) => {
  await upload(page, resumePdf(['Name: Alex', '', 'Builds developer tools.']));
  const text = page.getByLabel('Resume text');
  await expect(text).toHaveValue('Name: Alex\n\nBuilds developer tools.');
  await expect(page.getByRole('status')).toContainText('Pages without selectable text: 2');
  await text.fill('Name: Alex\nBuilds backend tools.');
  await page.getByLabel('Job description').fill('Build backend tools');
  await page.getByRole('button', { name: 'Review draft' }).click();
  await expect(page.getByLabel('Edit draft summary')).toHaveValue('Builds backend tools.');
  expect(await page.evaluate(() => localStorage.getItem('voca_career_profile_v1'))).toBeNull();
});

test('failed PDF imports preserve reviewed text and explain recovery', async ({ page }) => {
  const editor = page.getByLabel('Resume text');
  await editor.fill('My existing edits');
  for (const [buffer, message] of [
    [resumePdf(['']), 'run OCR'],
    [resumePdf(['Private'], { encryption: { userPassword: 'sample', ownerPassword: 'owner' } }), 'unlocked copy'],
    [Buffer.from('broken'), 'Could not open'],
    [resumePdf(Array(31).fill('Text')), '30 pages'],
    [Buffer.alloc(5 * 1024 * 1024 + 1), '5 MiB']
  ]) {
    await upload(page, buffer);
    await expect(page.getByRole('alert')).toContainText(message);
    await expect(editor).toHaveValue('My existing edits');
  }
});

test('cancel a pending PDF import without replacing earlier edits', async ({ page }) => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route('**/pdf-reader/**/pdf.js', async route => { await gate; await route.continue(); });
  const editor = page.getByLabel('Resume text');
  await editor.fill('Existing text');
  try {
    await upload(page, resumePdf(['Replacement']));
    await page.getByRole('button', { name: 'Cancel import' }).click();
    await expect(editor).toBeEnabled();
    await expect(editor).toHaveValue('Existing text');
  } finally {
    release();
  }
});
