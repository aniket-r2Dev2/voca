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

