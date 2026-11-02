import React, { useState } from 'react';
import { decideProposal, sampleProposal } from '../../utils/summaryProposal';

export default function SummaryProposal({ review, onChange }) {
  const [edit, setEdit] = useState(null);
  const [message, setMessage] = useState('');
  const proposal = review.proposal;

  const evidenceLabel = proposal?.evidence.path === 'profile.summary' ? 'Original summary'
    : 'Experience ' + (Number(proposal?.evidence.path.match(/\d+/)?.[0]) + 1);

  function sample() {
    const suggestion = sampleProposal(review.source, review.job, review.version.profile.summary || '');
    if (!suggestion) {
      setMessage('No different source passage matched this job description. You can still edit the summary yourself.');
      return;
    }
    setMessage('');
    setEdit(null);
    onChange({ ...review, proposal: suggestion });
  }

  function decide(decision) {
    try {
      onChange(decideProposal(review, decision, edit));
      setMessage('');
      setEdit(null);
    } catch (err) {
      setMessage(err.message);
    }
  }

  return <section className="space-y-3 rounded border border-gray-400 p-4">
    <h3 className="font-semibold">Review a summary suggestion</h3>
    <p>Try a local sample that selects a passage from your resume using words in the job description.</p>
    {!proposal && <button className="underline" onClick={sample}>Try sample suggestion</button>}
    {proposal && <>
      <dl className="space-y-2 whitespace-pre-wrap">
        <dt className="font-semibold">Before</dt><dd>{proposal.before || '(Empty summary)'}</dd>
        <dt className="font-semibold">Suggested summary</dt><dd>{proposal.proposed}</dd>
        <dt className="font-semibold">Reason</dt><dd>{proposal.reason}</dd>
        <dt className="font-semibold">Source evidence</dt><dd>{evidenceLabel} · “{proposal.evidence.quote}”</dd>
      </dl>
      {proposal.decision === 'pending' ? <div className="space-y-2">
        {edit !== null && <label className="block">Your wording<textarea className="block w-full rounded border p-2 dark:bg-slate-800" value={edit} maxLength={8000} onChange={e => setEdit(e.target.value)} /></label>}
        <div className="flex flex-wrap gap-4">
          {edit === null ? <>
            <button className="underline" onClick={() => decide('accepted')}>Accept suggestion</button>
            <button className="underline" onClick={() => setEdit(proposal.proposed)}>Edit suggestion</button>
          </> : <>
            <button className="underline" onClick={() => decide('edited')}>Apply my wording</button>
            <button className="underline" onClick={() => setEdit(null)}>Cancel edit</button>
          </>}
          <button className="underline" onClick={() => decide('rejected')}>Reject suggestion</button>
        </div>
      </div> : <p>Decision: {proposal.decision}{proposal.decision === 'edited' && ` · ${proposal.edited}`}</p>}
    </>}
    {message && <p role="status">{message}</p>}
  </section>;
}
