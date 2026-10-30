const { test, expect } = require('@playwright/test');

const jobDescription = `Senior Backend Engineer\nRequired: Java, Spring Boot, AWS, Kubernetes\nNice to have: Kafka, Terraform\nBachelor's degree preferred`;

const seedProfile = async (page) => {
  await page.evaluate(() => {
    localStorage.setItem('user_profile_data', JSON.stringify({ fullName: 'Alex Engineer', headline: 'Senior Backend Engineer', email: 'alex@example.com', phone: '', location: 'Bengaluru', linkedin: '', website: '', summary: 'Senior engineer building Java services on AWS.' }));
    localStorage.setItem('work_experience_data', JSON.stringify({ version: '1.0', experiences: [{ id: 1, company: 'Acme', position: 'Software Engineer', location: 'Bengaluru', startDate: '2021-01-01', endDate: '', current: true, description: 'Built Spring Boot microservices with Kubernetes.', skills: ['Java', 'AWS', 'Spring Boot'], achievements: [] }] }));
    localStorage.setItem('resume_sections_data', JSON.stringify({ education: [{ id: 1, degree: 'Bachelor of Technology', institution: 'Example University', location: 'Bengaluru', startYear: '2017', endYear: '2021', gpa: '8.8' }], certifications: [], projects: [{ id: 1, name: 'Event Platform', description: 'Kafka based services', technologies: 'Java, Kafka', url: '', github: '', startDate: '', endDate: '' }] }));
  });
};

test.describe('Job Match browser regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./#/job-match', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Job Match' })).toBeVisible();
    await seedProfile(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Job Match' })).toBeVisible();
  });

  test('analyzes a JD and shows matched skills and gaps', async ({ page }, testInfo) => {
    await page.getByLabel('Job description').fill(jobDescription);
    await page.getByRole('button', { name: 'Analyze Match' }).click();
    await expect(page.getByText(/Strong match|Good match|Partial match|Low match/)).toBeVisible();
    await expect(page.getByText('java', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('kubernetes', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('terraform', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Skill coverage')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBeTruthy();
    await page.screenshot({ path: testInfo.outputPath('job-match-desktop.png'), fullPage: true });
  });

  test('persists the JD and analysis after refresh', async ({ page }) => {
    await page.getByLabel('Job description').fill(jobDescription);
    await page.getByRole('button', { name: 'Analyze Match' }).click();
    await expect(page.getByText('Skill coverage')).toBeVisible();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByLabel('Job description')).toHaveValue(jobDescription);
    await expect(page.getByText('Skill coverage')).toBeVisible();
  });

  test('mobile layout keeps the matcher usable', async ({ page }, testInfo) => {
    await expect(page.getByLabel('Job description')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Analyze Match' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBeTruthy();
    await page.screenshot({ path: testInfo.outputPath('job-match-mobile.png'), fullPage: true });
  });
});
