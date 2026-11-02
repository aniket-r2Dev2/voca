import { isCareerProfile } from './careerProfile';

import { validProposal } from './summaryProposal';

export const JD_LIMIT = 30000;

export function sourceSnapshot(profile) {
  const { tailorDrafts, ...source } = profile;
  return source;
}

// Only the summary is editable in this release. Store the edit alongside its
// source instead of duplicating the resume or referring back to the live master.
export function reopenDraft(draft) {
  const { source, summary } = draft;
  return {
    ...draft,
    version: { ...source, profile: { ...source.profile, summary } }
  };
}

export function validDrafts(drafts) {
  if (drafts === undefined) return true;
  if (!Array.isArray(drafts)) return false;
  const ids = new Set();
  return drafts.every(draft => {
    if (!draft || draft.schemaVersion !== 1 || typeof draft.id !== 'string' || !draft.id || ids.has(draft.id)) return false;
    ids.add(draft.id);
    return Number.isSafeInteger(draft.revision) && draft.revision > 0
      && typeof draft.createdAt === 'string' && typeof draft.updatedAt === 'string'
      && typeof draft.summary === 'string' && isCareerProfile(draft.source)
      && draft.source.tailorDrafts === undefined && validProposal(draft.proposal, draft.source)
      && typeof draft.job?.description === 'string' && Boolean(draft.job.description.trim())
      && draft.job.description.length <= JD_LIMIT
      && ['role', 'company'].every(key => typeof draft.job[key] === 'string' && draft.job[key].length <= 180);
  });
}

export function saveDraft(profile, review, now = new Date().toISOString()) {
  const drafts = profile.tailorDrafts ?? [];
  const previous = drafts.find(draft => draft.id === review.id);
  if ((previous?.revision ?? 0) !== review.revision) {
    throw new Error('This saved draft changed or was deleted. Reopen it before saving again.');
  }
  const draft = {
    schemaVersion: 1,
    id: review.id,
    revision: review.revision + 1,
    source: previous?.source ?? review.source,
    job: review.job,
    summary: review.version.profile.summary || '',
    ...(review.proposal && { proposal: review.proposal }),
    createdAt: previous?.createdAt ?? now,
    updatedAt: now
  };
  const tailorDrafts = [draft, ...drafts.filter(item => item.id !== draft.id)];
  if (!validDrafts(tailorDrafts)) throw new Error('Could not save this draft. Check the resume and job description.');
  return { ...profile, tailorDrafts };
}
