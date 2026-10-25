import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {launchBrowser,siteUrl} from './runtime.mjs';
const c=JSON.parse(await fs.readFile('public/course.json','utf8')),report={version:c.contentVersion,diagrams:[],errors:[]};
const b=await launchBrowser(),ctx=await b.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'}),p=await ctx.newPage();p.on('pageerror',e=>report.errors.push(e.message));
try{
 for(const theme of ['light','dark'])for(const l of c.lectures){
  await p.goto(siteUrl+'?mode=print&scope='+l.id);await p.locator('.print-page').last().waitFor();await p.emulateMedia({media:'print'});await p.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
  const expected=l.slides.filter(s=>s.visual).length;assert.equal(await p.locator('.infographic-modern').count(),expected);
  const measured=await p.locator('.infographic-modern').evaluateAll(nodes=>nodes.map(n=>({id:n.closest('[data-slide-id]').dataset.slideId,svg:n.querySelectorAll('svg').length,layout:n.querySelector('[data-diagram-layout]')?.dataset.diagramLayout,copyOverflow:n.closest('.slide-frame').querySelector('.slide-copy').scrollHeight-n.closest('.slide-frame').querySelector('.slide-copy').clientHeight})));assert.ok(measured.every(m=>m.svg===0&&m.layout&&m.copyOverflow<=3),JSON.stringify(measured.filter(m=>m.copyOverflow>3)));report.diagrams.push({lectureId:l.id,theme,items:measured});
 }
 await p.emulateMedia({media:'screen'});await p.goto(siteUrl+'?lecture=01-customer-documents&slide=01-customer-documents-c1-mechanism');const popup=ctx.waitForEvent('page');await p.getByRole('button',{name:'Режим показа',exact:true}).click();const a=await popup;await a.locator('.infographic-modern').waitFor();
 await p.getByRole('button',{name:'Развернуть схему',exact:true}).click();await a.getByRole('dialog',{name:'Подробная схема'}).waitFor();
 await p.getByRole('dialog').getByRole('button',{name:'Далее по схеме'}).click();await a.getByRole('dialog').locator('[data-focus=true]').waitFor();
 await p.getByRole('dialog').getByRole('button',{name:'Далее по схеме'}).click();await p.getByRole('dialog').getByRole('button',{name:'Назад по схеме'}).click();assert.equal(await p.getByRole('dialog').locator('[data-focus=true] .course-step-index').innerText(),'1');
 await a.reload();await a.getByRole('dialog').locator('[data-focus=true]').waitFor();await p.keyboard.press('Escape');await a.getByRole('dialog').waitFor({state:'hidden'});assert.equal(await p.locator('.mini-stage .course-steps [data-focus=true]').count(),1);
 report.sync=['forward','back','late audience','expanded and inline same focus'];assert.deepEqual(report.errors,[]);report.status='passed';
}catch(e){report.status='failed';report.failure=String(e);throw e;}finally{await fs.writeFile('reports/infographics-pass2.json',JSON.stringify(report,null,2)+'\n');await b.close();}
console.log(JSON.stringify({diagrams:report.diagrams.reduce((n,r)=>n+r.items.length,0),status:report.status}));
