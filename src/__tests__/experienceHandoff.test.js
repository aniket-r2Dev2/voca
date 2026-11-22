import { createEmptyCareerProfile } from '../utils/careerProfile';
import { experienceTargets, prepareExperienceHandoff, importExperienceHandoff, decideExperienceProposal } from '../utils/experienceHandoff';
import { saveDraft, reopenDraft, validDrafts } from '../utils/tailorDrafts';
import { createCareerBackup, parseCareerBackup } from '../utils/careerBackup';
function fixture() {
  const source = createEmptyCareerProfile();
  source.profile.email = 'private@example.com';
  source.experiences = [
    { id: 'one', company: 'Original Co', position: 'Engineer', startDate: '2020-01', endDate: '2023-04', description: '- Built services for 20 users.\n\n- Maintained identity APIs.' },
    { id: 'two', company: 'Other Co', position: 'Senior', description: '- Private excluded work.' }
  ];
  const review = { id: 'draft', revision: 0, source, version: source, job: { description: 'Build reliable identity APIs', role: 'Engineer', company: 'Target' } };
  const targets = experienceTargets(review).slice(0, 2);
  const request = prepareExperienceHandoff(review, targets.map(item => item.id), 'request');
  const response = { requestId: 'request', suggestions: targets.map(item => ({ targetId: item.id, proposed: item.before.replace('Built', 'Developed').replace('Maintained', 'Supported'), reason: 'Relevant work.', evidence: { quote: item.quote }, decision: 'accepted', company: 'Injected' })) };
  return { review, request, response };
}
const receive = (fixture, response = fixture.response, review = fixture.review) => importExperienceHandoff(JSON.stringify(response), fixture.request, review);
test('selected bullets only, snapshot IDs, exact evidence and mandatory individual decisions', () => {
  const f = fixture();
  expect(f.request.prompt).not.toContain('private@example.com'); expect(f.request.prompt).not.toContain('Private excluded');
  expect(f.request.prompt).not.toContain('Original Co');
  const imported = receive(f);
  expect(imported.version).toBe(f.review.version);
  expect(imported.experienceProposals.every(item => item.decision === 'pending')).toBe(true);
  expect(imported.experienceProposals[0].company).toBeUndefined();
  const accepted = decideExperienceProposal(imported, 'experience:0:line:0', 'accepted');
  expect(accepted.version.experiences[0].description).toBe('- Developed services for 20 users.\n\n- Maintained identity APIs.');
  expect(accepted.source.experiences[0].description).toBe('- Built services for 20 users.\n\n- Maintained identity APIs.');
  const rejected = decideExperienceProposal(accepted, 'experience:0:line:2', 'rejected');
  expect(rejected.version).toBe(accepted.version);
  expect(rejected.version.experiences[0].company).toBe('Original Co');
});
test('rejects stale requests, wrong IDs, duplicate/unknown targets, cross-role evidence, multiline output and numeric invention', () => {
  const f = fixture();
  expect(() => receive(f, f.response, { ...f.review, revision: 1 })).toThrow('changed');
  expect(() => receive(f, { ...f.response, requestId: 'other' })).toThrow('different');
  for (const suggestions of [[], [f.response.suggestions[0], f.response.suggestions[0]],
    [{ ...f.response.suggestions[0], targetId: 'experience:1:line:0' }],
    [{ ...f.response.suggestions[0], evidence: { quote: 'Maintained identity APIs.' } }],
    [{ ...f.response.suggestions[0], proposed: 'Made 30 users happy.' }],
    [{ ...f.response.suggestions[0], proposed: 'Made 20 users happy.\nInvented second bullet' }],
    [{ ...f.response.suggestions[0], proposed: 'x'.repeat(4001) }]]) expect(() => receive(f, { ...f.response, suggestions })).toThrow();
  expect(() => importExperienceHandoff('{', f.request, f.review)).toThrow('JSON');
  expect(() => importExperienceHandoff('x'.repeat(100001), f.request, f.review)).toThrow('100,000');
  expect(() => prepareExperienceHandoff(f.review, [], 'id')).toThrow('Select');
  expect(() => prepareExperienceHandoff(receive(f), [f.request.targets[0].id], 'id')).toThrow('pending');
});
test('custom wording is explicit; stale bullet applies fail and can still be rejected', () => {
  const f = fixture(); const imported = receive(f);
  const edited = decideExperienceProposal(imported, 'experience:0:line:0', 'edited', '- My verified wording for 20 users.');
  expect(edited.version.experiences[0].description).toContain('My verified');
  expect(() => decideExperienceProposal(imported, 'experience:0:line:0', 'edited', 'a\nb')).toThrow('single line');
  const stale = { ...imported, version: { ...imported.version, experiences: [{ ...imported.version.experiences[0], description: 'Other text' }] } };
  expect(() => decideExperienceProposal(stale, 'experience:0:line:0', 'accepted')).toThrow('changed');
  expect(decideExperienceProposal(stale, 'experience:0:line:0', 'rejected').version).toBe(stale.version);
});
test('accepted edits and pending reviews survive save, backup, restore and reopen; legacy drafts still work', () => {
  const f = fixture(); const imported = receive(f);
  const accepted = decideExperienceProposal(imported, 'experience:0:line:0', 'accepted');
  const profile = saveDraft(f.review.source, accepted);
  expect(profile.experiences).toEqual(f.review.source.experiences);
  const restored = parseCareerBackup(createCareerBackup(profile));
  const reopened = reopenDraft(restored.tailorDrafts[0]);
  expect(reopened.version.experiences).toEqual(accepted.version.experiences);
  expect(reopened.experienceProposals[1].decision).toBe('pending');
  expect(saveDraft(profile, reopened).tailorDrafts[0].revision).toBe(2);
  const old = saveDraft(f.review.source, f.review);
  expect(reopenDraft(old.tailorDrafts[0]).version.experiences).toEqual(f.review.source.experiences);
  for (const edits of [[{ experienceIndex: 99, description: 'Injected' }], [{ experienceIndex: 0, description: 'single line' }], [{ experienceIndex: 0, description: 'a\n\nb', company: 'Injected' }]]) {
    const drafts = [{ ...profile.tailorDrafts[0], experienceEdits: edits }]; expect(validDrafts(drafts)).toBe(false);
    expect(() => parseCareerBackup(JSON.stringify({ ...JSON.parse(createCareerBackup(profile)), careerProfile: { ...profile, tailorDrafts: drafts } }))).toThrow('invalid saved drafts');
  }
  const bad = { ...accepted, version: { ...accepted.version, experiences: accepted.version.experiences.map(item => ({ ...item, company: 'Injected' })) } };
  expect(() => saveDraft(profile, { ...bad, revision: 1 })).toThrow('unchanged');
});
