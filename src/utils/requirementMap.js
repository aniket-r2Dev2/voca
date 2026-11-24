import { resumeTextBlocks } from './resumeTextBlocks';

export const REQUIREMENT_LIMIT = 30;
const bounded = (value, max) => typeof value === 'string' && Boolean(value.trim()) && value.length <= max;
// Only section content is eligible; the name/contact header is excluded.
export function requirementEvidence(source) {
  let section = '';
  return resumeTextBlocks(source).flatMap((block, index) => {
    if (block.style === 'section') { section = block.text; return []; }
    return section && bounded(block.text, 8000) ? [{ id: `source-block:${index}`, label: section, quote: block.text }] : [];
  });
}
export function requirementCandidates(description) {
  return [...new Set(description.split(/\r?\n/).map(line => line.trim()).filter(line => bounded(line, 2000)))].slice(0, 100);
}
export function validRequirementMap(rows, source, job) {
  if (rows === undefined) return true;
  if (!Array.isArray(rows) || rows.length > REQUIREMENT_LIMIT || typeof job?.description !== 'string') return false;
  const evidence = new Map(requirementEvidence(source).map(item => [item.id, item.quote]));
  const ids = new Set(), quotes = new Set();
  return rows.every(row => {
    if (!row || !bounded(row.id, 100) || ids.has(row.id) || !bounded(row.quote, 2000) || quotes.has(row.quote) || !job.description.includes(row.quote)) return false;
    ids.add(row.id); quotes.add(row.quote);
    if (!['unspecified', 'required', 'preferred'].includes(row.priority) || !['unreviewed', 'supported', 'partial', 'gap'].includes(row.status)
      || typeof row.note !== 'string' || row.note.length > 2000 || !Array.isArray(row.evidence) || row.evidence.length > 5) return false;
    const links = new Set();
    if (!row.evidence.every(item => {
      if (!item || links.has(item.id) || !bounded(item.quote, 8000) || evidence.get(item.id) !== item.quote) return false;
      links.add(item.id); return true;
    })) return false;
    return (!['supported', 'partial'].includes(row.status) || row.evidence.length > 0) && (row.status !== 'gap' || row.evidence.length === 0);
  });
}
export function updateRequirementMap(review, rows) {
  if (!validRequirementMap(rows, review.source, review.job)) throw new Error('Use unique exact JD quotes (up to 30), valid source evidence and bounded notes. Supported or partial items need evidence; gaps must have no linked evidence.');
  return { ...review, requirementMap: rows };
}
