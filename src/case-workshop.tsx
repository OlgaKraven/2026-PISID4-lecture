import {useEffect,useRef} from 'react';
import type {Slide} from '@olgakraven/lecture-engine';
import cases from '../public/practice-cases.json';
import {useDemoState} from './experiment-state';
import './case-workshop.css';
type Practice=(typeof cases)[number];
function returnURL(c:Practice){return import.meta.env.BASE_URL+'?lecture='+c.lectureId+'&slide='+c.returnSlide;}
export function CasePassport({slide,interactive}:{slide:Slide;interactive:boolean}){
 const c=cases.find(x=>x.returnSlide===slide.id);if(!c)return null;
 return <section className="case-passport"><div><h3>Задача</h3><p>{c.input}</p></div><div><h3>Что проверить</h3><p>Получите два результата: {c.fields.map(f=>f.label.toLowerCase()).join('; ')}. Объясните использованные данные и границу решения.</p></div><a className={'button primary'+(!interactive?' case-audience-link':'')} href={returnURL(c)+'&case='+c.id} target="_blank" rel="noopener noreferrer">Интерактивная схема</a><a className="case-print-link" href={'https://olgakraven.github.io/2026-PISID4-lecture/?lecture='+c.lectureId+'&slide='+c.returnSlide+'&case='+c.id}>Самостоятельный случай ↗</a></section>;
}
export function StandaloneCase({id,version}:{id:string;version:string}){
 const c=cases.find(c=>c.id===id);
 useEffect(()=>{try{document.documentElement.dataset.theme=JSON.parse(localStorage.getItem('lecture:'+import.meta.env.BASE_URL+':pisid4:theme')||'"light"')}catch{}},[]);
 if(!c)return <main><h1>Задача не найдена</h1><a href={import.meta.env.BASE_URL}>К каталогу</a></main>;
 return <main className="case-standalone"><header className="case-top"><strong>Самостоятельный разбор</strong><a className="button secondary" href={returnURL(c)}>Вернуться к слайду</a></header><CaseEditor key={id} c={c} writable={true} version={version}/></main>;
}
function CaseEditor({c,writable,version}:{c:Practice;writable:boolean;version:string}){
 const [s,update]=useDemoState('practice:'+c.id,{prediction:'',value0:'',value1:'',status0:'',status1:'',tries:0,revealed:false,reason:'',scroll:0},writable,version+':'+c.revision);
 const content=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(!writable&&content.current)content.current.scrollTop=Number(s.scroll)*Math.max(0,content.current.scrollHeight-content.current.clientHeight)},[s.scroll,writable]);
 const normalize=(v:string)=>v.trim().toLocaleLowerCase('ru').replace(/ё/g,'е').replace(/\s+/g,' ').replace(/(\d),(\d)/g,'$1.$2');
 const check=(i:number)=>{const input=normalize(String(s['value'+i])),expected=normalize(c.fields[i].answer),numeric=/^-?\d+(?:\.\d+)?$/.test(expected),number=input.replace(/\s/g,'');const correct=numeric?/^-?\d+(?:\.\d+)?$/.test(number)&&Number(number)===Number(expected):input===expected;update({['status'+i]:correct?'pass':'fail',tries:Number(s.tries)+1})};
 return <div ref={content} className="case-scroll" onScroll={e=>{if(writable)update({scroll:e.currentTarget.scrollTop/Math.max(1,e.currentTarget.scrollHeight-e.currentTarget.clientHeight)})}}>
  <h1>{c.title}</h1><p className="case-context">Учебные данные · {c.concepts.join(' и ')}</p><p>{c.input}</p><p className="case-environment">{c.environment}</p>
  <label className="case-field">Прогноз: что должно получиться<textarea value={String(s.prediction)} readOnly={!writable} onChange={e=>update({prediction:e.target.value})}/></label>
  <div className="case-trace" aria-label="Построение артефакта"><span>Исходное условие</span><span aria-hidden="true">→</span><span data-active={s.status0==='pass'}>{c.fields[0].label}</span><span aria-hidden="true">→</span><span data-active={s.status1==='pass'}>{c.fields[1].label}</span></div>
  <div className="case-steps">{c.fields.map((f,i)=><fieldset key={f.label} disabled={!writable||(i===1&&s.status0!=='pass')}><legend>Шаг {i+1}. {f.label}</legend><label className="case-field">Результат<input aria-label={f.label} value={String(s['value'+i])} onChange={e=>update({['value'+i]:e.target.value,['status'+i]:'',...(i===0?{status1:'',value1:'',revealed:false}:{})})}/><small>Введите число, идентификатор или точное название из условия. Обоснование запишите отдельно.</small></label>{writable&&<button className="button primary" onClick={()=>check(i)}>Проверить шаг {i+1}</button>}<p role="status" data-status={String(s['status'+i])}>{s['status'+i]==='pass'?'Результат шага совпал с условием.':s['status'+i]==='fail'?'Пересмотрите результат. '+f.hint:i===1&&s.status0!=='pass'?'Сначала подтвердите первый результат.':'Введите собственный результат по данным условия.'}</p></fieldset>)}</div>
  <label className="case-field">Обоснование и граница вывода<textarea value={String(s.reason)} readOnly={!writable} onChange={e=>update({reason:e.target.value})}/></label><p>Обоснование проверяется по критериям ниже; заполненное поле не означает верный ответ.</p><ul>{c.criteria.map(x=><li key={x}>{x}</li>)}</ul>
  {writable&&<button className="button secondary" disabled={Number(s.tries)===0} onClick={()=>update({revealed:!s.revealed})}>{s.revealed?'Скрыть разбор':'Показать разбор после попытки'}</button>}
  {s.revealed&&<section className="case-solution"><h2>Разбор решения</h2>{c.fields.map((f,i)=><p key={f.label}><strong>Шаг {i+1}: {f.answer}.</strong> {f.hint}</p>)}<p>{c.explanation}</p><p><strong>Граница:</strong> {c.boundary}</p></section>}
 </div>;
}
