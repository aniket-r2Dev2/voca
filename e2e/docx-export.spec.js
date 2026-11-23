const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');

// Independently inspect the downloaded ZIP/XML with Python's standard library.
function inspect(path) {
  return JSON.parse(execFileSync('python3', ['-c', `
import zipfile,xml.etree.ElementTree as E,json,sys
with zipfile.ZipFile(sys.argv[1]) as z:
 assert z.testzip() is None
 roots={p:E.fromstring(z.read(p)) for p in z.namelist()}
 ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
 for relpath,root in roots.items():
 if relpath.endswith('.rels'):
  for rel in root:
   assert 'TargetMode' not in rel.attrib
   base='' if relpath=='_rels/.rels' else 'word/'
   assert base+rel.attrib['Target'] in roots
assert any(x.attrib.get('ContentType')=='application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml' for x in roots['[Content_Types].xml'])
doc=roots['word/document.xml']
 text='\\n'.join(''.join(p.itertext()) for p in doc.findall('.//w:p',ns))
 size=doc.find('.//w:pgSz',ns)
 print(json.dumps({'text':text,'size':size.attrib,'parts':list(roots)}))
`, path], { encoding: 'utf8' }));
}
async function download(page, label) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: label, exact: true }).click();
  const file = await pending;
  expect(await file.failure()).toBeNull();
  expect(file.suggestedFilename()).toMatch(/\.docx$/);
  return { data: inspect(await file.path()), path: await file.path() };
}
for (const paper of ['a4', 'letter']) test(`downloads editable ${paper} DOCX with Unicode and all sections`, async ({ page }) => {
  await page.goto('./#/resume');
  await page.evaluate(() => localStorage.setItem('voca_career_profile_v1', JSON.stringify({
    schemaVersion: 1, profile: { fullName: 'अनिकेत 李 😀', email: 'alex@example.com', summary: 'Builds A & B <systems>.\nSecond paragraph.' },
    experiences: [{ position: 'Engineer', company: 'Example', description: '- Built systems.\n- Improved releases.' }],
    education: [{ degree: 'BSc', institution: 'University' }], certifications: [{ name: 'Certificate' }], projects: [{ name: 'Project', url: 'https://example.com' }],
    skills: ['Java'], languages: ['Hindi'], volunteering: ['Mentor'], metadata: { createdAt: '2026-01-01', updatedAt: '2026-01-01', migration: null }
  })));
  await page.reload();
  const before = await page.evaluate(() => localStorage.getItem('voca_career_profile_v1'));
  await page.getByLabel('DOCX paper size').selectOption(paper);
  const { data, path } = await download(page, 'Download DOCX');
  for (const value of ['अनिकेत 李 😀', 'Builds A & B <systems>.', 'Second paragraph.', 'Engineer | Example', '- Improved releases.', 'University', 'Certificate', 'Project', 'Java', 'Hindi', 'Mentor']) expect(data.text).toContain(value);
  expect(data.size['{http://schemas.openxmlformats.org/wordprocessingml/2006/main}w']).toBe(paper === 'a4' ? '11906' : '12240');
  expect(data.parts).toHaveLength(5);
  expect(await page.evaluate(() => localStorage.getItem('voca_career_profile_v1'))).toBe(before);
  // The resulting package can also be read by the existing local DOCX importer.
  await page.goto('./#/tailor');
  await page.getByLabel('Paste text or open a TXT, DOCX or PDF file').check();
  await page.getByLabel('Open TXT (1 MiB), DOCX or PDF (5 MiB)').setInputFiles({ name: 'resume.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: require('node:fs').readFileSync(path) });
  await expect(page.getByLabel('Resume text')).toHaveValue(/अनिकेत 李 😀/);
});

test('draft DOCX excludes pending wording and exports accepted edits after reopen', async ({ page }) => {
  await page.goto('./#/tailor');
  await page.getByLabel('Paste text or open a TXT, DOCX or PDF file').check();
  await page.getByLabel('Resume text').fill('Name: Alex\nSummary\nBuilt identity services.');
  await page.getByLabel('Job description').fill('PRIVATE JOB DESCRIPTION');
  await page.getByLabel('Role (optional)').fill('DOCX draft');
  await page.getByRole('button', { name: 'Review draft' }).click();
  await page.getByRole('checkbox', { name: /Original summary/ }).check();
  await page.getByRole('button', { name: 'Prepare AI prompt' }).click();
  const prompt = await page.getByLabel('Prompt to share').inputValue();
  const requestId = JSON.parse(prompt.slice(prompt.indexOf('{'))).requestId;
  await page.getByLabel('AI JSON response').fill(JSON.stringify({ requestId, proposed: 'Builds reliable identity services.', reason: 'PRIVATE REASON', evidence: { path: 'profile.summary', quote: 'Built identity services.' } }));
  await page.getByRole('button', { name: 'Review AI response' }).click();
  const pending = (await download(page, 'Download draft DOCX')).data.text;
  expect(pending).toContain('Built identity services.'); expect(pending).not.toContain('Builds reliable'); expect(pending).not.toContain('PRIVATE');
  await page.getByRole('button', { name: 'Accept suggestion' }).click();
  await page.getByRole('button', { name: 'Save draft' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'DOCX draft', exact: true }).click();
  const accepted = (await download(page, 'Download draft DOCX')).data.text;
  expect(accepted).toContain('Builds reliable identity services.'); expect(accepted).not.toContain('Built identity services.'); expect(accepted).not.toContain('PRIVATE');
});
