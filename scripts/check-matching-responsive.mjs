import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {launchBrowser,siteUrl} from './runtime.mjs';
const b=await launchBrowser(),ctx=await b.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'}),p=await ctx.newPage(),report={status:'running',checks:[]};
try{
 await p.goto(siteUrl+'?lecture=01-customer-documents&slide=01-customer-documents-Q01-T04');await p.locator('.matching-board').waitFor();
 const right=p.locator('[data-option-id=r0] .matching-choice'),left=p.locator('[data-match-id=i0] .matching-choice');
 await right.focus();await p.keyboard.press('Space');await left.focus();await p.keyboard.press('Space');await p.locator('[data-match-id=i0] [data-match-value=r0]').waitFor();report.checks.push('Keyboard: right then left');
 await p.locator('[data-match-id=i1] .matching-choice').click({position:{x:180,y:35}});await right.click();await p.locator('[data-match-id=i1] [data-match-value=r0]').waitFor();assert.equal(await p.locator('[data-match-id=i0] .matching-selected').getAttribute('data-match-value'),'');assert.equal(await p.locator('[data-match-value=r0]').count(),1);report.checks.push('Whole-row click, replacing a pair and one-to-one constraint');
 await p.screenshot({path:'output/playwright/pass2-matching.png'});
 const course=JSON.parse(await fs.readFile('public/course.json','utf8')),cases=JSON.parse(await fs.readFile('public/practice-cases.json','utf8'));
 for(const theme of ['light','dark']){
  await p.evaluate(({base,theme})=>localStorage.setItem(`lecture:${base}:pisid4:theme`,JSON.stringify(theme)),{base:new URL(siteUrl).pathname,theme});
  for(const type of ['process','comparison','cause']){const l=course.lectures[type==='comparison'?1:0],s=l.slides.find(s=>s.visual?.type===type);await p.goto(siteUrl+'?lecture='+l.id+'&slide='+s.id);await p.locator('.infographic-modern').waitFor();await p.evaluate(()=>document.fonts.ready);await p.screenshot({path:'output/playwright/pass2-'+theme+'-'+type+'.png'});}
 }
 for(const width of [320,390]){
  await p.setViewportSize({width,height:844});for(const c of cases){await p.goto(siteUrl+'?lecture='+c.lectureId+'&slide='+c.returnSlide+'&case='+c.id);const modal=p.locator('.case-dialog[open]');await modal.waitFor();assert.ok(await modal.evaluate(n=>n.scrollWidth<=n.clientWidth+2));assert.ok(await modal.locator('.case-scroll').evaluate(n=>n.scrollWidth<=n.clientWidth+2),c.id+' at '+width);await p.getByRole('button',{name:'Вернуться к слайду'}).click();await modal.waitFor({state:'hidden'});}report.checks.push('20 modals at '+width);}
 await p.goto(siteUrl+'?lecture=01-customer-documents&slide=01-customer-documents-Q01-practice&case=L1-Q1');await p.locator('.case-dialog[open]').waitFor();await p.screenshot({path:'output/playwright/pass2-modal-mobile.png'});
 report.status='passed';
}catch(e){report.status='failed';report.failure=String(e);throw e;}finally{await fs.writeFile('reports/matching-responsive-pass2.json',JSON.stringify(report,null,2)+'\n');await b.close();}
console.log(report);
