const { test, expect } = require('@playwright/test');

test('review a job-specific resume and export without writing to the master profile', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('link', { name: 'Tailor my resume' }).click();
  await page.getByLabel('Paste text or open a TXT file').check();
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
