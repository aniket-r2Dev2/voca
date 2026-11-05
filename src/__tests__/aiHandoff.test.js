import { createEmptyCareerProfile } from '../utils/careerProfile';
import { prepareHandoff, importHandoff } from '../utils/aiHandoff';

function fixture() {
  const source = createEmptyCareerProfile();
  source.profile = { ...source.profile, fullName: 'Private name', email: 'private@example.com', summary: 'Built identity services.' };
  source.experiences = [{ description: 'Private excluded passage' }];
  const review = { id: 'draft', revision: 0, source, version: source, job: { description: 'Build services' } };
  const request = prepareHandoff(review, ['profile.summary'], 'request-1');
  const response = JSON.stringify({ requestId: request.requestId, proposed: 'Builds identity services.', reason: 'Relevant work', evidence: { path: 'profile.summary', quote: source.profile.summary }, decision: 'accepted' });
  return { review, request, response };
}

test('only explicitly selected passages and JD enter the prompt; import always needs review', () => {
  const { review, request, response } = fixture();
  expect(request.prompt).not.toContain('Private name');
  expect(request.prompt).not.toContain('private@example.com');
  expect(request.prompt).not.toContain('Private excluded passage');
  expect(request.prompt).toContain('Built identity services.');
  const imported = importHandoff(response, request, review);
  expect(imported.proposal.decision).toBe('pending');
  expect(imported.version).toBe(review.version);
});

test('rejects stale drafts, mismatched prompts, missing evidence and malformed output', () => {
  const { review, request, response } = fixture();
  expect(() => importHandoff(response, request, { ...review, revision: 1 })).toThrow('changed');
  expect(() => importHandoff(response.replace('request-1', 'other'), request, review)).toThrow('different');
  expect(() => importHandoff(response.replace('profile.summary', 'experiences[0].description'), request, review)).toThrow('selected');
  expect(() => importHandoff('{', request, review)).toThrow('JSON');
  expect(() => prepareHandoff(review, [], 'id')).toThrow('Select');
});
