import { createEmptyCareerProfile } from '../utils/careerProfile';
import { createCareerBackup, parseCareerBackup } from '../utils/careerBackup';
import { saveDraft, reopenDraft, validDrafts } from '../utils/tailorDrafts';
import { moveSkill, orderedSkills, validSkillOrder } from '../utils/skillOrder';
import { decideSkill, skillEvidence, prepareSkillsHandoff, importSkillsHandoff } from '../utils/skillsHandoff';
import { resumeTextBlocks } from '../utils/resumeTextBlocks';
function setup() {
  const source = createEmptyCareerProfile();
  source.profile.summary = 'Built Java services.';
  source.skills = [{ name: 'Git', level: 'Advanced' }, 'SQL', 'REST'];
  return { id: 'order', revision: 0, source, version: source, job: { role: 'Engineer', company: '', description: 'REST SQL Java' } };
}
test('reorder persists through save, backup and reopen without changing source or skill metadata', () => {
  const review = setup(); const before = JSON.stringify(review);
  const next = moveSkill(moveSkill(review, 2, -1), 1, -1);
  expect(next.version.skills).toEqual(['REST', {name:'Git',level:'Advanced'}, 'SQL']);
  expect(JSON.stringify(review)).toBe(before);
  const saved = saveDraft(review.source, next);
  const restored = parseCareerBackup(createCareerBackup(saved));
  const reopened = reopenDraft(restored.tailorDrafts[0]);
  expect(reopened.version.skills).toEqual(next.version.skills);
  expect(restored.skills).toEqual(review.source.skills);
  expect(reopened.source).toEqual(review.source);
  const text = resumeTextBlocks(reopened.version).map(b=>b.text).join('\n');
  expect(text.indexOf('REST')).toBeLessThan(text.indexOf('Git'));
  expect(saveDraft(restored, reopened).tailorDrafts[0].revision).toBe(2);
});
test('rejects omitted, duplicated, unknown and noninteger references and forged content', () => {
  const review = setup(); const saved = saveDraft(review.source, review);
  for (const order of [null, [0,1], [0,0,2], [0,1,3], [0,1,-1], [0,1,1.5], ['0',1,2]]) {
    expect(validSkillOrder(order, review.source.skills)).toBe(false);
    expect(validDrafts([{...saved.tailorDrafts[0], skillOrder:order}])).toBe(false);
    const backup = JSON.parse(createCareerBackup(saved)); backup.careerProfile.tailorDrafts[0].skillOrder = order;
    expect(()=>parseCareerBackup(JSON.stringify(backup))).toThrow('invalid saved drafts');
  }
  expect(()=>saveDraft(review.source,{...review,skillOrder:[2,1,0]})).toThrow('reviewed');
  expect(()=>moveSkill(review,0,-1)).toThrow(); expect(()=>moveSkill(review,2,1)).toThrow();
  expect(()=>moveSkill(review,1,2)).toThrow();
  expect(orderedSkills([],undefined)).toEqual([]);
  expect(validDrafts(saved.tailorDrafts)).toBe(true);
  expect(reopenDraft(saved.tailorDrafts[0]).version.skills).toEqual(review.source.skills);
});
test('new accepted additions append without undoing priority, and reordering invalidates old prompts', () => {
  const review = setup(); const passage = skillEvidence(review.source)[0];
  const request = prepareSkillsHandoff(review,[passage.id],'req');
  const response = JSON.stringify({requestId:'req', suggestions:[{skill:'Java',reason:'Relevant',evidence:{id:passage.id,quote:passage.quote}}]});
  expect(()=>importSkillsHandoff(response,request,moveSkill(review,2,-1))).toThrow('changed');
  let next = importSkillsHandoff(response,request,review);
  next = moveSkill(next,2,-1); next = decideSkill(next,0,'accepted');
  expect(next.skillOrder).toEqual([0,2,1,3]);
  expect(next.version.skills).toEqual([{name:'Git',level:'Advanced'},'REST','SQL','Java']);
  expect(reopenDraft(saveDraft(review.source,next).tailorDrafts[0]).version.skills).toEqual(next.version.skills);
});
