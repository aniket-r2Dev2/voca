import React, { useState } from 'react';
import { skillEvidence, prepareSkillsHandoff, importSkillsHandoff, decideSkill, SKILLS_HANDOFF_LIMIT } from '../../utils/skillsHandoff';
const field = 'block w-full rounded border p-2 dark:bg-slate-800';
function SkillCard({ item, index, onDecide }) {
  const [edit, setEdit] = useState(null);
  return <article aria-label={`Skill suggestion ${index + 1}`} className="space-y-2 rounded border border-gray-400 p-3">
    <h4 className="font-semibold">{item.skill}</h4><p>{item.reason}</p><p className="whitespace-pre-wrap break-words">Source evidence: “{item.evidence.quote}”</p>
    {item.decision === 'pending' ? <div className="space-y-2">
      {edit !== null && <label>Your skill name<input className={field} maxLength={100} value={edit} onChange={e => setEdit(e.target.value)} /></label>}
      <div className="flex flex-wrap gap-3">{edit === null ? <><button className="underline" onClick={() => onDecide('accepted')}>Accept skill</button><button className="underline" onClick={() => setEdit(item.skill)}>Edit skill</button></> : <><button className="underline" onClick={() => onDecide('edited', edit)}>Apply skill name</button><button className="underline" onClick={() => setEdit(null)}>Cancel skill edit</button></>}<button className="underline" onClick={() => onDecide('rejected')}>Reject skill</button></div>
    </div> : <p>Decision: {item.decision}{item.edited && ` · ${item.edited}`}</p>}
  </article>;
}
export default function SkillsHandoff({ review, onChange }) {
  const [selected, setSelected] = useState([]), [request, setRequest] = useState(null), [response, setResponse] = useState(''), [message, setMessage] = useState('');
  const evidence = skillEvidence(review.source), proposals = review.skillProposals || [];
  const pending = proposals.some(item => item.decision === 'pending');
  const fresh = request?.binding === JSON.stringify(review);
  function prepare() { try { setRequest(prepareSkillsHandoff(review, selected, crypto.randomUUID())); setResponse(''); setMessage(''); } catch (err) { setMessage(err.message); } }
  function receive() { try { const next = importSkillsHandoff(response, request, review); onChange(next); setRequest(null); setSelected([]); setResponse(''); setMessage(next.skillProposals.length ? 'Review each skill below before adding it to this draft.' : 'No additional supported skills suggested. Your draft is unchanged.'); } catch (err) { setMessage(err.message); } }
  return <section aria-label="Skills tailoring" className="space-y-3 rounded border border-gray-400 p-4">
    <h3 className="font-semibold">Review skills with your AI chat</h3>
    <p>Select source passages to share with the JD, copy the prompt to your AI chat, and paste its JSON response. Your chat service’s data policies apply. Review the prompt for personal details before sharing.</p>
    <p>Only explicit skill mentions can be added to this draft’s Skills section. Check context: a mention is not proof of proficiency. Edits must also appear in the quoted evidence. Existing skills and experience entries stay unchanged.</p>
    {!evidence.length && <p>No eligible source passages. Add skills or experience to the source resume first. Passages must be at most 8,000 characters.</p>}
    <fieldset disabled={pending} className="space-y-2"><legend>Choose skill evidence to share (up to 20 passages)</legend>{evidence.map(item => <label key={item.id} className="block break-words"><input type="checkbox" checked={selected.includes(item.id)} onChange={e => { setSelected(e.target.checked ? [...selected,item.id] : selected.filter(id => id !== item.id)); setRequest(null); setResponse(''); }} /> {item.label}<span className="block whitespace-pre-wrap text-sm">{item.quote}</span></label>)}</fieldset>
    <button className="underline" disabled={pending || !evidence.length} onClick={prepare}>Prepare skills prompt</button>
    {proposals.length > 0 && <p>Resolve pending skills before another batch. A new response replaces these review cards; approved additions stay in the draft. Choose Save draft to keep your work.</p>}
    {request && <><label>Skills prompt to share<textarea className={field} rows={10} readOnly value={request.prompt} /></label>{!fresh && <p>This draft changed. Prepare a new skills prompt.</p>}<button className="underline" disabled={!fresh} onClick={async () => { try { await navigator.clipboard.writeText(request.prompt); setMessage('Skills prompt copied.'); } catch { setMessage('Select and copy the skills prompt text.'); } }}>Copy reviewed skills prompt</button><label>Skills AI JSON response<textarea className={field} rows={6} maxLength={SKILLS_HANDOFF_LIMIT} value={response} onChange={e => setResponse(e.target.value)} /></label><button className="underline" disabled={!fresh} onClick={receive}>Review skills response</button></>}
    {message && <p role="status">{message}</p>}
    {proposals.map((item,index) => <SkillCard key={item.skill + item.decision} item={item} index={index} onDecide={(decision,edited) => { try { onChange(decideSkill(review,index,decision,edited)); setMessage(''); } catch (err) { setMessage(err.message); } }} />)}
  </section>;
}
