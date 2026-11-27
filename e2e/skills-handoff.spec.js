const {test,expect}=require('@playwright/test');
async function prepare(page) {
 await page.goto('./#/tailor');
 await page.getByLabel('Paste text or open a TXT, DOCX or PDF file').check();
 await page.getByLabel('Resume text').fill('Name: Alex\nEmail: private@example.com\nSummary\nBuilt Java services and REST APIs. Used SQL.');
 await page.getByLabel('Job description').fill('Java REST SQL Kubernetes');
 await page.getByLabel('Role (optional)').fill('Skills review');
 await page.getByRole('button',{name:'Review draft',exact:true}).click();
 const section=page.getByRole('region',{name:'Skills tailoring'});
 await section.getByRole('checkbox').first().check();
 await section.getByRole('button',{name:'Prepare skills prompt'}).click();
 const prompt=await page.getByLabel('Skills prompt to share').inputValue();expect(prompt).not.toContain('private@example.com');
 const data=JSON.parse(prompt.split('\n\n').at(-1));
 const response={requestId:data.requestId,suggestions:['Java','REST APIs','SQL'].map(skill=>({skill,reason:'Relevant',evidence:{id:data.evidence[0].id,quote:data.evidence[0].quote}}))};
 return {section,response};
}
test('skills require individual review, survive reopen and export only approved additions',async({page})=>{
 const {section,response}=await prepare(page);
 await page.getByLabel('Skills AI JSON response').fill(JSON.stringify(response));await section.getByRole('button',{name:'Review skills response'}).click();
 await page.getByRole('button',{name:'Save draft',exact:true}).click();await page.reload();await page.getByRole('button',{name:'Skills review',exact:true}).click();
 const cards=section.getByRole('article');await expect(cards).toHaveCount(3);
 await cards.nth(0).getByRole('button',{name:'Accept skill',exact:true}).click();
 await cards.nth(1).getByRole('button',{name:'Edit skill',exact:true}).click();await cards.nth(1).getByLabel('Your skill name').fill('REST');await cards.nth(1).getByRole('button',{name:'Apply skill name'}).click();
 await cards.nth(2).getByRole('button',{name:'Reject skill'}).click();
 const priority=page.getByRole('region',{name:'Skill priority'});
 await priority.getByRole('button',{name:'Move skill 2 up',exact:true}).click();
 await expect(priority.getByRole('listitem').first()).toContainText('REST');
 await expect(priority.getByRole('button',{name:'Move skill 1 up',exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'Save draft',exact:true}).click();await page.reload();await page.getByRole('button',{name:'Skills review',exact:true}).click();
 await expect(priority.getByRole('listitem').first()).toContainText('REST');
 await expect(cards.nth(0)).toContainText('Decision: accepted');await expect(cards.nth(1)).toContainText('Decision: edited');await expect(cards.nth(2)).toContainText('Decision: rejected');
 const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('voca_career_profile_v1')));expect(stored.skills).toEqual([]);expect(stored.tailorDrafts[0].source.skills).toEqual([]);
 for(const format of ['DOCX','PDF']) {
  const pending=page.waitForEvent('download');await page.getByRole('button',{name:`Download draft ${format}`,exact:true}).click();const path=await(await pending).path();
  const text=format==='PDF'?require('child_process').execFileSync('pdftotext',[path,'-'],{encoding:'utf8'}):require('child_process').execFileSync('python3',['-c','import sys,zipfile,xml.etree.ElementTree as E; print("\\n".join("".join(p.itertext()) for p in E.fromstring(zipfile.ZipFile(sys.argv[1]).read("word/document.xml")).iter("{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p")))',path],{encoding:'utf8'});
  const skills=text.slice(text.lastIndexOf('Skills'));expect(skills.indexOf('REST')).toBeLessThan(skills.indexOf('Java'));expect(skills).toContain('Java');expect(skills).toContain('REST');expect(skills).not.toContain('SQL');expect(skills).not.toContain('REST APIs');
 }
 await priority.getByRole('button',{name:'Reset skill order'}).click();
 await expect(priority.getByRole('listitem').first()).toContainText('Java');
 await page.getByRole('button',{name:'Save draft',exact:true}).click();await page.reload();await page.getByRole('button',{name:'Skills review',exact:true}).click();
 await expect(priority.getByRole('listitem').first()).toContainText('Java');
 await expect(priority.getByRole('button',{name:'Reset skill order'})).toHaveCount(0);
});
test('unsupported suggestions and stale prompts cannot add skills',async({page})=>{
 const {section,response}=await prepare(page);response.suggestions[0].skill='Kubernetes';
 await page.getByLabel('Skills AI JSON response').fill(JSON.stringify(response));await section.getByRole('button',{name:'Review skills response'}).click();await expect(section.getByRole('status')).toContainText('explicitly');await expect(section.getByRole('article')).toHaveCount(0);
 await page.getByLabel('Edit draft summary').fill('Revised summary.');await expect(section.getByRole('button',{name:'Review skills response'})).toBeDisabled();
});
