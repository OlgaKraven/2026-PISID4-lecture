import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {launchBrowser,siteUrl} from './runtime.mjs';
const course=JSON.parse(await fs.readFile('public/course.json','utf8')),practices=JSON.parse(await fs.readFile('public/practice-cases.json','utf8')),student=JSON.parse(await fs.readFile('reports/student-review-pass3.json','utf8'));
const pack=JSON.parse(await fs.readFile('public/teacher-pack.json','utf8'));
const bank=JSON.parse(await fs.readFile('public/assessment.json','utf8'));
const report={stage:1,url:siteUrl,checkedAt:new Date().toISOString(),version:course.contentVersion,resources:[],cases:[],matching:[],errors:[]},browser=await launchBrowser(),context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'}),page=await context.newPage();
context.on('page',p=>{p.setDefaultTimeout(12000);p.on('pageerror',e=>report.errors.push(e.message))});
try{
 for(const name of ['course.json','practice-cases.json','assessment.json','teacher-pack.json','subject-diagrams.json']){const response=await context.request.get(siteUrl+name+'?audit='+Date.now());assert.equal(response.status(),200);const bytes=await response.body();assert.ok(bytes.equals(await fs.readFile('public/'+name)),name+' differs');report.resources.push({name,sha256:createHash('sha256').update(bytes).digest('hex')});}
 for(const l of course.lectures){
  const cases=practices.filter(c=>c.lectureId===l.id);await page.goto(siteUrl+`?lecture=${l.id}&slide=${cases[0].returnSlide}`);
  const popup=context.waitForEvent('page');await page.getByRole('button',{name:'Режим показа',exact:true}).click();const audience=await popup;await audience.locator('.audience-slide').waitFor();
  for(const c of cases){
   if(c!==cases[0]){await page.getByRole('button',{name:'Содержание',exact:true}).click();await page.locator('.presenter-outline button').filter({hasText:c.title}).click();}
   await page.getByRole('button',{name:'Разбор задачи',exact:true}).click();const panel=page.locator('.case-dialog[open]'),screen=audience.locator('.case-dialog[open]');
   await screen.getByRole('heading',{name:c.title,exact:true}).waitFor();assert.equal(await screen.locator('.case-solution').count(),0);
   const answers=student.cases.find(x=>x.id===c.id).studentDerivedAnswers;
   await panel.getByLabel('Прогноз: что должно получиться').fill('Самостоятельный прогноз '+c.id);await screen.getByLabel('Прогноз: что должно получиться').waitFor();await audience.waitForFunction(text=>document.querySelector('.case-dialog textarea')?.value===text,'Самостоятельный прогноз '+c.id);
   for(let i=0;i<2;i++){
    const input=panel.getByRole('textbox',{name:c.fields[i].label,exact:true});
    await input.fill('ошибка');await panel.getByRole('button',{name:'Проверить шаг '+(i+1),exact:true}).click();await screen.locator('[data-status=fail]').waitFor();
    await input.fill(answers[i]);await panel.getByRole('button',{name:'Проверить шаг '+(i+1),exact:true}).click();await screen.locator('[data-status=pass]').nth(i).waitFor();
    assert.ok((await screen.locator('.case-source').innerText()).includes(answers[i]));
   }
   await panel.getByRole('button',{name:'Показать разбор после попытки'}).click();await screen.locator('.case-solution').waitFor();
   const solution=await screen.locator('.case-solution').innerText();for(const answer of answers)assert.ok(solution.includes(answer));
   assert.ok(solution.includes(c.change.result));assert.ok(pack.notes[c.returnSlide].answer.includes(c.change.result));
   for(const f of c.fields){assert.ok(solution.includes(f.instruction));assert.ok(solution.includes(f.success));assert.ok(pack.notes[c.returnSlide].answer.includes(f.success));}
   await audience.reload();await audience.locator('.case-solution').waitFor();assert.equal(await audience.getByLabel('Прогноз: что должно получиться').inputValue(),'Самостоятельный прогноз '+c.id);
   await panel.getByRole('textbox',{name:c.fields[1].label,exact:true}).fill('изменено');await screen.locator('.case-solution').waitFor({state:'hidden'});
   await panel.getByRole('textbox',{name:c.fields[0].label,exact:true}).fill('новое');await screen.locator('[data-status=pass]').waitFor({state:'hidden'});assert.equal(await panel.getByRole('textbox',{name:c.fields[1].label,exact:true}).inputValue(),'');
   await panel.getByRole('textbox',{name:'Обоснование и граница вывода',exact:true}).fill('Мой вывод '+c.id);await audience.waitForFunction(text=>[...document.querySelectorAll('.case-dialog textarea')].at(-1)?.value===text,'Мой вывод '+c.id);
   await panel.locator('.case-scroll').evaluate(n=>{n.scrollTop=n.scrollHeight});await audience.waitForFunction(()=>{const n=document.querySelector('.case-scroll');return n&&n.scrollTop>0});
   await page.keyboard.press('Escape');await screen.waitFor({state:'hidden'});
   await page.getByRole('button',{name:'Разбор задачи',exact:true}).click();await screen.waitFor();await panel.getByRole('button',{name:'Вернуться к слайду'}).click();await screen.waitFor({state:'hidden'});
   report.cases.push({id:c.id,studentAnswers:answers,wrongAndCorrect:2,publicArtifact:true,teacherAndScreenAgree:true,comparisonVisible:true,lateAudience:true,changingEitherAnswerHidesSolution:true,firstChangeResetsSecond:true});
  }
  for(const taskSlide of l.slides.filter(s=>s.task?.type==='matching')){
   await page.getByRole('button',{name:'Содержание',exact:true}).click();const index=l.slides.indexOf(taskSlide);await page.locator('.presenter-outline button').nth(index).click();await audience.locator('[data-slide-id="'+taskSlide.id+'"] .matching-board').waitFor();
   const task=taskSlide.task,pairs=bank.keys[task.id].pairs;
   for(const method of ['mouse','keyboard']){
    for(const item of task.items){const left=page.locator(`[data-match-id="${item.id}"] .matching-choice`),right=page.locator(`[data-option-id="${pairs[item.id]}"] .matching-choice`);
     if(method==='mouse'){await left.click({position:{x:100,y:30}});await right.click();}else{await right.focus();await page.keyboard.press('Space');await left.focus();await page.keyboard.press('Enter');}
     await audience.locator(`[data-match-id="${item.id}"] [data-match-value="${pairs[item.id]}"]`).waitFor();
    }
    await page.getByRole('button',{name:'Проверить',exact:true}).click();await audience.locator('.task-status.correct').waitFor();
    await audience.reload();await audience.locator('.task-status.correct').waitFor();
    report.matching.push({slideId:taskSlide.id,method,pairs:4,correct:true,audienceRestored:true});
    if(method==='mouse')await page.getByRole('button',{name:'Ещё попытка',exact:true}).click();
   }
  }
  console.log(l.id+': four public modals and four matching tasks (mouse + keyboard) passed');await page.getByRole('button',{name:'Завершить показ',exact:true}).click();
 }
 assert.deepEqual(report.errors,[]);report.status='passed';
}catch(e){report.status='failed';report.failure=String(e);await page.screenshot({path:'output/playwright/modal-review-failure.png'});throw e;}
finally{await fs.writeFile(process.env.REVIEW_REPORT||'reports/public-show-pass3.json',JSON.stringify(report,null,2)+'\n');await browser.close();}
console.log(JSON.stringify({cases:report.cases.length,matchingAttempts:report.matching.length,status:report.status}));
