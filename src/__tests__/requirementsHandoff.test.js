import { createEmptyCareerProfile } from '../utils/careerProfile';
import { createCareerBackup, parseCareerBackup } from '../utils/careerBackup';
import { saveDraft, reopenDraft, validDrafts } from '../utils/tailorDrafts';
import { requirementEvidence } from '../utils/requirementMap';
import { resumeTextBlocks } from '../utils/resumeTextBlocks';
import { prepareRequirementsHandoff, importRequirementsHandoff, decideRequirement, validRequirementProposals } from '../utils/requirementsHandoff';
function setup() {
 const source=createEmptyCareerProfile();source.profile={...source.profile,fullName:'Alex',email:'private@example.com',summary:'PRIVATE RESUME Java experience'};
 const evidence=requirementEvidence(source)[0];
 const row={id:'existing',quote:'Java required',priority:'required',status:'supported',evidence:[{id:evidence.id,quote:evidence.quote}],note:'PRIVATE NOTE'};
 const review={id:'draft',revision:0,source,version:source,job:{role:'Engineer',company:'',description:'Java required\nSQL required\nREST preferred\nNo degree required'},requirementMap:[row]};
 const request=prepareRequirementsHandoff(review,'req');
 const result={requestId:'req',suggestions:[{quote:'SQL required',priority:'required',reason:'Database skills',decision:'accepted',evidence:['forged'],status:'supported'},{quote:'REST preferred',priority:'required',reason:'API knowledge'},{quote:'No degree required',priority:'required',reason:'Check context'}]};
 return {review,request,result};
}
test('prompt excludes resume, evidence and notes; pending import does not modify checklist or resume',()=>{
 const {review,request,result}=setup();const before=JSON.stringify(review);
 expect(request.prompt).not.toMatch(/PRIVATE|private@example.com|Alex/);
 expect(request.prompt).toContain('Java required');
 const next=importRequirementsHandoff(JSON.stringify(result),request,review);
 expect(next.requirementMap).toBe(review.requirementMap);expect(next.version).toBe(review.version);expect(next.requirementProposals.every(p=>p.decision==='pending')).toBe(true);
 expect(next.requirementProposals[0].evidence).toBeUndefined();expect(next.requirementProposals[0].status).toBeUndefined();
 expect(()=>prepareRequirementsHandoff(next,'new')).toThrow('pending');
 expect(JSON.stringify(review)).toBe(before);
});
test('accept/edit/reject preserves existing assessments and adds only unreviewed requirements',()=>{
 const {review,request,result}=setup();let next=importRequirementsHandoff(JSON.stringify(result),request,review);
 next=decideRequirement(next,0,'accepted',undefined,'sql');
 next=decideRequirement(next,1,'edited',{quote:'REST preferred',priority:'preferred'},'rest');
 next=decideRequirement(next,2,'rejected');
 expect(next.requirementMap[0]).toEqual(review.requirementMap[0]);
 expect(next.requirementMap.slice(1)).toEqual([{id:'sql',quote:'SQL required',priority:'required',status:'unreviewed',evidence:[],note:''},{id:'rest',quote:'REST preferred',priority:'preferred',status:'unreviewed',evidence:[],note:''}]);
 expect(resumeTextBlocks(next.version)).toEqual(resumeTextBlocks(review.version));
 expect(()=>decideRequirement(next,0,'accepted',undefined,'again')).toThrow('pending');
 const fresh=prepareRequirementsHandoff(next,'new');
 const empty=importRequirementsHandoff(JSON.stringify({requestId:'new',suggestions:[]}),fresh,next);
 expect(empty.requirementMap).toEqual(next.requirementMap);expect(empty.requirementProposals).toEqual([]);
});
test('rejects fabricated/duplicate quotes, bad priorities, malformed/oversized and stale responses',()=>{
 const {review,request,result}=setup();const receive=data=>importRequirementsHandoff(JSON.stringify(data),request,review);
 for(const patch of [{quote:'Python required'},{quote:''},{quote:' SQL required '},{priority:'critical'},{reason:''},{reason:'x'.repeat(2001)}]) expect(()=>receive({...result,suggestions:[{...result.suggestions[0],...patch}]})).toThrow();
 expect(()=>receive({...result,suggestions:[result.suggestions[0],result.suggestions[0]]})).toThrow('unique');
 expect(()=>receive({...result,suggestions:[{...result.suggestions[0],quote:'Java required'}]})).toThrow('Existing');
 expect(()=>receive({...result,requestId:'wrong'})).toThrow('different');
 expect(()=>importRequirementsHandoff('bad',request,review)).toThrow('JSON');
 expect(()=>importRequirementsHandoff('x'.repeat(100001),request,review)).toThrow('100,000');
 expect(()=>importRequirementsHandoff(JSON.stringify(result),request,{...review,revision:1})).toThrow('changed');
 expect(()=>receive({...result,suggestions:[null]})).toThrow();
 expect(validRequirementProposals(null,review.job)).toBe(false);
 expect(validRequirementProposals(undefined,review.job)).toBe(true);
});
test('decision-time checks prevent overwrites, invalid edits and exceeding checklist capacity',()=>{
 const {review,request,result}=setup();const next=importRequirementsHandoff(JSON.stringify(result),request,review);
 expect(()=>decideRequirement(next,0,'edited',{quote:'invented',priority:'required'},'id')).toThrow('exact JD');
 expect(()=>decideRequirement(next,0,'edited',{quote:'Java required',priority:'required'},'id')).toThrow('unique');
 expect(()=>decideRequirement(next,0,'accepted',undefined,'existing')).toThrow('unique');
 const quotes=Array.from({length:30},(_,i)=>`Requirement ${i}!`);
 const full={...next,job:{...next.job,description:next.job.description+'\n'+quotes.join('\n')},requirementMap:quotes.map((quote,i)=>({id:`r${i}`,quote,priority:'unspecified',status:'unreviewed',evidence:[],note:''}))};
 expect(()=>prepareRequirementsHandoff({...full,requirementProposals:[]},'req')).toThrow('full');
 expect(()=>decideRequirement(full,0,'accepted',undefined,'extra')).toThrow('30');
 expect(decideRequirement(full,0,'rejected').requirementMap).toBe(full.requirementMap);
 const almost={...full,requirementProposals:[],requirementMap:full.requirementMap.slice(0,29)};const req=prepareRequirementsHandoff(almost,'req');
 expect(()=>importRequirementsHandoff(JSON.stringify(result),req,almost)).toThrow('room');
});
test('pending/completed decisions persist through save/reopen and backup; old drafts remain readable',()=>{
 const {review,request,result}=setup();let next=importRequirementsHandoff(JSON.stringify(result),request,review);next=decideRequirement(next,0,'accepted',undefined,'sql');
 const profile=saveDraft(createEmptyCareerProfile(),next);const restored=parseCareerBackup(createCareerBackup(profile));const reopened=reopenDraft(restored.tailorDrafts[0]);
 expect(reopened.requirementProposals).toEqual(next.requirementProposals);expect(reopened.requirementMap).toEqual(next.requirementMap);expect(reopened.source).toEqual(review.source);expect(restored.experiences).toEqual([]);
 const legacy={...profile.tailorDrafts[0]};delete legacy.requirementProposals;expect(validDrafts([legacy])).toBe(true);
 const bad=JSON.parse(createCareerBackup(profile));bad.careerProfile.tailorDrafts[0].requirementProposals[0].quote='Forged';expect(()=>parseCareerBackup(JSON.stringify(bad))).toThrow('invalid saved drafts');
});
