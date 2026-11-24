const { test, expect } = require('@playwright/test');
async function prepare(page) {
  await page.goto('./#/tailor');
  await page.getByLabel('Paste text or open a TXT, DOCX or PDF file').check();
  await page.getByLabel('Resume text').fill('Name: Alex\nEmail: private@example.com\nSummary\nBuilt Java services.\nExperience\nEngineer | Example\nOperated production systems.');
  await page.getByLabel('Job description').fill('Java services required\nKubernetes preferred');
  await page.getByLabel('Role (optional)').fill('Evidence review');
  await page.getByRole('button', { name:'Review draft',exact:true }).click();
  return page.getByRole('region',{name:'Job requirements and evidence'});
}
async function add(section, quote) {
  await section.getByLabel('Exact requirement quote').fill(quote);
  await section.getByRole('button',{name:'Add requirement',exact:true}).click();
}
test('requirements link original evidence, persist decisions and notes, and stay out of resume downloads', async ({page}) => {
  const section = await prepare(page);
  await section.getByLabel('Choose a JD line (optional)').selectOption('Java services required');
  await section.getByRole('button',{name:'Add requirement',exact:true}).click();
  const first = section.getByRole('article',{name:'Requirement 1',exact:true});
  await expect(first.getByLabel('Evidence assessment')).toHaveValue('unreviewed');
  const choices = first.getByLabel('Link original resume evidence');
  await expect(choices).not.toContainText('private@example.com');
  await choices.selectOption({label:'Summary: Built Java services.'});
  await first.getByLabel('Evidence assessment').selectOption('supported');
  await first.getByLabel('Requirement priority').selectOption('required');
  await first.getByLabel('Review note (optional)').fill('PRIVATE REVIEW NOTE');
  await add(section,'Kubernetes preferred');
  const second = section.getByRole('article',{name:'Requirement 2',exact:true});
  await second.getByLabel('Evidence assessment').selectOption('gap');
  await expect(section).toContainText('0 unreviewed · 1 supported · 0 partial · 1 gaps');
  await page.getByRole('button',{name:'Save draft',exact:true}).click();
  await page.reload();
  await page.getByRole('button',{name:'Evidence review',exact:true}).click();
  await expect(first.getByLabel('Evidence assessment')).toHaveValue('supported');
  await expect(first.getByLabel('Review note (optional)')).toHaveValue('PRIVATE REVIEW NOTE');
  await expect(second.getByLabel('Evidence assessment')).toHaveValue('gap');
  const saved = await page.evaluate(()=>JSON.parse(localStorage.getItem('voca_career_profile_v1')));
  expect(saved.experiences).toEqual([]);
  expect(saved.tailorDrafts[0].source.profile.summary).toBe('Built Java services.');
  const pending = page.waitForEvent('download');
  await page.getByRole('button',{name:'Download draft DOCX',exact:true}).click();
  const path = await (await pending).path();
  const text = require('child_process').execFileSync('python3',['-c','import sys,zipfile,xml.etree.ElementTree as E; print("".join(E.fromstring(zipfile.ZipFile(sys.argv[1]).read("word/document.xml")).itertext()))',path],{encoding:'utf8'});
  expect(text).toContain('Built Java services.'); expect(text).not.toMatch(/PRIVATE|Kubernetes|Java services required/);
  await first.getByRole('button',{name:'Remove evidence',exact:true}).click();
  await expect(first.getByLabel('Evidence assessment')).toHaveValue('unreviewed');
  await first.getByRole('button',{name:'Remove requirement',exact:true}).click();
  await expect(section.getByRole('article')).toHaveCount(1);
});
test('invented and duplicate requirement quotes fail without altering the checklist', async ({page}) => {
  const section = await prepare(page);
  await add(section,'Invented requirement');
  await expect(section.getByRole('alert')).toBeVisible();
  await expect(section.getByRole('article')).toHaveCount(0);
  await add(section,'Java services required');
  await add(section,'Java services required');
  await expect(section.getByRole('alert')).toBeVisible();
  await expect(section.getByRole('article')).toHaveCount(1);
  const first = section.getByRole('article');
  await expect(first.getByLabel('Evidence assessment').locator('option[value=supported]')).toBeDisabled();
  await first.getByLabel('Link original resume evidence').selectOption({label:'Summary: Built Java services.'});
  await first.getByLabel('Evidence assessment').selectOption('partial');
  await expect(first.getByLabel('Evidence assessment')).toHaveValue('partial');
});
