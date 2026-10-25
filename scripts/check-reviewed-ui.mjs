import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {launchBrowser,siteUrl} from './runtime.mjs';
const course=JSON.parse(await fs.readFile('public/course.json','utf8'));
const pack=JSON.parse(await fs.readFile('public/teacher-pack.json','utf8'));
const bank=JSON.parse(await fs.readFile('public/assessment.json','utf8'));
const report={version:course.contentVersion,catalog:[],themes:[],session:[],notes:[],errors:[]};
const browser=await launchBrowser();
const context=await browser.newContext({viewport:{width:1280,height:800},reducedMotion:'reduce'});
context.on('page',p=>p.on('pageerror',e=>report.errors.push(e.message)));
const page=await context.newPage();page.setDefaultTimeout(12000);
try{
 for(const width of [320,390,1024]){
  await page.setViewportSize({width,height:844});await page.goto(siteUrl+'?tour=1');
  await page.locator('.ok-topics').waitFor();assert.equal(await page.locator('.ok-topic').count(),5);
  await page.getByRole('button',{name:'Вид: список',exact:true}).click();
  await page.getByRole('searchbox').fill('Нет такой темы');await page.getByRole('heading',{name:'Темы не найдены'}).waitFor();
  await page.getByRole('button',{name:'Сбросить поиск'}).click();
  assert.equal(await page.locator('.ok-topic').count(),5);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
  assert.equal(await page.locator('.tour-card').count(),0);report.catalog.push(width);
 }
 await page.setViewportSize({width:1280,height:800});
 const lecture=course.lectures[0],task=lecture.slides.find(s=>s.task?.type==='matching');
 await page.goto(siteUrl+`?lecture=${lecture.id}&slide=${task.id}`);
 await page.getByRole('button',{name:'Режим показа',exact:true}).waitFor();
 const requests=[];context.on('request',r=>{if(r.url().includes('mode=audience')||r.frame()?.page()?.url().includes('mode=audience'))requests.push(r.url())});
 const popup=context.waitForEvent('page');await page.getByRole('button',{name:'Режим показа',exact:true}).click();const audience=await popup;
 await audience.locator('.matching-board').waitFor();
 assert.equal(await audience.locator('.presenter-notes').count(),0);
 assert.ok(!requests.some(url=>url.includes('teacher-pack')||url.endsWith('/assessment.json')));
 const pairs=bank.keys[task.task.id].pairs;
 for(const item of task.task.items){
  await page.locator(`[data-match-id="${item.id}"] .matching-choice`).click();
  await audience.locator(`[data-match-id="${item.id}"].matching-active`).waitFor();
  await page.locator(`[data-option-id="${pairs[item.id]}"] .matching-choice`).click();
  await audience.locator(`[data-match-id="${item.id}"] [data-match-value="${pairs[item.id]}"]`).waitFor();
 }
 await page.getByRole('button',{name:'Перемешать списки',exact:true}).click();
 const order=await page.locator('[data-match-id]').evaluateAll(nodes=>nodes.map(n=>n.dataset.matchId));
 await audience.waitForFunction(order=>JSON.stringify([...document.querySelectorAll('[data-match-id]')].map(n=>n.dataset.matchId))===JSON.stringify(order),order);
 await audience.reload();await audience.locator('.matching-board').waitFor();
 for(const item of task.task.items)await audience.locator(`[data-match-id="${item.id}"] [data-match-value="${pairs[item.id]}"]`).waitFor();
 await page.getByRole('button',{name:'Проверить',exact:true}).click();await audience.locator('.task-status.correct').waitFor();
 await page.getByRole('tab',{name:'Ответы',exact:true}).click();assert.equal(await audience.locator('.note-reader').count(),0);
 await page.getByRole('button',{name:'Чёрный экран',exact:true}).click();await audience.locator('.black-screen').waitFor();
 await page.getByRole('button',{name:'Вернуть слайд',exact:true}).click();await audience.locator('.matching-board').waitFor();
 await page.locator('.pd-more>summary').click();
 await page.getByRole('button',{name:'Сменить тему',exact:true}).click();
 await audience.waitForFunction(()=>document.documentElement.dataset.theme==='dark');
 report.session=['matching pairs and selection','shuffled order','late audience','correct result','private answer tab','black screen','theme sync'];
 await page.screenshot({path:'output/playwright/presenter-dark.png'});await audience.screenshot({path:'output/playwright/audience-dark.png'});
 const stopped=audience.waitForEvent('close');await page.getByRole('button',{name:'Завершить показ',exact:true}).click();await stopped;
 for(const theme of ['light','dark']){
  await page.evaluate(({base,theme})=>localStorage.setItem(`lecture:${base}:pisid4:theme`,JSON.stringify(theme)),{base:new URL(siteUrl).pathname,theme});
  for(const suffix of ['start','Q01','c1-notebook','Q01-worked','Q01-practice']){
   await page.goto(siteUrl+`?lecture=${lecture.id}&slide=${lecture.id}-${suffix}`);await page.locator('.active-slide').waitFor();
   await page.screenshot({path:`output/playwright/${theme}-${suffix}.png`});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
  }
  report.themes.push(theme);
 }
 const base=new URL(siteUrl).pathname,first=lecture.slides[0],second=lecture.slides[1];
 const baseline=JSON.parse(await fs.readFile('authoring/baseline-note-hashes.json','utf8'));
 const original=JSON.parse((await import('node:child_process')).execFileSync('git',['show','30fb5e1:public/teacher-pack.json'],{encoding:'utf8',maxBuffer:5e6}));
 await page.evaluate(({key,notes,id})=>localStorage.setItem(key,JSON.stringify({...notes,[id]:{...notes[id],script:'Моя личная запись'}})),{key:`lecture:${base}:pisid4:private:${baseline.contentVersion}`,notes:original.notes,id:first.id});
 await page.goto(siteUrl+`?mode=presenter&lecture=${lecture.id}&slide=${first.id}&session=notes-review`);
 await page.getByRole('tabpanel').waitFor();assert.equal((await page.getByRole('tabpanel').innerText()).trim(),'Моя личная запись');
 await page.getByRole('button',{name:'Следующий слайд',exact:true}).click();
 await page.waitForFunction(text=>document.querySelector('[role=tabpanel]')?.textContent===text,pack.notes[second.id].script);
 const old=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),`lecture:${base}:pisid4:private:${baseline.contentVersion}`);
 assert.equal(old[first.id].script,'Моя личная запись');
 assert.equal(await page.evaluate(key=>localStorage.getItem(key),`lecture:${base}:pisid4:private:${course.contentVersion}`),null);
 report.notes=['old defaults updated','personal script preserved','old storage unchanged','defaults require no storage write'];
 assert.deepEqual(report.errors,[]);report.status='passed';
}catch(e){report.status='failed';report.failure=String(e);await page.screenshot({path:'output/playwright/review-failure.png'});throw e;}
finally{await fs.writeFile('reports/reviewed-ui.json',JSON.stringify(report,null,2)+'\n');await browser.close();}
console.log(JSON.stringify(report));
