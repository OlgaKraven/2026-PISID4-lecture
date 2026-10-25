import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {launchBrowser,siteUrl} from './runtime.mjs';
const course=JSON.parse(await fs.readFile('public/course.json','utf8')),practices=JSON.parse(await fs.readFile('public/practice-cases.json','utf8')),student=JSON.parse(await fs.readFile('reports/student-review-pass2.json','utf8'));
const pack=JSON.parse(await fs.readFile('public/teacher-pack.json','utf8'));
const report={version:course.contentVersion,cases:[],errors:[]},browser=await launchBrowser(),context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'}),page=await context.newPage();
context.on('page',p=>{p.setDefaultTimeout(12000);p.on('pageerror',e=>report.errors.push(e.message))});
try{
 for(const l of course.lectures){
  const cases=practices.filter(c=>c.lectureId===l.id);await page.goto(siteUrl+`?lecture=${l.id}&slide=${cases[0].returnSlide}`);
  const popup=context.waitForEvent('page');await page.getByRole('button',{name:'Режим показа',exact:true}).click();const audience=await popup;await audience.locator('.audience-slide').waitFor();
  for(const c of cases){
   if(c!==cases[0]){await page.getByRole('button',{name:'Содержание',exact:true}).click();await page.locator('.presenter-outline button').filter({hasText:c.title}).click();}
   await page.getByRole('button',{name:'Разбор задачи',exact:true}).click();const panel=page.locator('.case-dialog[open]'),screen=audience.locator('.case-dialog[open]');
   await screen.getByRole('heading',{name:c.title,exact:true}).waitFor();assert.equal(await screen.locator('.case-solution').count(),0);
   const answers=student.cases.find(x=>x.id===c.id).studentDerivedAnswers;
   await panel.getByLabel('Прогноз: что должно получиться').fill('Самостоятельный прогноз '+c.id);
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
   await panel.getByRole('button',{name:'Вернуться к слайду'}).click();await screen.waitFor({state:'hidden'});
   report.cases.push({id:c.id,studentAnswers:answers,wrongAndCorrect:2,publicArtifact:true,teacherAndScreenAgree:true,comparisonVisible:true,lateAudience:true,changingEitherAnswerHidesSolution:true,firstChangeResetsSecond:true});
  }
  console.log(l.id+': four cases reviewed against independently derived answers');await page.getByRole('button',{name:'Завершить показ',exact:true}).click();
 }
 assert.deepEqual(report.errors,[]);report.status='passed';
}catch(e){report.status='failed';report.failure=String(e);await page.screenshot({path:'output/playwright/modal-review-failure.png'});throw e;}
finally{await fs.writeFile('reports/student-runtime-pass2.json',JSON.stringify(report,null,2)+'\n');await browser.close();}
console.log(JSON.stringify({cases:report.cases.length,status:report.status}));
