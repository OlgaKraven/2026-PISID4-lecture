import type {Slide} from '@olgakraven/lecture-engine';
import {useDemoState} from './experiment-state';
import './course-diagram.css';
import {SubjectDiagram} from './subject-diagram';
type Visual=NonNullable<Slide['visual']>;
function visualId(v:Visual){let n=2166136261;for(const c of JSON.stringify(v))n=Math.imul(n^c.charCodeAt(0),16777619);return (n>>>0).toString(16);}
const codeCell=(s:string)=>/^[A-Za-z0-9_().,:;=+ \->/]+$/.test(s);
export function DataTable({columns,rows}:{columns:string[];rows:string[][]}){
 return <div className="course-table-scroll" tabIndex={0}><table className="course-data-table"><thead><tr>{columns.map((c,i)=><th key={i} scope="col">{c}</th>)}</tr></thead><tbody>{rows.map((row,i)=><tr key={i}>{row.map((cell,j)=>j===0?<th scope="row" key={j}><span className={codeCell(cell)?"course-code":""}>{cell}</span></th>:<td key={j}><span className={codeCell(cell)?"course-code":""}>{cell}</span></td>)}</tr>)}</tbody></table></div>;
}
export function CourseDiagram({visual:v}:{visual:Visual}){
 const mode=new URLSearchParams(location.search).get('mode'),readonly=mode==='audience',print=mode==='print';
 const [s,update]=useDemoState('diagram:'+visualId(v),{focus:0},!readonly,document.documentElement.dataset.courseVersion||'');
 const focus=print?0:Number(s.focus);
 const subject=v as Visual&{modelIndex?:number;subjectView?:string};
 if(subject.modelIndex!==undefined)return <SubjectDiagram index={subject.modelIndex} view={subject.subjectView||'structure'} focus={focus} onFocus={focus=>update({focus})} readonly={readonly} print={print}/>;
 if(v.type==='comparison'||v.type==='matrix')return <div className="course-diagram" data-diagram-layout="table"><DataTable columns={v.columns} rows={v.rows}/></div>;
 if(v.type==='cause')return <div className="course-diagram course-causal" data-diagram-layout="cause"><section><h3>Ошибочное решение</h3><p>{v.cause}</p></section><span className="course-connector" aria-label="приводит к">→</span><section><h3>Последствие</h3><p>{v.effect}</p></section><span className="course-connector" aria-label="устраняется решением">→</span><section><h3>Исправление и проверка</h3><p>{v.solution}</p></section></div>;
 if(v.type==='process'||v.type==='timeline')return <div className="course-diagram" data-diagram-layout="steps"><ol className="course-steps">{v.items.map((item,i)=><li key={i} data-focus={focus===i+1}><span className="course-step-index">{i+1}</span><div><h3>{item.title}</h3><p>{item.text}</p></div></li>)}</ol>{!print&&<div className="course-step-controls"><span role="status">{focus?`Фокус разбора: ${focus} из ${v.items.length}`:'Обзор: все этапы'}</span>{!readonly&&<><button className="button secondary" type="button" onClick={()=>update({focus:0})}>Обзор</button><button className="button secondary" type="button" disabled={focus===0} onClick={()=>update({focus:focus-1})}>Назад по схеме</button><button className="button secondary" type="button" disabled={focus===v.items.length} onClick={()=>update({focus:focus+1})}>Далее по схеме</button></>}</div>}</div>;
 return <p>Представление этого вида схемы не определено.</p>;
}
