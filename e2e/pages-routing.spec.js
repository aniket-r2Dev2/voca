const { test, expect } = require('@playwright/test');

test.describe('GitHub Pages deep-link behavior', () => {
  for (const route of [
    { hash: 'resume', heading: 'Resume Builder' },
    { hash: 'job-match', heading: 'Job Match' }
  ]) {
    test(route.hash + ' loads directly and survives refresh', async ({ page }) => {
      const response = await page.goto('./#/' + route.hash, { waitUntil: 'domcontentloaded' });
      expect(response.status()).toBe(200);
      await expect(page.getByRole('heading', { name: route.heading })).toBeVisible();
      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { name: route.heading })).toBeVisible();
      await expect(page).toHaveURL(new RegExp('#/' + route.hash + '$'));
    });

    test('old /voca/' + route.hash + ' bookmark redirects to a functioning hash route', async ({ page }) => {
      await page.goto('./' + route.hash, { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(new RegExp('#/' + route.hash + '$'));
      await expect(page.getByRole('heading', { name: route.heading })).toBeVisible();
    });
  }

  test('navigation generates refresh-safe links', async ({ page }) => {
    await page.goto('./', { waitUntil: 'domcontentloaded' });
    await page.getByRole('link', { name: 'Resume' }).click();
    await expect(page).toHaveURL(/#\/resume$/);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Resume Builder' })).toBeVisible();
  });
});
