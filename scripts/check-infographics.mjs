import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {launchBrowser,siteUrl} from './runtime.mjs';
const c=JSON.parse(await fs.readFile('public/course.json','utf8'));
const models=JSON.parse(await fs.readFile('public/subject-diagrams.json','utf8'));
const report={version:c.contentVersion,url:siteUrl,print:[],show:[],steps:[],errors:[]};
const b=await launchBrowser(),ctx=await b.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'}),p=await ctx.newPage();
ctx.on('page',p=>{p.setDefaultTimeout(12000);p.on('pageerror',e=>report.errors.push(e.message))});
const measure=async locator=>locator.evaluateAll(nodes=>nodes.map(n=>{
 const copy=n.querySelector('.slide-copy'),bound=n.querySelector('.slide-content').getBoundingClientRect();
 const outside=[...copy.querySelectorAll('.subject-diagram p,.subject-diagram li,.subject-diagram tr,.subject-controls,figcaption')].filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&(r.bottom>bound.bottom+2||r.right>bound.right+2)}).map(el=>el.textContent.slice(0,100));
 return {id:n.dataset.slideId,model:n.querySelector('[data-subject-model]')?.dataset.subjectModel,outside,overflow:copy.scrollHeight-copy.clientHeight};
}));
try{
 for(const theme of ['light','dark'])for(const l of c.lectures){
  await p.goto(siteUrl+'?mode=print&scope='+l.id);await p.locator('.print-page').last().waitFor();await p.emulateMedia({media:'print'});await p.evaluate(async t=>{document.documentElement.dataset.theme=t;await document.fonts.ready},theme);
  const items=await measure(p.locator('.slide-frame.has-visual'));assert.equal(items.length,l.slides.filter(s=>s.visual).length);
  assert.ok(items.every(x=>x.model!==undefined&&!x.outside.length&&x.overflow<4),JSON.stringify(items.filter(x=>x.outside.length||x.overflow>3)));
  report.print.push({lecture:l.id,theme,items});
 }
 await p.emulateMedia({media:'screen'});const tested=new Set();
 for(const l of c.lectures){
  const visuals=l.slides.filter(s=>s.visual);await p.goto(siteUrl+'?lecture='+l.id+'&slide='+visuals[0].id);
  const popup=ctx.waitForEvent('page');await p.getByRole('button',{name:'Режим показа',exact:true}).click();const a=await popup;
  for(const s of visuals){
   if(s!==visuals[0]){await p.getByRole('button',{name:'Содержание',exact:true}).click();await p.locator('.presenter-outline button').nth(l.slides.indexOf(s)).click();}
   const frame=a.locator('[data-slide-id="'+s.id+'"]');await frame.waitFor();await a.evaluate(()=>document.fonts.ready);
   const [item]=await measure(frame);assert.ok(item.model!==undefined);report.show.push(item);
   if(['failure','comparison'].includes(s.visual.subjectView)||tested.has(s.visual.modelIndex))continue;
   tested.add(s.visual.modelIndex);await p.getByRole('button',{name:'Развернуть схему',exact:true}).click();const pd=p.getByRole('dialog',{name:'Подробная схема'}),ad=a.getByRole('dialog',{name:'Подробная схема'});await ad.waitFor();
   const count=models[s.visual.modelIndex].trace.length;
   for(let step=1;step<=count;step++){const next=pd.getByRole('button',{name:'Далее по схеме'});await next.focus();await p.keyboard.press('Enter');await ad.getByRole('status').filter({hasText:'Шаг разбора '+step+' из '+count}).waitFor();assert.equal(await pd.locator('.subject-explanation').innerText(),await ad.locator('.subject-explanation').innerText());}
   const previous='Шаг разбора '+(count-1)+' из '+count;
   await pd.getByRole('button',{name:'Назад по схеме'}).click();await ad.getByRole('status').filter({hasText:previous}).waitFor();await a.reload();await a.getByRole('dialog').getByRole('status').filter({hasText:previous}).waitFor();
   await p.keyboard.press('Escape');await a.getByRole('dialog').waitFor({state:'hidden'});assert.equal(await a.locator('.subject-controls [role=status]').innerText(),previous);
   report.steps.push({model:s.visual.modelIndex,forward:count,back:1,keyboard:true,lateAudience:true,inlineSync:true});
  }
  await p.getByRole('button',{name:'Завершить показ',exact:true}).click();await a.close();console.log(l.id+': '+visuals.length+' diagrams checked in audience');
 }
 assert.equal(tested.size,models.length);assert.deepEqual(report.errors,[]);assert.deepEqual(report.show.filter(x=>x.outside.length||x.overflow>3),[]);report.status='passed';
}catch(e){report.status='failed';report.failure=String(e);await p.screenshot({path:'output/playwright/subject-check-failure.png'});throw e}finally{await fs.writeFile(process.env.REVIEW_REPORT||'reports/infographics-pass3.json',JSON.stringify(report,null,2)+'\n');await b.close()}
console.log(JSON.stringify({print:report.print.reduce((n,x)=>n+x.items.length,0),show:report.show.length,models:report.steps.length,status:report.status}));
