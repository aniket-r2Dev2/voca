import { validSkillAdditions, validSkillProposals, skillsWithAdditions } from './skillsHandoff';
import { validRequirementMap } from './requirementMap';
import { isCareerProfile } from './careerProfile';

import { validProposal } from './summaryProposal';
import { validExperienceEdits, validExperienceProposals } from './experienceHandoff';

export const JD_LIMIT = 30000;

export function sourceSnapshot(profile) {
  const { tailorDrafts, ...source } = profile;
  return source;
}

// Store summary/experience edits alongside the immutable source snapshot.
export function reopenDraft(draft) {
  const { source, summary } = draft;
  return {
    ...draft,
    version: { ...source, skills: skillsWithAdditions(source, draft.skillAdditions), profile: { ...source.profile, summary }, experiences: source.experiences.map((entry, index) => {
      const edit = draft.experienceEdits?.find(item => item.experienceIndex === index);
      return edit ? { ...entry, description: edit.description } : entry;
    }) }
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
      && validExperienceEdits(draft.experienceEdits, draft.source)
      && validExperienceProposals(draft.experienceProposals, draft.source)
      && validRequirementMap(draft.requirementMap, draft.source, draft.job)
      && validSkillAdditions(draft.skillAdditions, draft.source)
      && validSkillProposals(draft.skillProposals, draft.source)
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
  const source = previous?.source ?? review.source;
  if (review.version.experiences.length !== source.experiences.length) throw new Error('Experience entries cannot be added or removed from this draft.');
  if (JSON.stringify(review.version.skills) !== JSON.stringify(skillsWithAdditions(source, review.skillAdditions))) throw new Error('Skill changes must use reviewed source-supported additions.');
  const experienceEdits = [];
  review.version.experiences.forEach((entry, experienceIndex) => {
    const original = source.experiences[experienceIndex];
    if (JSON.stringify(entry) === JSON.stringify(original)) return;
    if (!entry || !original || JSON.stringify({ ...entry, description: original.description }) !== JSON.stringify(original)) throw new Error('Employer, role and date fields must remain unchanged.');
    experienceEdits.push({ experienceIndex, description: entry.description });
  });
  const draft = {
    schemaVersion: 1,
    id: review.id,
    revision: review.revision + 1,
    source,
    ...(experienceEdits.length && { experienceEdits }),
    ...(review.experienceProposals && { experienceProposals: review.experienceProposals }),
    ...(review.requirementMap && { requirementMap: review.requirementMap }),
    ...(review.skillAdditions && { skillAdditions: review.skillAdditions }),
    ...(review.skillProposals && { skillProposals: review.skillProposals }),
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
