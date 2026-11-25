import { createEmptyCareerProfile } from '../utils/careerProfile';
import { createCareerBackup, parseCareerBackup } from '../utils/careerBackup';
import { saveDraft, reopenDraft, validDrafts } from '../utils/tailorDrafts';
import { skillEvidence, prepareSkillsHandoff, importSkillsHandoff, decideSkill, validSkillAdditions, validSkillProposals } from '../utils/skillsHandoff';
function setup() {
  const source = createEmptyCareerProfile();
  source.profile = { ...source.profile, fullName:'Alex',email:'private@example.com',summary:'Built Java services and REST APIs. Used SQL.' };
  source.skills = [{name:'Git'}];
  const review = {id:'draft',revision:0,source,version:source,job:{role:'Engineer',company:'',description:'Java REST SQL Kubernetes'}};
  const passage = skillEvidence(source)[0];
  const request = prepareSkillsHandoff(review,[passage.id],'req');
  const result = {requestId:'req',suggestions:['Java','REST APIs','SQL'].map(skill => ({skill,reason:'Job relevance',evidence:{id:passage.id,quote:passage.quote},decision:'accepted'}))};
  return {review,request,result};
}
test('only selected evidence enters prompt; import stays pending and decisions change only draft skills', () => {
  const {review,request,result} = setup(); const before = JSON.stringify(review);
  expect(request.prompt).not.toMatch(/private@example.com|Alex/);
  let next = importSkillsHandoff(JSON.stringify(result),request,review);
  expect(next.skillProposals.every(p=>p.decision==='pending')).toBe(true);
  expect(next.version).toBe(review.version);
  expect(()=>prepareSkillsHandoff(next,request.evidence.map(p=>p.id),'new')).toThrow('pending');
  next = decideSkill(next,0,'accepted'); next = decideSkill(next,1,'edited','REST'); next = decideSkill(next,2,'rejected');
  expect(next.version.skills).toEqual([{name:'Git'},'Java','REST']);
  expect(next.source).toBe(review.source); expect(JSON.stringify(review)).toBe(before);
  expect(()=>decideSkill(next,0,'accepted')).toThrow('pending');
});
test('rejects unsupported skills, truncated tokens, duplicates, invalid fields and mismatched requests', () => {
  const {review,request,result}=setup();
  const receive = data => importSkillsHandoff(JSON.stringify(data),request,review);
  for(const patch of [{skill:'Kubernetes'}, {skill:'JavaScript'}, {skill:'Java\nSQL'}, {skill:'x'.repeat(101)}, {reason:''}, {evidence:{id:'unknown',quote:'Java'}}, {evidence:{id:request.evidence[0].id,quote:'Invented'}}]) expect(()=>receive({...result,suggestions:[{...result.suggestions[0],...patch}]})).toThrow();
  expect(()=>receive({...result,suggestions:[result.suggestions[0],result.suggestions[0]]})).toThrow('unique');
  expect(()=>receive({...result,requestId:'other'})).toThrow('different');
  expect(()=>importSkillsHandoff('bad',request,review)).toThrow('JSON');
  expect(()=>importSkillsHandoff('x'.repeat(100001),request,review)).toThrow('100,000');
  expect(()=>importSkillsHandoff(JSON.stringify(result),request,{...review,revision:1})).toThrow('changed');
  expect(()=>prepareSkillsHandoff(review,[],'new')).toThrow('Select');
  const source = {...review.source,profile:{...review.source.profile,summary:'JavaScript only'}};
  const evidence = skillEvidence(source)[0];
  expect(validSkillAdditions([{skill:'Java',evidence:{id:evidence.id,quote:'Java'}}],source)).toBe(false);
  expect(validSkillProposals(null,source)).toBe(false);
  const cppSource = {...source,profile:{...source.profile,summary:'Built C++ tools'}};
  expect(validSkillAdditions([{skill:'C',evidence:{id:skillEvidence(cppSource)[0].id,quote:'C'}}],cppSource)).toBe(false);
});
test('empty suggestions are supported and new batches retain previous accepted additions', () => {
  const {review,request,result}=setup();
  expect(importSkillsHandoff(JSON.stringify({...result,suggestions:[]}),request,review).skillProposals).toEqual([]);
  let next=importSkillsHandoff(JSON.stringify(result),request,review);
  next=decideSkill(next,0,'accepted');next=decideSkill(next,1,'rejected');next=decideSkill(next,2,'rejected');
  const second=prepareSkillsHandoff(next,request.evidence.map(p=>p.id),'new');
  expect(()=>importSkillsHandoff(JSON.stringify({...result,requestId:'new'}),second,next)).toThrow('already');
  const cleared=importSkillsHandoff(JSON.stringify({requestId:'new',suggestions:[]}),second,next);
  expect(cleared.skillAdditions).toEqual(next.skillAdditions);
  expect(cleared.version.skills).toEqual([{name:'Git'},'Java']);
});
test('approved edits require literal source support and duplicate prevention', () => {
  const {review,request,result}=setup();let next=importSkillsHandoff(JSON.stringify(result),request,review);
  expect(()=>decideSkill(next,0,'edited','Kubernetes')).toThrow('explicitly');
  next=decideSkill(next,0,'accepted');
  expect(()=>decideSkill(next,1,'edited','Java')).toThrow('already');
  expect(validSkillAdditions(Array(101).fill({}),review.source)).toBe(false);
  expect(validSkillAdditions(undefined,review.source)).toBe(true);
});
test('save, reopen and backups preserve skill additions and pending review while rejecting forged evidence', () => {
  const {review,request,result}=setup();let next=importSkillsHandoff(JSON.stringify(result),request,review);next=decideSkill(next,0,'accepted');
  const profile=saveDraft(createEmptyCareerProfile(),next);
  const restored=parseCareerBackup(createCareerBackup(profile));const reopened=reopenDraft(restored.tailorDrafts[0]);
  expect(reopened.version.skills).toEqual([{name:'Git'},'Java']);expect(reopened.skillProposals[1].decision).toBe('pending');expect(restored.skills).toEqual([]);
  const backup=JSON.parse(createCareerBackup(profile));backup.careerProfile.tailorDrafts[0].skillAdditions[0].skill='Kubernetes';
  expect(()=>parseCareerBackup(JSON.stringify(backup))).toThrow('invalid saved drafts');
  const legacy={...profile.tailorDrafts[0]};delete legacy.skillAdditions;delete legacy.skillProposals;expect(validDrafts([legacy])).toBe(true);expect(reopenDraft(legacy).version.skills).toEqual(review.source.skills);
  expect(()=>saveDraft(createEmptyCareerProfile(),{...review,version:{...review.version,skills:['invented']}})).toThrow('reviewed');
});
