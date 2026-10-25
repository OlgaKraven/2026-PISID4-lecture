import {createRoot} from 'react-dom/client';
import {LectureSite,validateCourse} from '@olgakraven/lecture-engine';
import '@olgakraven/lecture-engine/style.css';
import {loadStartupNotes} from './startup-notes';
import {installPresentation} from './presentation';
import {SlideNavigation} from './navigation';
import {PublicViewport} from './public-viewport';
import {StandaloneCase} from './case-workshop';
import './lecture.css';
import './presentation-design.css';
import './infographic-theme.css';
const root=createRoot(document.getElementById('root')!);
async function load(){
 root.render(<p role="status">Загружаем курс…</p>);
 try{
  const r=await fetch(import.meta.env.BASE_URL+'course.json',{signal:AbortSignal.timeout(15000),cache:'no-store'});
  if(!r.ok)throw Error('Не удалось загрузить курс: '+r.status);
  const c=await r.json();validateCourse(c);document.documentElement.dataset.courseVersion=c.contentVersion;
  const caseId=new URLSearchParams(location.search).get('case');
  if(caseId){root.render(<StandaloneCase id={caseId} version={c.contentVersion}/>);return;}
  await loadStartupNotes(c,import.meta.env.BASE_URL);installPresentation(c,import.meta.env.BASE_URL);
  root.render(<><LectureSite course={c} base={import.meta.env.BASE_URL}/><SlideNavigation/><PublicViewport version={c.contentVersion}/></>);
 }catch(e){root.render(<main><h1>Курс не загрузился</h1><p role="alert">{String(e)}</p><button onClick={()=>void load()}>Загрузить курс снова</button></main>);}
}
void load();
