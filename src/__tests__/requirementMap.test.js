import { createEmptyCareerProfile } from '../utils/careerProfile';
import { createCareerBackup, parseCareerBackup } from '../utils/careerBackup';
import { requirementCandidates, requirementEvidence, updateRequirementMap, validRequirementMap } from '../utils/requirementMap';
import { saveDraft, reopenDraft, validDrafts } from '../utils/tailorDrafts';
import { resumeTextBlocks } from '../utils/resumeTextBlocks';
const setup = () => {
  const source = createEmptyCareerProfile();
  source.profile = { ...source.profile, fullName: 'Alex', email: 'private@example.com', summary: 'Built Java services.' };
  source.experiences = [{ company: 'Example', position: 'Engineer', description: 'Operated production systems.' }];
  source.skills = ['Java']; source.languages = ['English']; source.education = [{ degree: 'BSc', institution: 'University' }];
  return { id: 'draft', revision: 0, source, version: source, job: { description: 'Java services required\nKubernetes preferred', role: 'Engineer', company: '' } };
};
const row = (review, status = 'supported') => ({ id: 'req', quote: 'Java services required', priority: 'required', status, note: 'Review note', evidence: requirementEvidence(review.source).slice(0, 1).map(({ id, quote }) => ({ id, quote })) });

test('candidates preserve exact JD excerpts and source evidence omits contact header', () => {
  expect(requirementCandidates('  Java services required\r\n\nJava services required\nKubernetes preferred')).toEqual(['Java services required', 'Kubernetes preferred']);
  expect(requirementCandidates(Array.from({ length: 110 }, (_, i) => `Requirement ${i}`).join('\n'))).toHaveLength(100);
  const review = setup(); const evidence = requirementEvidence(review.source);
  expect(JSON.stringify(evidence)).not.toMatch(/private@example.com|Alex/);
  expect(evidence.map(item => item.label)).toEqual(expect.arrayContaining(['Summary', 'Experience', 'Education', 'Skills', 'Languages']));
  expect(evidence[0].quote).toBe('Built Java services.');
});
test('mapping never edits source/version or exported resume text, and persists through backup and reopen', () => {
  const review = setup(); const before = JSON.stringify(review);
  const updated = updateRequirementMap(review, [row(review), { ...row(review), id: 'gap', quote: 'Kubernetes preferred', evidence: [], priority: 'preferred', status: 'gap' }]);
  expect(JSON.stringify(review)).toBe(before);
  expect(updated.version).toBe(review.version); expect(updated.source).toBe(review.source);
  expect(resumeTextBlocks(updated.version)).toEqual(resumeTextBlocks(review.version));
  const profile = saveDraft(createEmptyCareerProfile(), updated);
  const restored = parseCareerBackup(createCareerBackup(profile));
  const reopened = reopenDraft(restored.tailorDrafts[0]);
  expect(reopened.requirementMap).toEqual(updated.requirementMap);
  expect(reopened.version).toEqual(review.version);
  const legacy = { ...restored.tailorDrafts[0] }; delete legacy.requirementMap;
  expect(validDrafts([legacy])).toBe(true);
  const removed = saveDraft(restored, { ...reopened, requirementMap: [] });
  expect(removed.tailorDrafts[0].requirementMap).toEqual([]);
});
test('rejects fabricated JD quotes, evidence, duplicate IDs/quotes, unsupported statuses and oversized fields', () => {
  const review = setup(); const good = row(review);
  for (const patch of [{quote:'Python required'}, {id:''}, {status:'automatic'}, {priority:'critical'}, {note:'a'.repeat(2001)}, {status:'supported',evidence:[]}, {status:'partial',evidence:[]}, {status:'gap'}, {evidence:[{id:'unknown',quote:'Built Java services.'}]}, {evidence:[{...good.evidence[0],quote:'Invented work'}]}, {evidence:[...good.evidence,...good.evidence]}]) {
    expect(validRequirementMap([{...good,...patch}],review.source,review.job)).toBe(false);
  }
  expect(validRequirementMap([good,good],review.source,review.job)).toBe(false);
  expect(validRequirementMap([good,{...good,id:'different'}],review.source,review.job)).toBe(false);
  expect(validRequirementMap(Array(31).fill(good),review.source,review.job)).toBe(false);
  expect(validRequirementMap(null,review.source,review.job)).toBe(false);
  expect(validRequirementMap(undefined,review.source,review.job)).toBe(true);
  expect(() => updateRequirementMap(review,[{...good,status:'gap'}])).toThrow('gaps');
});
test('changed JD/source evidence invalidates restored mappings while current draft edits do not', () => {
  const review = setup(); const updated = updateRequirementMap(review,[row(review)]);
  const profile = saveDraft(createEmptyCareerProfile(),updated);
  const backup = JSON.parse(createCareerBackup(profile));
  // Validate the same schema gate used by backup restore.
  const draft = profile.tailorDrafts[0];
  expect(validDrafts([{...draft, job:{...draft.job, description:'Another job'}}])).toBe(false);
  expect(validDrafts([{...draft, source:{...draft.source,profile:{...draft.source.profile,summary:'Changed'}}}])).toBe(false);
  const edited = {...updated,version:{...updated.version,profile:{...updated.version.profile,summary:'Reviewed wording'}}};
  expect(saveDraft(createEmptyCareerProfile(),edited).tailorDrafts[0].requirementMap).toEqual(updated.requirementMap);
  backup.careerProfile.tailorDrafts[0].requirementMap[0].evidence[0].quote = 'Invented evidence';
  expect(() => parseCareerBackup(JSON.stringify(backup))).toThrow('invalid saved drafts');
});
