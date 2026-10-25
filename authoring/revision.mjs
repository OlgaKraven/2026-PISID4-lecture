import fs from 'node:fs';
import units from './units.mjs';
import {makePractice} from './practice.mjs';
const definitions = [
 'Инвентаризация пакета — составление реестра полученных источников с указанием их типа, версии, даты и владельца.',
 'Брифинг — краткий исходный документ о целях, участниках, процессах и ограничениях проекта; его сведения уточняют до проверяемых требований.',
 'Профилирование выгрузки — исследование состава, заполненности, повторов и допустимых значений данных для выявления структуры и проблем качества.',
 'Сущность-кандидат — предполагаемый тип объектов предметной области с собственной идентичностью и значимыми для системы свойствами или связями.',
 'Бизнес-правило — утверждение, определяющее допустимое состояние или действие в предметной области независимо от формы интерфейса.',
 'Допущение — явно зафиксированная гипотеза, временно используемая вместо неподтверждённого факта; у неё указывают риск и способ проверки.',
 'Открытый вопрос — адресованный уполномоченному участнику запрос о недостающем сведении, от которого зависит проектное решение.',
 'Регламент времени — заданное распределение доступного времени между обязательными действиями и контрольными точками результата.',
 'Сущность — тип различимых объектов предметной области, о которых система хранит факты; граница сущности определяет состав этих фактов.',
 'Первичный ключ (PK) — выбранный кандидатный ключ таблицы: минимальный набор атрибутов, однозначно идентифицирующий строку; значения PK не допускают NULL.',
 'Внешний ключ (FK) — набор атрибутов, чьи непустые значения должны соответствовать допустимому уникальному ключу связанной таблицы по правилам СУБД.',
 'Первая нормальная форма (1НФ) — форма отношения, в которой каждый атрибут кортежа содержит одно значение своего домена, без повторяющихся групп.',
 'Вторая нормальная форма (2НФ) — 1НФ, в которой каждый неключевой атрибут полностью функционально зависит от каждого кандидатного ключа.',
 'Третья нормальная форма (3НФ) — форма отношения, в которой для каждой нетривиальной зависимости X → A либо X является суперключом, либо A входит в некоторый кандидатный ключ.',
 'Связь M:N — отношение, при котором каждому объекту любой из двух сторон может соответствовать несколько объектов другой стороны.',
 'Ссылочная целостность — согласованность ссылок между таблицами, поддерживаемая внешними ключами и выбранными правилами изменения и удаления.',
 'Цель сценария — рабочий результат, который участник должен получить при выполнении последовательности действий.',
 'Предусловие — состояние данных, полномочий и окружения, которое должно выполняться до начала сценария.',
 'Состав формы — набор полей, действий и сообщений, необходимых для выполнения конкретной пользовательской задачи.',
 'Поведение поля — правила ввода, доступности и реакции элемента формы при изменении значения и состояния сценария.',
 'Клиентская валидация — проверка введённых данных на устройстве пользователя до или во время отправки; серверная проверка выполняется независимо.',
 'Сообщение об ошибке — объяснение возникшей проблемы, её места и доступного пользователю способа продолжения.',
 'Состояние экрана — согласованное представление данных и доступных действий на определённом этапе сценария.',
 'Спецификация интерфейса — описание состава, состояний, данных, правил и критериев проверки интерфейса для его реализации.',
 'Матрица прав — таблица разрешённых операций ролей над объектами с указанием области действия этих разрешений.',
 'Серверная авторизация — проверка на сервере права установленного пользователя выполнить конкретную операцию над конкретным объектом.',
 'Экран входа — интерфейс предъявления учётных данных и получения результата аутентификации с безопасным сообщением об отказе.',
 'Неуспешная попытка входа — событие отказа в аутентификации, учитываемое сервером по заданной политике ограничения и журналирования.',
 'Блокировка входа — ограничение дальнейшей аутентификации аккаунта или потока запросов по заданным условиям и процедуре восстановления.',
 'Создание пользователя — операция регистрации учётной записи с проверкой обязательных данных, уникальности идентификатора и назначаемых полномочий.',
 'Снятие блокировки — разрешённое административное изменение ограничения входа с фиксацией основания и результата.',
 'Проверка человека — дополнительная проверка, предназначенная для затруднения автоматизированного злоупотребления; она не заменяет проверку пароля и прав.',
 'Актуальность нормативной ссылки — подтверждённое соответствие обозначения, редакции, статуса и области применения документа поставленной задаче.',
 'Назначение документа — определённая задача читателя, для решения которой подготовлен документ.',
 'Функциональное назначение — описание результата функции, её участников, границ и условий применения.',
 'Метод API — доступная через согласованный интерфейс операция с определёнными входами, результатами, ошибками и ограничениями вызова.',
 'Параметр API — именованное входное значение операции с заданным смыслом, типом, обязательностью и ограничениями.',
 'Экранная форма — представление пользовательской задачи через поля, действия и сообщения, поведение которых определено спецификацией.',
 'Техническое задание — документ требований к создаваемой системе; проектная документация описывает принятые способы их реализации.',
 'Экзаменационный комплект — набор результатов, передаваемых по условиям задания и согласованных между собой по содержанию и формату.',
];
const firstSentence = text => text.match(/^.*?[.!?](?:\s|$)/)?.[0].trim() || text;
export function refineCourse(course, teacher, questions, registry) {
 const old=JSON.parse(fs.readFileSync('authoring/source-course.json','utf8'));
 const baseline=JSON.parse(fs.readFileSync('authoring/baseline-note-hashes.json','utf8'));
 const practices=makePractice(course.lectures,units);
 for(const [li,lecture] of course.lectures.entries()){
  for(const [si,slide] of lecture.slides.entries()){
   const conceptNumber=Number(slide.id.match(/-c(\d+)-/)?.[1]||0);
   const questionNumber=Number(slide.id.match(/-Q0?(\d)(?:-|$)/)?.[1]||Math.ceil(conceptNumber/2));
   const unit=questionNumber?units[li*4+questionNumber-1]:null;
   const concept=conceptNumber?old.topics[li].concepts[conceptNumber-1]:null;
   if(concept){
    const definition=definitions[li*8+conceptNumber-1];
    if(slide.id.endsWith('-definition'))slide.body=definition;
    if(slide.id.endsWith('-notebook')){
     slide.notebook=definition;
     slide.body='Проверка применения: '+concept.check+'.';
    }
    for(const g of course.glossary)if(g.slideIds.includes(lecture.id+`-c${conceptNumber}-definition`))g.definition=definition;
   }
   if(slide.id.endsWith('-entry'))slide.bullets=['Различаем исходный факт, допущение и проектное решение.','Проверяем решение по успешному и отрицательному случаю.','Связываем данные, правила, интерфейс и результат проверки.'];
   if(slide.kind==='section'&&unit)slide.body=unit.input;
   const note=teacher.notes[slide.id];if(!note)continue;
   note.notebook=slide.notebook||'';
   if(slide.task){
    note.script=`Вопрос «${unit.title}». ${slide.task.prompt} Сначала выполните задание самостоятельно. После проверки объясните, какое различие понятий определило ответ; одной выбранной позиции недостаточно для обсуждения.`;
    continue;
   }
   if(!unit)continue;
   const detail=unit.detail[(conceptNumber-1)%2]||unit.detail[0];
   if(slide.id.endsWith('-definition'))note.script=`${slide.body} ${detail} Сопоставьте определение с исходным условием: ${unit.input} ${unit.qa[0][0]}`;
   else if(slide.id.endsWith('-mechanism'))note.script=`${unit.input} ${slide.visual.items.map(x=>`${x.title}. ${x.text}`).join(' ')} Здесь показаны два этапа текущего решения. Объясните, какое исходное сведение позволяет перейти от первого ко второму.`;
   else if(slide.id.endsWith('-case'))note.script=`${slide.body} ${concept.decision}. Проверим результат: ${concept.check}. ${firstSentence(detail)} ${unit.qa[(conceptNumber-1)%2][0]}`;
   else if(slide.id.endsWith('-decision'))note.script=`Сравним два решения на одном критерии. ${concept.decision} позволяет проверить: ${concept.check}. Если ${concept.pitfall.toLocaleLowerCase('ru')}, эта проверка не подтверждается. Покажите, какой факт из условия отличает строки таблицы; красивое оформление само по себе не исправляет ошибку.`;
   else if(slide.id.endsWith('-mistake'))note.script=`Ошибка здесь — ${concept.pitfall.toLocaleLowerCase('ru')}. Последствие: ${slide.visual.effect} Исправление: ${concept.decision}. Проверьте исправленный вариант по критерию: ${concept.check}. ${unit.qa[(conceptNumber-1)%2][0]}`;
   else if(slide.id.endsWith('-notebook'))note.script=`Запишите определение: ${slide.notebook} Отдельно проверим его применение: ${concept.check}. Не включайте критерий в само определение: определение объясняет смысл, проверка связывает его с текущим примером.`;
   else if(slide.id.endsWith('-worked'))note.script=`${unit.input} ${unit.steps.map(([label,text])=>`${label}. ${text}`).join(' ')} ${unit.result} ${unit.qa[1][0]}`;
   else if(slide.kind==='section')note.script=`${unit.title}. ${unit.input} Начнём с того, какие сведения подтверждены и какой результат требуется. После объяснения и разобранного примера будет самостоятельный случай с другими данными.`;
   else if(slide.id.endsWith('-terms'))note.script=unit.terms.map(([term,definition])=>`${term} — ${definition}.`).join(' ')+` Эти значения различаются по функции. ${unit.qa[0][0]} После ответа свяжем их в полном разборе.`;
   note.questions=unit.qa.map(([q])=>q).join('\n');
   note.answer=unit.qa.map(([q,a])=>`${q}\n${a}`).join('\n\n');
  }
  // The concept schema shows relationships, not a token executing a process.
  if(li===1){
   const s=lecture.slides.find(s=>s.id.endsWith('-Q01-worked'));
   s.visual={type:'comparison',columns:['Таблица','Первичный ключ','Связь'],rows:[['service_request','request_id=17','Одна заявка'],['visit','visit_id=81','request_id=17 → service_request'],['visit','visit_id=82','request_id=17 → service_request']],caption:'Одна заявка — два отдельных визита (1:N); request_id во visit является внешним ключом.'};
   const normalization=lecture.slides.find(s=>s.id.endsWith('-Q03-worked'));
   normalization.visual={type:'comparison',columns:['Зависимость','Результат разложения'],rows:[['part_id → part_name','spare_part(part_id PK, part_name)'],['(visit_id,part_id) → quantity','visit_part(visit_id FK,part_id FK,quantity); PK — пара'],['client_id → current_client_address','client(client_id PK,current_client_address)']],caption:'Условия примера: указанные зависимости и ключи подтверждены. Снимок адреса визита описывает другой факт.'};
  }
  for(const practice of practices.filter(p=>p.lectureId===lecture.id)){
   const qi=Number(practice.id.match(/Q(\d+)/)[1]),position=lecture.slides.findIndex(s=>s.id===`${lecture.id}-Q0${qi}-T01`);
   const slide={id:practice.returnSlide,kind:'example',title:practice.title,kicker:`Вопрос ${qi} · Самостоятельный случай`};
   lecture.slides.splice(position,0,slide);
   const q=questions.find(q=>q.lectureId===lecture.id&&q.questionId.endsWith(`Q0${qi}`));
   q.slideIds.splice(q.slideIds.indexOf(`${lecture.id}-Q0${qi}-T01`),0,slide.id);q.evidence.push(slide.id);
   teacher.notes[slide.id]={script:`${practice.input} Нажмите «Разбор задачи». Откроется модальное окно; в режиме показа его состояние видит аудитория. Запишите прогноз, затем заполните ${practice.fields.map(f=>f.label.toLocaleLowerCase('ru')).join(' и ')}. Следуйте отдельной операции каждого шага. Обоснование обсуждаем отдельно. После разбора нажмите «Вернуться к слайду» и продолжите самопроверку.`,preparation:'Откройте модальное окно задачи и проверьте его отображение у аудитории. Данные условные; решение не показывать до попытки.',notebook:'',questions:'Какие данные определяют каждый шаг? При каком изменении условия результат будет другим?',answer:practice.fields.map((f,i)=>`Шаг ${i+1}. ${f.instruction} В поле «${f.label}» введите ${f.answer} и нажмите «Проверить шаг ${i+1}». Ожидаемое сообщение: ${f.success} ${f.hint}`).join('\n')+`\n${practice.explanation}\nИзменённое условие: ${practice.change.input}. ${practice.change.result}\nГраница: ${practice.boundary}`,estimatedSeconds:240};
  }
  registry[li].slides=lecture.slides.length;
  registry[li].estimatedMinutes=Math.round(lecture.slides.reduce((sum,s)=>sum+teacher.notes[s.id].estimatedSeconds,0)/60);
 }
 teacher.noteMigrations=JSON.parse(fs.readFileSync('authoring/note-migrations.json','utf8'));
 teacher.previousContentVersion=baseline.contentVersion;
 teacher.previousNoteHashes=baseline.notes;
 fs.writeFileSync('public/practice-cases.json',JSON.stringify(practices,null,2)+'\n');
}
