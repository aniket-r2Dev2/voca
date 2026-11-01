import { jsPDF } from 'jspdf';

const text = (value) => typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
const join = (values, separator = ' | ') => values.map(text).filter(Boolean).join(separator);
const items = (value) => Array.isArray(value) ? value : [];
const dates = (start, end, current) => join([start, current ? 'Present' : end], ' - ');

/** Data-driven reading order, independent of the visual HTML templates. */
export function resumeTextBlocks(career) {
  const blocks = [];
  const add = (value, style = 'body') => { if (text(value)) blocks.push({ text: text(value), style }); };
  const section = (label, rows, render) => {
    const start = blocks.length;
    rows.forEach((row) => { if (row) render(row); });
    if (blocks.length > start) blocks.splice(start, 0, { text: label, style: 'section' });
  };
  const profile = career.profile || {};
  add(profile.fullName, 'title');
  add(profile.headline, 'subtitle');
  add(join([profile.email, profile.phone, profile.location]));
  add(join([profile.linkedin, profile.website]));
  if (text(profile.summary)) { add('Summary', 'section'); add(profile.summary); }
  section('Experience', items(career.experiences), (exp) => {
    add(join([exp.position, exp.company]), 'entry');
    add(join([dates(exp.startDate, exp.endDate, exp.current), exp.location]), 'detail');
    add(exp.description);
    items(exp.achievements).forEach((value) => { if (text(value)) add(`- ${text(value)}`); });
    const skills = join(items(exp.skills), ', ');
    if (skills) add(`Skills: ${skills}`);
  });
  section('Education', items(career.education), (edu) => {
    add(join([edu.degree, edu.institution]), 'entry');
    add(join([dates(edu.startYear, edu.endYear || edu.graduationYear), edu.location]), 'detail');
    if (text(edu.gpa)) add(`Grade: ${text(edu.gpa)}`);
  });
  section('Certifications', items(career.certifications), (cert) => {
    add(join([cert.name, cert.issuer]), 'entry');
    add(join([cert.issueDate, cert.expiryDate ? `Expires: ${text(cert.expiryDate)}` : '']), 'detail');
    if (text(cert.credentialId)) add(`Credential: ${text(cert.credentialId)}`);
    add(cert.url);
  });
  section('Projects', items(career.projects), (project) => {
    add(project.name, 'entry');
    add(dates(project.startDate, project.endDate), 'detail');
    add(project.description);
    add(project.technologies);
    add(join([project.url, project.github]));
  });
  section('Skills', items(career.skills), (skill) => add(typeof skill === 'object' ? skill.name : skill));
  section('Languages', items(career.languages), (language) => add(typeof language === 'object' ? join([language.name, language.proficiency]) : language));
  section('Volunteering', items(career.volunteering), (entry) => {
    if (typeof entry === 'string') { add(entry); return; }
    add(join([entry.role, entry.organization]), 'entry');
    add(dates(entry.startDate, entry.endDate, entry.current), 'detail');
    add(entry.description);
  });
  return blocks;
}

// Standard PDF Helvetica uses WinAnsi. Fail before download for unsupported
// scripts rather than silently emitting corrupt text or dropping characters.
const supportedText = /^[\x20-\x7E\xA0-\xFF\n\r\t\u0152\u0153\u0160\u0161\u0178\u017D\u017E\u0192\u02C6\u02DC\u2013\u2014\u2018\u2019\u201A\u201C\u201D\u201E\u2020\u2021\u2022\u2026\u2030\u2039\u203A\u20AC]*$/;
const styles = {
  title: { size: 22, bold: true, before: 0, after: 2 },
  subtitle: { size: 12, bold: false, before: 0, after: 3 },
  section: { size: 12, bold: true, before: 5, after: 2 },
  entry: { size: 11, bold: true, before: 3, after: 1 },
  detail: { size: 10, bold: false, before: 0, after: 1 },
  body: { size: 10.5, bold: false, before: 0, after: 2 },
};

export function createResumeTextPdf(career, { paperSize = 'a4' } = {}) {
  if (!['a4', 'letter'].includes(paperSize)) throw new Error('Choose A4 or Letter paper.');
  const blocks = resumeTextBlocks(career);
  if (!blocks.length) throw new Error('Add career details before downloading a text PDF.');
  if (blocks.some((block) => !supportedText.test(block.text))) {
    throw new Error('Text PDF currently supports Western European text. This resume contains unsupported characters. Use Download PDF for the visual version; your saved details have not changed.');
  }
  if (blocks.reduce((sum, block) => sum + block.text.length, 0) > 200000) {
    throw new Error('This resume is too long for text PDF export. Shorten it to under 200,000 characters and try again.');
  }
  const pdf = new jsPDF({ unit: 'mm', format: paperSize, compress: true });
  pdf.setProperties({ title: `${text(career.profile?.fullName) || 'Resume'} - Resume`, creator: 'Voca' });
  const width = pdf.internal.pageSize.getWidth();
  const height = pdf.internal.pageSize.getHeight();
  const margin = 18;
  const bottom = height - margin;
  let y = margin;
  const newPage = () => { pdf.addPage(paperSize); y = margin; };
  blocks.forEach((block) => {
    const style = styles[block.style];
    pdf.setFont('helvetica', style.bold ? 'bold' : 'normal');
    pdf.setFontSize(style.size);
    pdf.setTextColor(block.style === 'section' ? 30 : 35, block.style === 'section' ? 64 : 35, block.style === 'section' ? 105 : 35);
    const lineHeight = style.size * 0.352778 * 1.4;
    const lines = pdf.splitTextToSize(block.text.replace(/\r\n?/g, '\n').replace(/\t/g, '    '), width - margin * 2);
    // Keep short headings with at least two following body lines where possible.
    const reserve = ['section', 'entry'].includes(block.style) ? 12 : 0;
    if (y + style.before + Math.min(lines.length, 2) * lineHeight + reserve > bottom) newPage();
    y += style.before;
    lines.forEach((line) => {
      if (y + lineHeight > bottom) newPage();
      pdf.text(line, margin, y + style.size * 0.352778);
      y += lineHeight;
    });
    y += style.after;
  });
  const pages = pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    pdf.setPage(page);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(100);
    pdf.text(`${page} / ${pages}`, width - margin, height - 9, { align: 'right' });
  }
  return pdf;
}
