import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {launchBrowser,siteUrl}from'./runtime.mjs';
const c=JSON.parse(await fs.readFile('public/course.json','utf8')),pack=JSON.parse(await fs.readFile('public/teacher-pack.json','utf8'));
const b=await launchBrowser(),ctx=await b.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'}),p=await ctx.newPage(),report={version:c.contentVersion,slides:[],endVisibility:[],errors:[]};p.on('pageerror',e=>report.errors.push(e.message));
async function readEnd(){return p.getByRole('tabpanel').evaluate(el=>{
 const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let last,node;while((node=walker.nextNode()))if(node.textContent.trim())last=node;
 if(!last)return {visible:false};const range=document.createRange();range.setStart(last,Math.max(0,last.length-30));range.setEnd(last,last.length);
 let scroll=el;while(scroll&&!(scroll.scrollHeight>scroll.clientHeight+2&&/(auto|scroll)/.test(getComputedStyle(scroll).overflowY)))scroll=scroll.parentElement;
 if(scroll)scroll.scrollTop=scroll.scrollHeight;else document.scrollingElement.scrollTop=document.scrollingElement.scrollHeight;
 const r=range.getBoundingClientRect(),boundary=scroll?.getBoundingClientRect()||{top:0,bottom:innerHeight};
 return {visible:r.height>0&&r.top>=Math.max(0,boundary.top)-2&&r.bottom<=Math.min(innerHeight,boundary.bottom)+2,last:last.textContent.slice(-60),bottom:r.bottom,boundary:boundary.bottom};
})}
try{for(const l of c.lectures){await p.goto(siteUrl+'?mode=presenter&lecture='+l.id+'&slide='+l.slides[0].id+'&session=teacher-pass3-'+l.id);await p.getByRole('tabpanel').waitFor();
 for(const [i,s]of l.slides.entries()){const n=pack.notes[s.id];await p.waitForFunction(text=>document.querySelector('[role=tabpanel]')?.textContent===text,n.script);assert.equal((await p.getByRole('tabpanel').innerText()).trim(),n.script.trim());report.slides.push(s.id);
  if(s.visual||s.id.endsWith('-practice')){const end=await readEnd();assert.ok(end.visible,s.id+' speech '+JSON.stringify(end));report.endVisibility.push({id:s.id,field:'script',...end});}
  if(s.id.endsWith('-practice')||s.task?.type==='matching'){await p.getByRole('tab',{name:'Ответы',exact:true}).click();await p.waitForFunction(text=>document.querySelector('[role=tabpanel]')?.textContent===text,n.answer);const end=await readEnd();assert.ok(end.visible,s.id+' answer '+JSON.stringify(end));report.endVisibility.push({id:s.id,field:'answer',...end});await p.getByRole('tab',{name:'Сценарий',exact:true}).click();}
  if(i<l.slides.length-1)await p.getByRole('button',{name:'Следующий слайд',exact:true}).click();
 }
 console.log(l.id+': all '+l.slides.length+' scripts match panel');}
 assert.deepEqual(report.errors,[]);report.status='passed';
}catch(e){report.status='failed';report.failure=String(e);await p.screenshot({path:'output/playwright/teacher-panel-failure.png'});throw e}finally{await fs.writeFile('reports/teacher-panel-pass3.json',JSON.stringify(report,null,2)+'\n');await b.close()}
console.log('Panel: '+report.slides.length+' scripts, '+report.endVisibility.length+' text endings checked');
