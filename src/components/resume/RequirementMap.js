import React, { useState } from 'react';
import { requirementCandidates, requirementEvidence, updateRequirementMap, REQUIREMENT_LIMIT } from '../../utils/requirementMap';

const field = 'block w-full rounded border border-gray-300 bg-white p-2 text-gray-900 dark:bg-slate-900 dark:text-gray-100';
const button = 'rounded border border-gray-400 px-3 py-2 disabled:opacity-50';
export default function RequirementMap({ review, onChange }) {
  const [quote, setQuote] = useState('');
  const [error, setError] = useState('');
  const rows = review.requirementMap || [];
  const evidence = requirementEvidence(review.source);
  const candidates = requirementCandidates(review.job.description);
  const apply = next => {
    try { onChange(updateRequirementMap(review, next)); setError(''); return true; }
    catch (err) { setError(err.message); return false; }
  };
  const change = (id, fields) => apply(rows.map(row => row.id === id ? { ...row, ...fields } : row));
  const count = status => rows.filter(row => row.status === status).length;
  return <section aria-label="Job requirements and evidence" className="space-y-4 rounded-xl border border-gray-300 p-4">
    <h2 className="text-xl font-semibold">Job requirements and evidence</h2>
    <p className="text-sm">Build a checklist from exact JD quotes and link evidence from your original resume. These are your assessments, not an ATS score or an automatic qualification check. A gap means no evidence linked here, not that you lack the skill. This checklist stays out of resume downloads. Choose Save draft to keep it.</p>
    <p aria-live="polite">{count('unreviewed')} unreviewed · {count('supported')} supported · {count('partial')} partial · {count('gap')} gaps</p>
    <label className="block">Choose a JD line (optional)<select className={field} value="" onChange={e => setQuote(e.target.value)}><option value="">Choose a line to review</option>{candidates.map((line, index) => <option key={index} value={line}>{line}</option>)}</select></label>
    <p className="text-sm">The first 100 nonempty lines are available above. You can also paste an exact passage below; headings and benefits are not automatically identified as requirements.</p>
    <label className="block">Exact requirement quote<textarea className={field} maxLength={2000} value={quote} onChange={e => setQuote(e.target.value)} /></label>
    <button type="button" className={button} disabled={rows.length >= REQUIREMENT_LIMIT} onClick={() => {
      if (apply([...rows, { id: crypto.randomUUID(), quote: quote.trim(), priority: 'unspecified', status: 'unreviewed', evidence: [], note: '' }])) setQuote('');
    }}>Add requirement</button>
    <p className="text-sm">{rows.length} of {REQUIREMENT_LIMIT} requirements. Up to 5 evidence passages per requirement.</p>
    {error && <p role="alert" className="text-red-700 dark:text-red-300">{error}</p>}
    {rows.map((row, index) => <article key={row.id} aria-label={`Requirement ${index + 1}`} className="space-y-3 rounded border border-gray-300 p-3">
      <blockquote className="whitespace-pre-wrap break-words">{row.quote}</blockquote>
      <label className="block">Requirement priority<select className={field} value={row.priority} onChange={e => change(row.id, { priority: e.target.value })}><option value="unspecified">Unspecified</option><option value="required">Required</option><option value="preferred">Preferred</option></select></label>
      <label className="block">Evidence assessment<select className={field} value={row.status} onChange={e => change(row.id, { status: e.target.value })}><option value="unreviewed">Unreviewed</option><option value="supported" disabled={!row.evidence.length}>Supported</option><option value="partial" disabled={!row.evidence.length}>Partial</option><option value="gap" disabled={Boolean(row.evidence.length)}>Gap — no linked evidence</option></select></label>
      <label className="block">Link original resume evidence<select className={field} value="" disabled={row.evidence.length >= 5} onChange={e => {
        const item = evidence.find(item => item.id === e.target.value);
        if (item) change(row.id, { evidence: [...row.evidence, { id: item.id, quote: item.quote }], status: 'unreviewed' });
      }}><option value="">Choose supporting evidence</option>{evidence.filter(item => !row.evidence.some(link => link.id === item.id)).map(item => <option key={item.id} value={item.id}>{item.label}: {item.quote.slice(0, 180)}</option>)}</select></label>
      <p className="text-sm">Check the complete linked passage below. Changing evidence resets this assessment to unreviewed.</p>
      {!evidence.length && <p>No eligible source passages. Review the imported resume; empty passages and passages over 8,000 characters are excluded.</p>}
      {row.evidence.map(item => <div key={item.id} className="rounded bg-gray-100 p-3 dark:bg-slate-800"><p className="font-medium">{evidence.find(source => source.id === item.id)?.label}</p><p className="whitespace-pre-wrap break-words">{item.quote}</p><button type="button" className={button} onClick={() => change(row.id, { evidence: row.evidence.filter(link => link.id !== item.id), status: 'unreviewed' })}>Remove evidence</button></div>)}
      <label className="block">Review note (optional)<textarea className={field} maxLength={2000} value={row.note} onChange={e => change(row.id, { note: e.target.value })} /></label>
      <button type="button" className={button} onClick={() => apply(rows.filter(item => item.id !== row.id))}>Remove requirement</button>
    </article>)}
  </section>;
}
