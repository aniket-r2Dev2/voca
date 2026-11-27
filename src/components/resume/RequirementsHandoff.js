import React, { useState } from 'react';
import { prepareRequirementsHandoff, importRequirementsHandoff, decideRequirement, REQUIREMENTS_HANDOFF_LIMIT } from '../../utils/requirementsHandoff';
const field = 'block w-full rounded border p-2 dark:bg-slate-800';
function RequirementSuggestion({ item, index, decide }) {
  const [edits, setEdits] = useState(null);
  return <article aria-label={`Suggested requirement ${index + 1}`} className="space-y-3 rounded border border-gray-400 p-3">
    <blockquote className="whitespace-pre-wrap break-words">{item.quote}</blockquote><p>Suggested priority: {item.priority}</p><p>{item.reason}</p>
    {item.decision === 'pending' ? <>
      {edits && <><label>Edited JD quote<textarea className={field} maxLength={2000} value={edits.quote} onChange={e => setEdits({ ...edits, quote: e.target.value })} /></label><label>Edited requirement priority<select className={field} value={edits.priority} onChange={e => setEdits({ ...edits, priority: e.target.value })}><option value="unspecified">Unspecified</option><option value="required">Required</option><option value="preferred">Preferred</option></select></label></>}
      <div className="flex flex-wrap gap-3">{edits ? <><button className="underline" onClick={() => decide('edited', edits)}>Apply requirement edits</button><button className="underline" onClick={() => setEdits(null)}>Cancel requirement edit</button></> : <><button className="underline" onClick={() => decide('accepted')}>Accept requirement</button><button className="underline" onClick={() => setEdits({ quote: item.quote, priority: item.priority })}>Edit requirement</button></>}<button className="underline" onClick={() => decide('rejected')}>Reject requirement</button></div>
    </> : <p>Decision: {item.decision}{item.decision === 'edited' && ` · ${item.editedQuote} · ${item.editedPriority}`}</p>}
  </article>;
}
export default function RequirementsHandoff({ review, onChange }) {
  const [request, setRequest] = useState(null), [response, setResponse] = useState(''), [message, setMessage] = useState('');
  const proposals = review.requirementProposals || [];
  const pending = proposals.some(item => item.decision === 'pending');
  const fresh = request?.binding === JSON.stringify(review);
  return <section aria-label="AI requirement extraction" className="space-y-3 rounded border border-gray-400 p-4">
    <h2 className="text-xl font-semibold">Extract requirements with your AI chat</h2>
    <p>Copy a prompt into your AI chat and paste its JSON response. Only the JD and existing checklist quotes are shared, not your resume, evidence or notes. Review the prompt for sensitive text; your chat service’s data policies apply.</p>
    <p>Review exact quotes and priorities before adding them. AI may omit conditions, misclassify benefits or miss requirements. Acceptance adds an unreviewed checklist item; it does not mean you meet that requirement. Your resume stays unchanged.</p>
    <button className="underline" disabled={pending} onClick={() => { try { setRequest(prepareRequirementsHandoff(review, crypto.randomUUID())); setResponse(''); setMessage(''); } catch (err) { setMessage(err.message); } }}>Prepare requirements prompt</button>
    {proposals.length > 0 && <p>Resolve pending suggestions before another batch. Importing a new batch replaces these review cards; existing checklist items and assessments remain. Choose Save draft to keep decisions.</p>}
    {request && <><label>Requirements prompt to share<textarea className={field} rows={10} readOnly value={request.prompt} /></label>{!fresh && <p>This draft changed. Prepare a new requirements prompt.</p>}<button className="underline" disabled={!fresh} onClick={async () => { try { await navigator.clipboard.writeText(request.prompt); setMessage('Requirements prompt copied.'); } catch { setMessage('Select and copy the requirements prompt text.'); } }}>Copy reviewed requirements prompt</button><label>Requirements AI JSON response<textarea className={field} rows={6} maxLength={REQUIREMENTS_HANDOFF_LIMIT} value={response} onChange={e => setResponse(e.target.value)} /></label><button className="underline" disabled={!fresh} onClick={() => { try { const next = importRequirementsHandoff(response, request, review); onChange(next); setRequest(null); setResponse(''); setMessage(next.requirementProposals.length ? 'Review each requirement below. Your checklist has not changed.' : 'No additional requirements suggested. Check the JD yourself for omissions.'); } catch (err) { setMessage(err.message); } }}>Review requirements response</button></>}
    {message && <p role="status">{message}</p>}
    {proposals.map((item, index) => <RequirementSuggestion key={item.quote + item.decision} item={item} index={index} decide={(decision, edits) => { try { onChange(decideRequirement(review, index, decision, edits, crypto.randomUUID())); setMessage(''); } catch (err) { setMessage(err.message); } }} />)}
  </section>;
}
