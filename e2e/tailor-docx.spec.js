const { test, expect } = require('@playwright/test');
const { ZipWriter, Uint8ArrayWriter, TextReader } = require('@zip.js/zip.js');

const mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
async function documentFile() {
  const zip = new ZipWriter(new Uint8ArrayWriter(), { useWebWorkers: false });
  await zip.add('[Content_Types].xml', new TextReader('<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'));
  await zip.add('_rels/.rels', new TextReader('<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'));
  await zip.add('word/document.xml', new TextReader('<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Name: Alex</w:t></w:r></w:p><w:p><w:r><w:t>Built developer tools.</w:t></w:r></w:p></w:body></w:document>'));
  return Buffer.from(await zip.close());
}

test('open a compressed Word resume, correct it, and recover from a failed replacement', async ({ page }) => {
  await page.goto('./#/tailor');
  await page.getByLabel('Paste text or open a TXT or DOCX file').check();
  const file = page.getByLabel('Open TXT (1 MiB) or DOCX (5 MiB)');
  await file.setInputFiles({ name: 'resume.docx', mimeType, buffer: await documentFile() });
  const editor = page.getByLabel('Resume text');
  await expect(editor).toHaveValue('Name: Alex\nBuilt developer tools.');
  await editor.fill('Name: Alex\nBuilt identity services.');
  await file.setInputFiles({ name: 'broken.docx', mimeType, buffer: Buffer.from('broken') });
  await expect(page.getByRole('alert')).toContainText('DOCX');
  await expect(editor).toHaveValue('Name: Alex\nBuilt identity services.');
  expect(await page.evaluate(() => localStorage.getItem('voca_career_profile_v1'))).toBeNull();
  await page.getByLabel('Job description').fill('Develop identity services');
  await page.getByRole('button', { name: 'Review draft' }).click();
  await expect(page.getByLabel('Edit draft summary')).toHaveValue('Built identity services.');
});
