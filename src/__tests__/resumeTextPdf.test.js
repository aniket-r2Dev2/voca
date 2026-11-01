import { createEmptyCareerProfile } from '../utils/careerProfile';
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
const { createResumeTextPdf, resumeTextBlocks } = require('../utils/resumeTextPdf');

const career = () => {
  const value = createEmptyCareerProfile();
  value.profile = { fullName: 'Alex Example', email: 'alex@example.com', summary: 'Builds reliable products.' };
  value.experiences = [{ position: 'Engineer', company: 'Example', description: 'Delivered services.', skills: ['Java'], achievements: ['Improved releases.'] }];
  value.education = [{ degree: 'BSc', institution: 'University', graduationYear: '2020' }];
  value.certifications = [{ name: 'Cloud Certificate', issuer: 'Example', credentialId: 'CERT-123' }];
  value.projects = [{ name: 'Open Project', description: 'Useful tools.', url: 'https://example.com' }];
  return value;
};

test('exports canonical sections in reading order without invented dates', () => {
  const blocks = resumeTextBlocks(career());
  expect(blocks.filter((block) => block.style === 'section').map((block) => block.text)).toEqual(['Summary', 'Experience', 'Education', 'Certifications', 'Projects']);
  const content = blocks.map((block) => block.text).join('\n');
  expect(content).toContain('Credential: CERT-123');
  expect(content).toContain('https://example.com');
  expect(content).toContain('Improved releases.');
  expect(content).not.toMatch(/undefined|Present|0 months/);
});

test.each(['a4', 'letter'])('creates paginated %s text PDF with long content', (paperSize) => {
  const value = career();
  value.profile.summary = 'Long resume sentence with readable text. '.repeat(700);
  const pdf = createResumeTextPdf(value, { paperSize });
  expect(pdf.getNumberOfPages()).toBeGreaterThan(2);
  expect(pdf.internal.pageSize.getWidth()).toBeCloseTo(paperSize === 'a4' ? 210 : 215.9, 0);
  expect(pdf.output()).toMatch(/^%PDF-/);
  expect(pdf.output()).not.toContain('/Subtype /Image');
});

test('unsupported scripts fail without modifying the source', () => {
  const value = career();
  value.profile.fullName = 'अनिकेत';
  const before = JSON.stringify(value);
  expect(() => createResumeTextPdf(value)).toThrow('unsupported characters');
  expect(JSON.stringify(value)).toBe(before);
});

test('supports Western European accents and punctuation', () => {
  const value = career();
  value.profile.fullName = 'José Müller';
  value.profile.summary = '€100 – “Résumé” • café';
  expect(() => createResumeTextPdf(value)).not.toThrow();
});

test('rejects empty, excessive content and unknown paper sizes', () => {
  expect(() => createResumeTextPdf(createEmptyCareerProfile())).toThrow('Add career details');
  expect(() => createResumeTextPdf(career(), { paperSize: 'a3' })).toThrow('A4 or Letter');
  const value = career();
  value.profile.summary = 'a'.repeat(200001);
  expect(() => createResumeTextPdf(value)).toThrow('too long');
});
