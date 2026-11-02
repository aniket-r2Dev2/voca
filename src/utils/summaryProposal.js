// Version one supports one proposed change to the draft summary at a time.
// Evidence paths refer to the immutable source captured with this draft.
const LIMIT = 8000;
const bounded = value => typeof value === 'string' && value.length <= LIMIT;
const commonWords = new Set(['and', 'the', 'for', 'with', 'that', 'from', 'are', 'our', 'you', 'your', 'will', 'this']);
const words = text => new Set((text.toLowerCase().match(/[a-z0-9+#]{3,}/g) || []).filter(word => !commonWords.has(word)));

function passages(source) {
  return [
    ['profile.summary', source.profile.summary],
    ...source.experiences.map((entry, i) => [`experiences[${i}].description`, entry?.description])
  ].filter(([, text]) => typeof text === 'string' && text.trim());
}

export function sampleProposal(source, job, before) {
  if (!bounded(before)) return null;
  const keywords = words(job.description);
  let best = null;
  let bestScore = 0;
  for (const [path, passage] of passages(source)) {
    for (const sentence of passage.split(/(?<=[.!?])\s+|\n+/)) {
      const quote = sentence.trim();
      if (!quote || quote === before.trim() || !bounded(quote)) continue;
      const score = [...words(quote)].filter(word => keywords.has(word)).length;
      if (score > bestScore) {
        bestScore = score;
        best = { path, quote };
      }
    }
  }
  if (!best) return null;
  return {
    schemaVersion: 1, target: 'profile.summary', before, proposed: best.quote,
    reason: 'Focus the summary on a source passage that shares wording with the job description.',
    evidence: best, decision: 'pending'
  };
}

export function validProposal(proposal, source) {
  if (proposal === undefined) return true; // Earlier drafts have no proposal.
  if (!proposal || proposal.schemaVersion !== 1 || proposal.target !== 'profile.summary'
      || !bounded(proposal.before) || !bounded(proposal.proposed) || !proposal.proposed.trim()
      || !bounded(proposal.reason) || !proposal.reason.trim()
      || !bounded(proposal.evidence?.quote) || !proposal.evidence.quote.trim()) return false;
  if (!passages(source).some(([path, text]) => path === proposal.evidence.path && text.includes(proposal.evidence.quote))) return false;
  if (proposal.decision === 'edited') return bounded(proposal.edited) && Boolean(proposal.edited.trim());
  return ['pending', 'accepted', 'rejected'].includes(proposal.decision) && proposal.edited === undefined;
}

export function decideProposal(review, decision, edited) {
  const proposal = review.proposal;
  if (!proposal || proposal.decision !== 'pending' || !['accepted', 'edited', 'rejected'].includes(decision)) {
    throw new Error('Choose a pending suggestion to review.');
  }
  const resolved = decision === 'edited' ? { ...proposal, decision, edited } : { ...proposal, decision };
  if (!validProposal(resolved, review.source)) throw new Error('Check the evidence and enter up to 8,000 characters for the edited suggestion.');
  if (decision === 'rejected') return { ...review, proposal: resolved };
  const version = review.version;
  if ((version.profile.summary || '') !== proposal.before) throw new Error('The summary changed. Reject the suggestion or restore its before text to apply it.');
  const summary = decision === 'edited' ? edited : proposal.proposed;
  return { ...review, proposal: resolved, version: { ...version, profile: { ...version.profile, summary } } };
}
