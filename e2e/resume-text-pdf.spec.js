const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');

const seed = async (page, name = 'José Müller', summary = 'Builds reliable software. €100 – “Résumé” • café') => {
  await page.goto('./#/resume');
  await page.evaluate(({ name, summary }) => {
    localStorage.setItem('voca_career_profile_v1', JSON.stringify({
      schemaVersion: 1,
      profile: { fullName: name, email: 'alex@example.com', headline: 'Software Engineer', summary },
      experiences: [{ position: 'Engineer', company: 'Example Co', description: 'Delivered reliable services.', skills: ['Java'], achievements: ['Improved releases.'] }],
      education: [{ degree: 'BSc', institution: 'Example University', endYear: '2020' }],
      certifications: [{ name: 'Cloud Certificate', credentialId: 'CERT-123' }],
      projects: [{ name: 'Open Project', description: 'Useful tools.', url: 'https://example.com/project' }],
      skills: ['Research'], languages: ['English'], volunteering: [{ organization: 'Science Club' }],
      metadata: { createdAt: '2026-01-01', updatedAt: '2026-01-01', migration: null },
    }));
  }, { name, summary });
  await page.reload();
};

for (const paperSize of ['a4', 'letter']) {
  test(`exports actual selectable text on ${paperSize}`, async ({ page }) => {
    await seed(page);
    await page.getByLabel('Text PDF paper size').selectOption(paperSize);
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download Text PDF', exact: true }).click();
    const download = await downloadPromise;
    const path = await download.path();
    expect(await download.failure()).toBeNull();
    expect(download.suggestedFilename()).toContain(`_text_${paperSize}.pdf`);
    const content = execFileSync('pdftotext', [path, '-'], { encoding: 'utf8' });
    for (const value of ['José Müller', 'alex@example.com', '€100', 'Résumé', 'café', 'Engineer | Example Co', 'Improved releases.', 'Example University', 'CERT-123', 'https://example.com/project', 'Science Club']) expect(content).toContain(value);
    expect(content.indexOf('Summary')).toBeLessThan(content.indexOf('Experience'));
    expect(content.indexOf('Experience')).toBeLessThan(content.indexOf('Education'));
    expect(fs.readFileSync(path, 'latin1')).not.toContain('/Subtype /Image');
    const info = execFileSync('pdfinfo', [path], { encoding: 'utf8' });
    expect(info).toMatch(paperSize === 'a4' ? /595\.28 x 841\.89 pts/ : /612 x 792 pts/);
  });
}

test('long content wraps and survives across pages without lost paragraphs', async ({ page }) => {
  const paragraphs = Array.from({ length: 110 }, (_, i) => `Paragraph ${i}: Building useful products with reliable systems and thoughtful design.`);
  await seed(page, 'Alex Example', paragraphs.join('\n'));
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download Text PDF', exact: true }).click();
  const path = await (await pending).path();
  const extracted = execFileSync('pdftotext', [path, '-'], { encoding: 'utf8' });
  for (let i = 0; i < paragraphs.length; i += 1) expect(extracted).toContain(`Paragraph ${i}:`);
  const info = execFileSync('pdfinfo', [path], { encoding: 'utf8' });
  expect(Number(info.match(/Pages:\s+(\d+)/)[1])).toBeGreaterThan(1);
  expect(extracted).toContain('Science Club');
});

test('unsupported scripts show an error without download or data mutation', async ({ page }) => {
  await seed(page, 'अनिकेत');
  const before = await page.evaluate(() => localStorage.getItem('voca_career_profile_v1'));
  const downloads = [];
  page.on('download', (value) => downloads.push(value));
  await page.getByRole('button', { name: 'Download Text PDF', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('unsupported characters');
  expect(downloads).toHaveLength(0);
  expect(await page.evaluate(() => localStorage.getItem('voca_career_profile_v1'))).toBe(before);
  await expect(page.getByRole('button', { name: 'Download PDF', exact: true })).toBeEnabled();
});
