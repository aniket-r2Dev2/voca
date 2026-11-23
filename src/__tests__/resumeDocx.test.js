import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
const { resumeDocxParts } = require('../utils/resumeDocx');
const { extractDocxBody } = require('../utils/docxBody');
const { createEmptyCareerProfile } = require('../utils/careerProfile');
const ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const sample = () => ({ ...createEmptyCareerProfile(), profile: { fullName: 'अनिकेत 李 😀', summary: 'A & B <xml> "text"\nSecond\tline' }, experiences: [{ position: 'Engineer', company: 'Example', description: '- Built systems.\n- Improved reliability.' }], education: [{ degree: 'BSc', institution: 'School' }], certifications: [{ name: 'Certificate' }], projects: [{ name: 'Project' }], skills: ['Java'], languages: ['Hindi'], volunteering: ['Mentor'], job: { description: 'PRIVATE JD' }, tailorDrafts: [{ proposed: 'PRIVATE PROPOSAL' }] });

test.each(['a4', 'letter'])('creates editable %s paragraphs, headings and safe Unicode with all sections', paperSize => {
  const career = sample(); const before = JSON.stringify(career);
  const parts = resumeDocxParts(career, { paperSize });
  for (const xml of Object.values(parts)) expect(new DOMParser().parseFromString(xml, 'application/xml').querySelector('parsererror')).toBeNull();
  const doc = new DOMParser().parseFromString(parts['word/document.xml'], 'application/xml');
  const size = doc.getElementsByTagNameNS(ns, 'pgSz')[0];
  expect(size.getAttribute('w:w')).toBe(paperSize === 'a4' ? '11906' : '12240');
  const content = extractDocxBody(parts['[Content_Types].xml'], parts['word/document.xml']);
  for (const value of ['अनिकेत 李 😀', 'A & B <xml> "text"', 'Second\tline', '- Built systems.', '- Improved reliability.', 'Education', 'Certifications', 'Projects', 'Skills', 'Languages', 'Volunteering']) expect(content).toContain(value);
  expect(content).not.toMatch(/PRIVATE|undefined/);
  expect(parts['word/document.xml']).toContain('w:val="Heading1"');
  expect(parts['word/styles.xml']).toContain('<w:keepNext/>');
  expect(JSON.stringify(career)).toBe(before);
});
test('rejects empty, excessive, invalid XML text and unknown paper size', () => {
  expect(() => resumeDocxParts(createEmptyCareerProfile())).toThrow('Add career details');
  expect(() => resumeDocxParts(sample(), { paperSize: 'a3' })).toThrow('A4 or Letter');
  for (const summary of ['bad\u0000', 'bad\ud800', 'bad\uffff']) expect(() => resumeDocxParts({ profile: { summary } })).toThrow('invalid text');
  expect(() => resumeDocxParts({ profile: { summary: 'a'.repeat(200001) } })).toThrow('too long');
});
test('retains all long paragraphs without injecting markup or external relationships', () => {
  const summary = Array.from({ length: 1000 }, (_, i) => `Line ${i} <w:hyperlink> & text`).join('\n');
  const parts = resumeDocxParts({ profile: { summary } });
  expect(extractDocxBody(parts['[Content_Types].xml'], parts['word/document.xml'])).toContain(summary);
  expect(parts['word/document.xml']).not.toContain('<w:hyperlink>');
  expect(Object.values(parts).join('')).not.toContain('TargetMode="External"');
});
