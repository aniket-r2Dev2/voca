const { test, expect } = require('@playwright/test');

test('manual AI handoff reviews only selected source text and requires acceptance', async ({ page }) => {
  await page.goto('./#/tailor');
  await page.getByLabel('Paste text or open a TXT, DOCX or PDF file').check();
  await page.getByLabel('Resume text').fill('Name: Alex\nEmail: private@example.com\nSummary\nBuilt identity services.');
  await page.getByLabel('Job description').fill('Build identity services');
  await page.getByLabel('Role (optional)').fill('Backend engineer');
  await page.getByRole('button', { name: 'Review draft' }).click();
  await page.getByRole('checkbox', { name: /Original summary/ }).check();
  await page.getByRole('button', { name: 'Prepare AI prompt' }).click();
  const prompt = await page.getByLabel('Prompt to share').inputValue();
  expect(prompt).not.toContain('private@example.com');
  const requestId = JSON.parse(prompt.slice(prompt.indexOf('{'))).requestId;
  await page.getByLabel('AI JSON response').fill(JSON.stringify({
    requestId, proposed: 'Builds reliable identity services.', reason: 'Relevant to the role.',
    evidence: { path: 'profile.summary', quote: 'Built identity services.' }
  }));
  await page.getByRole('button', { name: 'Review AI response' }).click();
  await expect(page.getByLabel('Edit draft summary')).toHaveValue('Built identity services.');
  await page.getByRole('button', { name: 'Accept suggestion' }).click();
  await expect(page.getByLabel('Edit draft summary')).toHaveValue('Builds reliable identity services.');
  await page.getByRole('button', { name: 'Save draft' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Backend engineer' }).click();
  await expect(page.getByLabel('Edit draft summary')).toHaveValue('Builds reliable identity services.');
});
