import { createEmptyCareerProfile, CAREER_PROFILE_STORAGE_KEY } from '../utils/careerProfile';
import { createCareerBackup, parseCareerBackup, restoreCareerBackup } from '../utils/careerBackup';
import { deleteAllVocaLocalData } from '../utils/localDataPrivacy';
import { saveDraft, reopenDraft, sourceSnapshot } from '../utils/tailorDrafts';

test('independent sources survive edits, backup, complete deletion and restore', () => {
  const profile = createEmptyCareerProfile();
  profile.profile.summary = 'Original';
  const review = { id: 'one', revision: 0, source: profile, version: profile, job: { description: 'Engineer', company: '', role: '' } };
  const first = saveDraft(profile, review);
  const next = reopenDraft(first.tailorDrafts[0]);
  next.version.profile.summary = 'Edited';
  const second = saveDraft(first, next);
  expect(second.profile.summary).toBe('Original');
  expect(second.tailorDrafts[0].source.profile.summary).toBe('Original');
  expect(sourceSnapshot(second)).toEqual(profile);
  expect(() => saveDraft(second, next)).toThrow('changed');
  expect(() => saveDraft(profile, next)).toThrow('deleted');
  const backup = createCareerBackup(second);
  localStorage.setItem(CAREER_PROFILE_STORAGE_KEY, JSON.stringify(second));
  deleteAllVocaLocalData(localStorage);
  expect(localStorage.getItem(CAREER_PROFILE_STORAGE_KEY)).toBeNull();
  expect(restoreCareerBackup(localStorage, parseCareerBackup(backup)).tailorDrafts).toEqual(second.tailorDrafts);
  const malformed = JSON.parse(backup);
  malformed.careerProfile.tailorDrafts[0].job.description = {};
  expect(() => parseCareerBackup(JSON.stringify(malformed))).toThrow('invalid saved drafts');
});
