import { createEmptyCareerProfile } from '../utils/careerProfile';
import { createCareerBackup, parseCareerBackup } from '../utils/careerBackup';
import { reopenDraft, saveDraft } from '../utils/tailorDrafts';
import { decideProposal, sampleProposal, validProposal } from '../utils/summaryProposal';

const source = createEmptyCareerProfile();
source.profile.summary = 'Builds software.';
source.experiences.push({ description: 'Maintained 99.9% availability.' });
const job = { role: '', company: '', description: 'Improve service availability.' };
const proposal = sampleProposal(source, job, source.profile.summary);
const review = { id: 'sample', revision: 0, source, version: source, job, proposal };

test('sample uses an exact quote including decimal metrics and abstains when evidence is absent', () => {
  expect(proposal.proposed).toBe('Maintained 99.9% availability.');
  expect(proposal.evidence.path).toBe('experiences[0].description');
  expect(sampleProposal(source, { description: 'The Kubernetes team' }, '')).toBeNull();
  expect(validProposal({ ...proposal, evidence: { path: 'profile.summary', quote: 'invented' } }, source)).toBe(false);
});

test.each([
  ['accepted', undefined, 'Maintained 99.9% availability.'],
  ['rejected', undefined, 'Builds software.'],
  ['edited', 'Maintained service availability.', 'Maintained service availability.']
])('%s decision survives backup and reopening with its approved text', (decision, edited, expected) => {
  const resolved = decideProposal(review, decision, edited);
  const saved = saveDraft(source, resolved);
  const restored = reopenDraft(parseCareerBackup(createCareerBackup(saved)).tailorDrafts[0]);
  expect(restored.proposal.decision).toBe(decision);
  expect(restored.version.profile.summary).toBe(expected);
  expect(restored.source.profile.summary).toBe('Builds software.');
});

test('a stale suggestion cannot overwrite a manual edit and an empty edit cannot be approved', () => {
  const changed = { ...review, version: { ...source, profile: { ...source.profile, summary: 'New text' } } };
  expect(() => decideProposal(changed, 'accepted')).toThrow('summary changed');
  expect(decideProposal(changed, 'rejected').version).toBe(changed.version);
  expect(() => decideProposal(review, 'edited', ' ')).toThrow();
});
