const {test,expect}=require('@playwright/test');
async function prepare(page){
 await page.goto('./#/tailor');await page.getByLabel('Paste text or open a TXT, DOCX or PDF file').check();
 await page.getByLabel('Resume text').fill('Name: Alex\nEmail: private@example.com\nSummary\nPRIVATE RESUME Java experience');
 await page.getByLabel('Job description').fill('Java required\nSQL required\nREST preferred\nNo degree required');await page.getByLabel('Role (optional)').fill('Requirements extraction');
 await page.getByRole('button',{name:'Review draft',exact:true}).click();
 const map=page.getByRole('region',{name:'Job requirements and evidence'});
 await map.getByLabel('Exact requirement quote').fill('Java required');await map.getByRole('button',{name:'Add requirement',exact:true}).click();
 const existing=map.getByRole('article',{name:'Requirement 1',exact:true});await existing.getByLabel('Link original resume evidence').selectOption({label:'Summary: PRIVATE RESUME Java experience'});await existing.getByLabel('Evidence assessment').selectOption('supported');await existing.getByLabel('Review note (optional)').fill('PRIVATE NOTE');
 const section=page.getByRole('region',{name:'AI requirement extraction'});await section.getByRole('button',{name:'Prepare requirements prompt'}).click();
 const prompt=await page.getByLabel('Requirements prompt to share').inputValue();expect(prompt).not.toMatch(/PRIVATE|private@example.com/);
 const payload=JSON.parse(prompt.split('\n\n').at(-1));
 return {section,map,response:{requestId:payload.requestId,suggestions:[{quote:'SQL required',priority:'required',reason:'Database skills'},{quote:'REST preferred',priority:'required',reason:'API skills'},{quote:'No degree required',priority:'required',reason:'Check context'}]}};
}
test('requirements require review and preserve existing evidence through save/reopen and export',async({page})=>{
 const {section,map,response}=await prepare(page);await page.getByLabel('Requirements AI JSON response').fill(JSON.stringify(response));await section.getByRole('button',{name:'Review requirements response'}).click();
 await expect(map.getByRole('article')).toHaveCount(1);await expect(section.getByRole('article')).toHaveCount(3);
 await page.getByRole('button',{name:'Save draft',exact:true}).click();await page.reload();await page.getByRole('button',{name:'Requirements extraction',exact:true}).click();
 const cards=section.getByRole('article');await expect(cards.nth(0).getByRole('button',{name:'Accept requirement'})).toBeVisible();
 await cards.nth(0).getByRole('button',{name:'Accept requirement'}).click();await cards.nth(1).getByRole('button',{name:'Edit requirement',exact:true}).click();await cards.nth(1).getByLabel('Edited requirement priority').selectOption('preferred');await cards.nth(1).getByRole('button',{name:'Apply requirement edits'}).click();await cards.nth(2).getByRole('button',{name:'Reject requirement'}).click();
 await expect(map.getByRole('article')).toHaveCount(3);await expect(map.getByRole('article').nth(0).getByLabel('Evidence assessment')).toHaveValue('supported');await expect(map.getByRole('article').nth(0).getByLabel('Review note (optional)')).toHaveValue('PRIVATE NOTE');await expect(map.getByRole('article').nth(1).getByLabel('Evidence assessment')).toHaveValue('unreviewed');
 await page.getByRole('button',{name:'Save draft',exact:true}).click();await page.reload();await page.getByRole('button',{name:'Requirements extraction',exact:true}).click();await expect(cards.nth(1)).toContainText('Decision: edited');await expect(cards.nth(2)).toContainText('Decision: rejected');
 const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Download draft DOCX',exact:true}).click();const path=await(await pending).path();const text=require('child_process').execFileSync('python3',['-c','import sys,zipfile,xml.etree.ElementTree as E; print("".join(E.fromstring(zipfile.ZipFile(sys.argv[1]).read("word/document.xml")).itertext()))',path],{encoding:'utf8'});expect(text).toContain('PRIVATE RESUME Java experience');expect(text).not.toMatch(/SQL required|REST preferred|PRIVATE NOTE|Database skills/);
 const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('voca_career_profile_v1')));expect(stored.tailorDrafts[0].source.profile.summary).toBe('PRIVATE RESUME Java experience');expect(stored.skills).toEqual([]);
});
test('fabricated quotes and stale responses cannot alter checklist',async({page})=>{
 const {section,map,response}=await prepare(page);response.suggestions[0].quote='Python required';await page.getByLabel('Requirements AI JSON response').fill(JSON.stringify(response));await section.getByRole('button',{name:'Review requirements response'}).click();await expect(section.getByRole('status')).toContainText('exact JD');await expect(map.getByRole('article')).toHaveCount(1);await expect(section.getByRole('article')).toHaveCount(0);
 await map.getByRole('article').getByLabel('Review note (optional)').fill('Changed');await expect(section.getByRole('button',{name:'Review requirements response'})).toBeDisabled();
});
test('empty extraction leaves checklist intact',async({page})=>{
 const {section,map,response}=await prepare(page);response.suggestions=[];await page.getByLabel('Requirements AI JSON response').fill(JSON.stringify(response));await section.getByRole('button',{name:'Review requirements response'}).click();await expect(section.getByRole('status')).toContainText('No additional requirements');await expect(map.getByRole('article')).toHaveCount(1);await expect(section.getByRole('article')).toHaveCount(0);
});
