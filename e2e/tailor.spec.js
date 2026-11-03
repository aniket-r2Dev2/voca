const { test, expect } = require('@playwright/test');

test('review a job-specific resume and export without writing to the master profile', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('link', { name: 'Tailor my resume' }).click();
  await page.getByLabel('Paste text or open a TXT or DOCX file').check();
  await page.getByLabel('Resume text').fill('Name: Alex\nSummary\nBuilds tools.');
  const review = page.getByRole('button', { name: 'Review draft' });
  await review.click();
  await expect(page.getByRole('alert')).toContainText('job description');
  await page.getByLabel('Job description').fill('Build developer tools');
  await page.getByLabel('Role (optional)').fill('Engineer');
  await review.click();
  await expect(page.getByRole('heading', { name: 'Engineer' })).toBeVisible();
  await page.getByLabel('Edit draft summary').fill('Builds developer tools.');
  await expect(page.getByText('Builds developer tools.', { exact: true }).last()).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download draft PDF' }).click();
  expect((await download).suggestedFilename()).toBe('Voca-resume.pdf');
  expect(await page.evaluate(() => localStorage.getItem('voca_career_profile_v1'))).toBeNull();
  await page.getByRole('button', { name: 'Discard draft and edit inputs' }).click();
  await expect(page.getByLabel('Resume text')).toHaveValue('Name: Alex\nSummary\nBuilds tools.');
});

test('save, reopen and delete a draft after reloading', async ({ page }) => {
  await page.goto('./#/tailor');
  await page.getByLabel('Paste text or open a TXT or DOCX file').check();
  await page.getByLabel('Resume text').fill('Name: Alex\nSummary\nOriginal.');
  await page.getByLabel('Role (optional)').fill('Backend Engineer');
  await page.getByLabel('Job description').fill('Build reliable services.');
  await page.getByRole('button', { name: 'Review draft' }).click();
  await page.getByLabel('Edit draft summary').fill('Edited copy.');
  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(page.getByRole('status')).toContainText('saved');
  await page.reload();
  await page.getByRole('button', { name: 'Backend Engineer' }).click();
  await expect(page.getByLabel('Edit draft summary')).toHaveValue('Edited copy.');
  await page.getByText('Original resume', { exact: true }).click();
  await expect(page.getByText('Original.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Back to saved drafts' }).click();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Saved drafts' })).toHaveCount(0);
});

test('review a sample, save custom wording, and export only the approved summary', async ({ page }) => {
  await page.goto('./#/tailor');
  await page.getByLabel('Paste text or open a TXT or DOCX file').check();
  await page.getByLabel('Resume text').fill('Name: Alex\nSummary\nBuilds software. Maintains identity services.');
  await page.getByLabel('Job description').fill('Maintain identity services.');
  await page.getByRole('button', { name: 'Review draft' }).click();
  await page.getByRole('button', { name: 'Try sample suggestion' }).click();
  await expect(page.getByLabel('Edit draft summary')).toHaveValue('Builds software. Maintains identity services.');
  await page.getByRole('button', { name: 'Edit suggestion' }).click();
  await page.getByLabel('Your wording').fill('Maintains identity services for users.');
  await page.getByRole('button', { name: 'Apply my wording' }).click();
  await page.getByRole('button', { name: 'Save draft' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Maintain identity services.' }).click();
  await expect(page.getByText(/Decision: edited/)).toBeVisible();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download draft PDF' }).click();
  const path = await (await pending).path();
  const pdfText = require('child_process').execFileSync('pdftotext', [path, '-'], { encoding: 'utf8' });
  expect(pdfText).toContain('Maintains identity services for users.');
  expect(pdfText).not.toContain('Builds software.');
});
