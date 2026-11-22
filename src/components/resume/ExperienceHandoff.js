import React, { useState } from 'react';
import { experienceTargets, prepareExperienceHandoff, importExperienceHandoff, decideExperienceProposal, EXPERIENCE_HANDOFF_LIMIT } from '../../utils/experienceHandoff';
const field = 'block w-full rounded border p-2 dark:bg-slate-800';

function BulletReview({ proposal, target, onDecide }) {
  const [edit, setEdit] = useState(null);
  return <article aria-label={`Experience suggestion ${proposal.experienceIndex + 1}, bullet ${proposal.lineIndex + 1}`} className="space-y-3 rounded border border-gray-400 p-3">
    <h4 className="font-semibold">{target?.label || `Experience ${proposal.experienceIndex + 1}`} · Bullet {proposal.lineIndex + 1}</h4>
    <dl className="space-y-1 whitespace-pre-wrap break-words">
      <dt className="font-semibold">Before</dt><dd>{proposal.before}</dd>
      <dt className="font-semibold">Suggested bullet</dt><dd>{proposal.proposed}</dd>
      <dt className="font-semibold">Reason</dt><dd>{proposal.reason}</dd>
      <dt className="font-semibold">Source evidence</dt><dd>{proposal.id} · “{proposal.evidence.quote}”</dd>
    </dl>
    {proposal.decision === 'pending' ? <div className="space-y-2">
      {edit !== null && <label className="block">Your bullet wording<textarea className={field} value={edit} maxLength={4000} onChange={event => setEdit(event.target.value)} /></label>}
      <div className="flex flex-wrap gap-3">
        {edit === null ? <>
          <button className="underline" onClick={() => onDecide('accepted')}>Accept bullet</button>
          <button className="underline" onClick={() => setEdit(proposal.proposed)}>Edit bullet</button>
        </> : <>
          <button className="underline" onClick={() => onDecide('edited', edit)}>Apply bullet wording</button>
          <button className="underline" onClick={() => setEdit(null)}>Cancel bullet edit</button>
        </>}
        <button className="underline" onClick={() => onDecide('rejected')}>Reject bullet</button>
      </div>
    </div> : <p>Decision: {proposal.decision}{proposal.decision === 'edited' && ` · ${proposal.edited}`}</p>}
  </article>;
}

export default function ExperienceHandoff({ review, onChange }) {
  const [selected, setSelected] = useState([]); const [request, setRequest] = useState(null);
  const [response, setResponse] = useState(''); const [message, setMessage] = useState('');
  const targets = experienceTargets(review);
  const fresh = request?.binding === JSON.stringify(review);
  const proposals = review.experienceProposals || [];
  const pending = proposals.some(item => item.decision === 'pending');
  function prepare() {
    try { setRequest(prepareExperienceHandoff(review, selected, crypto.randomUUID())); setResponse(''); setMessage(''); }
    catch (error) { setMessage(error.message); }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(request.prompt); setMessage('Experience prompt copied. Paste it into your chosen AI chat.'); }
    catch { setMessage('Select and copy the experience prompt text below.'); }
  }
  function receive() {
    try {
      onChange(importExperienceHandoff(response, request, review)); setRequest(null); setResponse(''); setSelected([]);
      setMessage('Review each bullet below. Nothing changes until you accept or apply your own wording.');
    } catch (error) { setMessage(error.message); }
  }
  function decide(id, decision, edited) {
    try { onChange(decideExperienceProposal(review, id, decision, edited)); setMessage(''); }
    catch (error) { setMessage(error.message); }
  }
  return <section aria-label="Experience bullet tailoring" className="space-y-3 rounded border border-gray-400 p-4">
    <h3 className="font-semibold">Tailor experience bullets with your AI chat</h3>
    <p>Choose up to 20 bullets, copy a reviewed prompt into your AI chat, then paste its JSON response here. Each non-empty line of an experience description is treated as one bullet. Your chat service’s data policies apply when you share it.</p>
    <p>Only selected lines and the job description enter the prompt. Check them for personal details. Employers, titles and dates outside these lines stay unchanged. Check every suggested claim: matching evidence cannot guarantee factual accuracy.</p>
    {!targets.length && <p>No eligible experience bullets found. Add work experience to your source resume first. Each line can contain up to 4,000 characters and each description up to 20,000.</p>}
    {targets.length > 0 && <>
      <fieldset disabled={pending} className="space-y-2">
        <legend className="font-medium">Choose experience bullets to share</legend>
        {targets.map(target => <label className="block break-words" key={target.id}>
          <input type="checkbox" checked={selected.includes(target.id)} onChange={event => {
            setSelected(event.target.checked ? [...selected, target.id] : selected.filter(id => id !== target.id)); setRequest(null); setResponse('');
          }} /> {target.label} · Bullet {target.lineIndex + 1}
          <span className="block whitespace-pre-wrap text-sm">{target.before}</span>
        </label>)}
      </fieldset>
      <p>{selected.length} of 20 selected. Numerical claims in AI suggestions must stay unchanged. Your own edits require you to verify the facts.</p>
      {proposals.length > 0 && <p>Review or reject every pending bullet before another batch. Importing a new batch replaces these review cards; previously approved wording stays in the draft.</p>}
      <button className="underline" disabled={pending} onClick={prepare}>Prepare experience prompt</button>
    </>}
    {request && <>
      <label className="block">Experience prompt to share<textarea className={field} rows={10} readOnly value={request.prompt} /></label>
      {!fresh && <p>This draft changed. Prepare a new experience prompt.</p>}
      <button className="underline" disabled={!fresh} onClick={copy}>Copy reviewed experience prompt</button>
      <label className="block">Experience AI JSON response<textarea className={field} rows={6} maxLength={EXPERIENCE_HANDOFF_LIMIT} value={response} onChange={event => setResponse(event.target.value)} /></label>
      <button className="underline" disabled={!fresh} onClick={receive}>Review experience response</button>
    </>}
    {message && <p role="status">{message}</p>}
    {proposals.map(proposal => <BulletReview key={proposal.id + proposal.before + proposal.proposed + proposal.decision} proposal={proposal} target={targets.find(target => target.id === proposal.id)} onDecide={(decision, edited) => decide(proposal.id, decision, edited)} />)}
  </section>;
}
