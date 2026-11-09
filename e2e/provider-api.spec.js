const { test, expect } = require('@playwright/test');
async function prepare(page) {
  await page.goto('./#/tailor');
  await page.getByLabel('Paste text or open a TXT, DOCX or PDF file').check();
  await page.getByLabel('Resume text').fill('Name: Alex\nEmail: private@example.com\nSummary\nBuilt identity services.');
  await page.getByLabel('Job description').fill('Build identity services');
  await page.getByRole('button', { name: 'Review draft' }).click();
  await page.getByRole('checkbox', { name: /Original summary/ }).check();
  await page.getByRole('button', { name: 'Prepare AI prompt' }).click();
  await page.getByLabel('Relay access token').fill('test-relay-secret');
  await page.getByRole('button', { name: 'Check relay connection' }).click();
  await expect(page.getByLabel('OpenAI model')).toHaveValue('test-model');
  await page.getByLabel('OpenAI API key', { exact: true }).fill('test-api-secret');
}
async function mock(page, generate) {
  await page.route('http://127.0.0.1:8787/**', async route => {
    const req = route.request();
    const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET, POST, OPTIONS' };
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    if (req.url().endsWith('/capabilities')) {
      expect(req.headers()['x-provider-key']).toBeUndefined();
      return route.fulfill({ json: { provider: 'openai', models: ['test-model'] }, headers });
    }
    return generate(route, headers);
  });
}
test('API consent, pending review and credential clearing preserve the source', async ({ page }) => {
  let calls = 0;
  await mock(page, async (route, headers) => {
    calls++;
    const payload = route.request().postDataJSON();
    expect(JSON.stringify(payload)).not.toContain('private@example.com');
    expect(route.request().headers()['x-provider-key']).toBe('test-api-secret');
    return route.fulfill({ headers, json: { requestId: payload.requestId, proposed: 'Builds reliable identity services.', reason: 'Matches the role.', evidence: payload.evidence[0] } });
  });
  await prepare(page);
  await expect(page.getByRole('button', { name: 'Generate summary suggestion' })).toBeDisabled();
  expect(calls).toBe(0);
  await page.getByRole('checkbox', { name: /authorize one potentially billable/ }).check();
  await page.getByRole('button', { name: 'Generate summary suggestion' }).click();
  await expect(page.getByRole('button', { name: 'Accept suggestion' })).toBeVisible();
  await expect(page.getByLabel('Edit draft summary')).toHaveValue('Built identity services.');
  await expect(page.getByLabel('Relay access token')).toHaveValue('');
  await page.getByRole('button', { name: 'Accept suggestion' }).click();
  await expect(page.getByLabel('Edit draft summary')).toHaveValue('Builds reliable identity services.');
  await page.getByRole('button', { name: 'Save draft' }).click();
  const storage = await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }));
  expect(storage).not.toContain('test-api-secret'); expect(storage).not.toContain('test-relay-secret');
  expect(calls).toBe(1);
});
for (const cancel of [true, false]) test(`${cancel ? 'Cancellation' : 'Draft edits'} discard late responses without retrying`, async ({ page }) => {
  let calls = 0;
  let release; const gate = new Promise(resolve => { release = resolve; });
  await mock(page, async (route, headers) => {
    calls++; const payload = route.request().postDataJSON(); await gate;
    await route.fulfill({ headers, json: { requestId: payload.requestId, proposed: 'Late summary.', reason: 'Relevant', evidence: payload.evidence[0] } }).catch(() => {});
  });
  await prepare(page);
  await page.getByRole('checkbox', { name: /authorize one potentially billable/ }).check();
  await page.getByRole('button', { name: 'Generate summary suggestion' }).click();
  await expect.poll(() => calls).toBe(1);
  if (cancel) {
    await page.getByRole('button', { name: 'Cancel API request' }).click();
    await expect(page.getByText('Cancelled. Provider charges may still apply.')).toBeVisible();
  }
  await page.getByLabel('Edit draft summary').fill('My own edited summary.');
  release();
  await expect(page.getByLabel('Relay access token')).toHaveValue('');
  await expect(page.getByLabel('Edit draft summary')).toHaveValue('My own edited summary.');
  await expect(page.getByRole('button', { name: 'Accept suggestion' })).toHaveCount(0);
  expect(calls).toBe(1);
});
