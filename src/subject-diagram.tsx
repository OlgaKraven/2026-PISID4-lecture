import {DataTable} from './course-diagram';
import models from '../public/subject-diagrams.json';
import './subject-diagram.css';
export type SubjectModel=(typeof models)[number];
export function SubjectDiagram({index,view,focus,onFocus,readonly,print}:{index:number;view:string;focus:number;onFocus:(n:number)=>void;readonly:boolean;print:boolean}){
 const m=models[index];if(!m)throw Error('Нет предметной модели '+index);
 const controls=!print&&view!=='failure'&&view!=='comparison';
 const trace=print&&view==='trace';
 return <div className={'subject-diagram subject-'+m.kind} data-subject-model={index} data-subject-view={view}>
  <p className="subject-rule">{m.rule}</p>
  {view==='failure'?<div className="subject-failure"><div><span>Исходные данные</span><p>{m.failure.input}</p></div><div><span>Ошибочное действие</span><p>{m.failure.action}</p></div><div><span>Наблюдаемый сбой</span><p>{m.failure.observed}</p></div><div><span>Как проверить исправление</span><p>{m.failure.repair}</p></div></div>:
  view==='comparison'?<DataTable columns={['Вариант','Наблюдение','Основание']} rows={[[m.failure.action,m.failure.observed,m.failure.input],[m.failure.repair,'repaired' in m.failure?String(m.failure.repaired):m.failure.repair,m.rule]]}/>:
  trace?<ol className="subject-print-trace">{m.trace.map((s,i)=><li key={i}><strong>{i+1}. {s.action}</strong><p>{s.observed}</p></li>)}</ol>:
  <>
   {focus===0&&m.kind==='budget'&&<div className="subject-time" aria-label="Распределение учебного времени">{m.rows.map((r,i)=>{const [a,b]=r[0].split('–').map(Number),total=Number(m.rows.at(-1)![0].split('–')[1]);return <span key={i} style={{flex:b-a}} data-focus={focus===i+1}><b>{a}–{b}</b><small>мин</small><span className="sr-only">Длительность {b-a} из {total} минут</span></span>})}</div>}
   {focus===0&&(m.kind==='states'?<div className="subject-state-map">{m.rows.map((r,i)=><div key={i} data-focus={focus===i+1}><code>{r[0]}</code><span><small>{r[1]}</small><b aria-hidden="true">→</b></span><code>{r[2]}</code></div>)}</div>:m.kind==='budget'?<div className="subject-budget-grid">{m.rows.map((r,i)=><section key={i}><strong>{r[0]} мин · {r[1]}</strong><p>{r[2]}</p></section>)}</div>:<DataTable columns={m.columns} rows={m.rows}/>)}
   {focus>0&&<section className="subject-explanation" aria-live="polite"><strong>{focus}. {m.trace[focus-1].action}</strong><p>{m.trace[focus-1].observed}</p><p>{m.trace[focus-1].why}</p></section>}
  </>}
  {controls&&<div className="subject-controls"><span role="status">{focus?`Шаг разбора ${focus} из ${m.trace.length}`:'Обзор модели'}</span>{!readonly&&<><button className="button secondary" type="button" onClick={()=>onFocus(0)}>Обзор</button><button className="button secondary" type="button" disabled={!focus} onClick={()=>onFocus(focus-1)}>Назад по схеме</button><button className="button secondary" type="button" disabled={focus===m.trace.length} onClick={()=>onFocus(focus+1)}>Далее по схеме</button></>}</div>}
 </div>;
}
