const { test, expect } = require('@playwright/test');

const profile = {
  fullName: 'Alex Engineer',
  headline: 'Senior Software Engineer',
  email: 'alex@example.com',
  phone: '+91 99999 99999',
  location: 'Bengaluru, India',
  linkedin: 'https://linkedin.com/in/alexengineer',
  website: 'https://example.com',
  summary: 'Senior engineer building reliable developer platforms and scalable products.'
};

async function openResume(page) {
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error));

  const response = await page.goto('./resume', { waitUntil: 'domcontentloaded' });
  expect(response).not.toBeNull();
  expect(response.status()).toBeLessThan(400);

  await expect(page.getByRole('heading', { name: 'Resume Builder' })).toBeVisible();
  expect(pageErrors, pageErrors.map((error) => error.stack || error.message).join('\n')).toHaveLength(0);

  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Resume Builder' })).toBeVisible();
}

async function addProfile(page) {
  await page.getByRole('button', { name: 'Add Profile Info', exact: true }).first().click();
  await page.getByLabel('Full Name').fill(profile.fullName);
  await page.getByLabel('Professional Headline').fill(profile.headline);
  await page.getByLabel('Email').fill(profile.email);
  await page.getByLabel('Phone').fill(profile.phone);
  await page.getByLabel('Location').fill(profile.location);
  await page.getByLabel('LinkedIn URL').fill(profile.linkedin);
  await page.getByLabel('Website / Portfolio').fill(profile.website);
  await page.locator('textarea[name="summary"]').fill(profile.summary);
  await page.getByRole('button', { name: 'Save Profile' }).click();
  await expect(page.getByRole('button', { name: /edit profile/i })).toBeVisible();
}

async function addAllSections(page) {
  await page.getByRole('button', { name: /add resume sections/i }).click();
  await page.getByRole('button', { name: /add education/i }).click();
  await page.getByLabel('Degree').fill('B.Tech in Computer Science');
  await page.getByLabel('Institution').fill('Example Institute of Technology');
  await page.getByLabel('Location').fill('Bengaluru, India');
  await page.getByLabel('GPA / Grade').fill('8.8/10');
  await page.getByLabel('Start Year').fill('2017');
  await page.getByLabel('End / Graduation Year').fill('2021');

  await page.getByRole('button', { name: /add certification/i }).click();
  await page.getByLabel('Certification').fill('AWS Certified Developer');
  await page.getByLabel('Issuing Organization').fill('Amazon Web Services');
  await page.getByLabel('Credential ID').fill('AWS-12345');

  await page.getByRole('button', { name: /add project/i }).click();
  await page.getByLabel('Project Name').fill('Developer Platform');
  await page.getByLabel('Technologies').fill('React, Node.js, AWS');
  await page.getByLabel('Project URL').fill('https://example.com/project');
  await page.getByLabel('GitHub URL').fill('https://github.com/example/project');
  await page.locator('textarea[placeholder="What did you build and what impact did it have?"]').fill('Built a developer platform that reduced deployment friction and improved release reliability.');
}

function assertNoHorizontalOverflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
}

const preview = (page) => page.getByTestId('resume-preview');

async function assertContactAlignment(page) {
  const items = preview(page).getByTestId('resume-contact-item');
  const count = await items.count();
  expect(count).toBeGreaterThan(0);

  for (let i = 0; i < count; i += 1) {
    const item = items.nth(i);
    const icon = item.locator('svg');
    const text = item.locator('span').last();
    const [iconBox, textBox] = await Promise.all([icon.boundingBox(), text.boundingBox()]);
    expect(iconBox).not.toBeNull();
    expect(textBox).not.toBeNull();
    const iconCenter = iconBox.y + (iconBox.height / 2);
    const textCenter = textBox.y + (textBox.height / 2);
    expect(Math.abs(iconCenter - textCenter)).toBeLessThanOrEqual(2);
  }
}

async function expectPreviewProject(page) {
  await expect(preview(page).getByRole('heading', { name: 'Developer Platform' })).toBeVisible();
}

test.describe('Resume Builder browser regression', () => {
  test.beforeEach(async ({ page }) => {
    await openResume(page);
  });

  test('desktop builder supports profile, all sections, templates, persistence and PDF export', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop', 'Desktop-only workflow');
    await addProfile(page);
    await addAllSections(page);

    await expect(page.getByText('B.Tech in Computer Science')).toBeVisible();
    await expect(page.getByText('AWS Certified Developer')).toBeVisible();
    await expectPreviewProject(page);

    const savedCareer = await page.evaluate(() => JSON.parse(localStorage.getItem('voca_career_profile_v1')));
    expect(savedCareer.profile.fullName).toBe(profile.fullName);
    expect(savedCareer.education).toHaveLength(1);
    expect(savedCareer.certifications).toHaveLength(1);
    expect(savedCareer.projects).toHaveLength(1);

    for (const template of ['Classic', 'Modern', 'Minimal']) {
      await page.getByRole('button', { name: new RegExp(`^${template}`) }).click();
      await expect(preview(page).getByText('Alex Engineer')).toBeVisible();
      await expectPreviewProject(page);
      await assertContactAlignment(page);
      await expect(preview(page)).toBeVisible();
    }

    expect(await assertNoHorizontalOverflow(page)).toBeTruthy();

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByText('B.Tech in Computer Science')).toBeVisible();
    await expect(page.getByText('AWS Certified Developer')).toBeVisible();
    await expectPreviewProject(page);
    await assertContactAlignment(page);

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /download pdf/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/Resume_Alex Engineer_\d{4}-\d{2}-\d{2}\.pdf/);

    await page.screenshot({ path: testInfo.outputPath('resume-desktop-full.png'), fullPage: true });
  });

  test('desktop dark mode keeps the builder readable and within viewport', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop', 'Desktop-only workflow');
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await expect(page.getByRole('heading', { name: 'Resume Builder' })).toBeVisible();
    expect(await assertNoHorizontalOverflow(page)).toBeTruthy();
    await page.screenshot({ path: testInfo.outputPath('resume-desktop-dark.png'), fullPage: true });
  });

  test('mobile layout has no horizontal overflow and exposes all key controls', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-mobile', 'Mobile-only workflow');
    await expect(page.getByRole('heading', { name: 'Resume Builder' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Profile Info', exact: true }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /^Classic/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Modern/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Minimal/ })).toBeVisible();
    expect(await assertNoHorizontalOverflow(page)).toBeTruthy();
    await page.screenshot({ path: testInfo.outputPath('resume-mobile.png'), fullPage: true });
  });

  test('migrated legacy edits remain visible and future edits only update canonical storage', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop', 'Desktop-only migration test');

    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('user_profile_data', JSON.stringify({
        fullName: 'Legacy Candidate', headline: 'Engineer', email: 'legacy@example.com'
      }));
    });
    await page.reload({ waitUntil: 'domcontentloaded' });

    await expect(preview(page).getByText('Legacy Candidate')).toBeVisible();
    await page.getByRole('button', { name: 'Edit Profile' }).click();
    await page.getByLabel('Full Name').fill('Updated Candidate');
    await page.getByRole('button', { name: 'Save Profile' }).click();

    await expect(preview(page).getByText('Updated Candidate')).toBeVisible();
    const saved = await page.evaluate(() => ({
      canonical: JSON.parse(localStorage.getItem('voca_career_profile_v1')),
      legacy: JSON.parse(localStorage.getItem('user_profile_data'))
    }));
    expect(saved.canonical.profile.fullName).toBe('Updated Candidate');
    expect(saved.legacy.fullName).toBe('Legacy Candidate');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(preview(page).getByText('Updated Candidate')).toBeVisible();
  });

});
