import {useEffect,useRef,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import type {Slide} from '@olgakraven/lecture-engine';
import cases from '../public/practice-cases.json';
import {useDemoState} from './experiment-state';
import {DataTable} from './course-diagram';
import './case-workshop.css';
type Practice=(typeof cases)[number];
export function CasePassport({slide,interactive}:{slide:Slide;interactive:boolean}){
 const c=cases.find(x=>x.returnSlide===slide.id);if(!c)return null;
 return <section className="case-passport"><div><h3>Задача</h3><p>{c.input}</p></div><div><h3>Что проверить</h3><p>Получите два результата: {c.fields.map(f=>f.label.toLowerCase()).join('; ')}. Объясните исходные данные, выполненную операцию и границу вывода.</p></div>{interactive&&<button className="button primary" type="button" aria-haspopup="dialog" onClick={()=>document.dispatchEvent(new CustomEvent('pisid-case',{detail:c.id}))}>Разбор задачи</button>}<a className="case-print-link" href={'https://olgakraven.github.io/2026-PISID4-lecture/?lecture='+c.lectureId+'&slide='+c.returnSlide+'&case='+c.id}>Разбор задачи ↗</a></section>;
}
export function CaseTools({version,children}:{version:string;children:ReactNode}){
 const params=new URLSearchParams(location.search),audience=params.get('mode')==='audience',print=params.get('mode')==='print';
 const [s,update]=useDemoState('case-window',{caseId:audience||print?'':params.get('case')||''},!audience,version);
 const c=cases.find(c=>c.id===s.caseId),dialog=useRef<HTMLDialogElement>(null),opener=useRef<HTMLElement|null>(null);
 useEffect(()=>{const open=(e:Event)=>{if(!audience&&!print){opener.current=document.activeElement as HTMLElement;update({caseId:String((e as CustomEvent).detail)})}};document.addEventListener('pisid-case',open);return()=>document.removeEventListener('pisid-case',open)},[audience,print,update]);
 useEffect(()=>{if(c&&dialog.current&&!dialog.current.open)dialog.current.showModal()},[c]);
 const close=()=>{if(audience)return;update({caseId:''});const url=new URL(location.href);url.searchParams.delete('case');history.replaceState(history.state,'',url);opener.current?.focus();};
 return <>{children}{c&&!print&&createPortal(<dialog ref={dialog} className="case-dialog" data-readonly={audience} aria-label={'Разбор задачи: '+c.title} onCancel={e=>{e.preventDefault();close()}}><header className="case-top"><strong>Разбор задачи</strong>{!audience&&<button className="button secondary" type="button" onClick={close}>Вернуться к слайду</button>}</header><CaseEditor key={c.id} c={c} writable={!audience} version={version}/></dialog>,document.body)}</>;
}
function CaseEditor({c,writable,version}:{c:Practice;writable:boolean;version:string}){
 const [s,update]=useDemoState('practice:'+c.id,{prediction:'',value0:'',value1:'',status0:'',status1:'',tries:0,revealed:false,reason:'',scroll:0,focus:0},writable,version+':'+c.revision);
 const content=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(!writable&&content.current)content.current.scrollTop=Number(s.scroll)*Math.max(0,content.current.scrollHeight-content.current.clientHeight)},[s.scroll,writable]);
 const normalize=(v:string)=>v.trim().toLocaleLowerCase('ru').replace(/ё/g,'е').replace(/\s+/g,' ');
 const check=(i:number)=>{const input=normalize(String(s['value'+i])),expected=normalize(c.fields[i].answer),numeric=/^-?\d+$/.test(expected);const correct=numeric?/^-?\d+$/.test(input)&&Number(input)===Number(expected):input===expected;update({['status'+i]:correct?'pass':'fail',tries:Number(s.tries)+1,focus:i+1})};
 return <div ref={content} className="case-scroll" onScroll={e=>{if(writable)update({scroll:e.currentTarget.scrollTop/Math.max(1,e.currentTarget.scrollHeight-e.currentTarget.clientHeight)})}}>
 <h1>{c.title}</h1><p className="case-condition">{c.input}</p><p className="case-environment">{c.environment}</p>
 <div className="case-workspace"><section className="case-source"><h2>Исходные данные</h2><DataTable columns={c.source.columns} rows={c.source.rows}/><h2>Собранный результат</h2><DataTable columns={['Результат','Введено','Проверка']} rows={c.fields.map((f,i)=>[f.label,String(s['value'+i])||'—',s['status'+i]==='pass'?'Проверено':s['status'+i]==='fail'?'Есть расхождение':'Не проверено'])}/><p>Здесь показаны ваши значения. Полный разбор открывается после попытки отдельной кнопкой.</p></section>
 <section className="case-work"><label className="case-field">Прогноз: что должно получиться<textarea value={String(s.prediction)} readOnly={!writable} onChange={e=>update({prediction:e.target.value})}/></label><div className="case-steps">{c.fields.map((f,i)=><fieldset key={f.label} disabled={!writable||(i===1&&s.status0!=='pass')} data-focus={s.focus===i+1}><legend>Шаг {i+1}. {f.label}</legend><p>{f.instruction}</p><label className="case-field">Результат<input aria-label={f.label} value={String(s['value'+i])} onChange={e=>update({['value'+i]:e.target.value,['status'+i]:'',focus:i+1,revealed:false,...(i===0?{status1:'',value1:''}:{})})}/><small>{f.format}</small></label>{writable&&<button className="button primary" type="button" onClick={()=>check(i)}>Проверить шаг {i+1}</button>}<p role="status" data-status={String(s['status'+i])}>{s['status'+i]==='pass'?f.success:s['status'+i]==='fail'?'Есть расхождение. '+f.instruction+' Проверьте формат: '+f.format:i===1&&s.status0!=='pass'?'Этот шаг откроется после проверки первого.':'Выполните операцию и введите результат.'}</p></fieldset>)}</div></section></div>
 <label className="case-field">Обоснование и граница вывода<textarea value={String(s.reason)} readOnly={!writable} onChange={e=>update({reason:e.target.value})}/></label><p>Обоснование обсуждается по критериям; заполнение поля не означает правильность.</p><ul>{c.criteria.map(x=><li key={x}>{x}</li>)}</ul>
 {writable&&<button className="button secondary" type="button" disabled={Number(s.tries)===0} onClick={()=>update({revealed:!s.revealed})}>{s.revealed?'Скрыть разбор':'Показать разбор после попытки'}</button>}
 {s.revealed&&<section className="case-solution"><h2>Разбор решения</h2><ol>{c.fields.map(f=><li key={f.label}><p>{f.instruction}</p><p><strong>{f.label}: {f.answer}.</strong> {f.hint}</p><p>На экране после правильной проверки: «{f.success}».</p></li>)}</ol><p>{c.explanation}</p><h3>Изменённое условие</h3><p>{c.change.input}.</p><p>{c.change.result}</p><p><strong>Граница:</strong> {c.boundary}</p></section>}
 </div>;
}
