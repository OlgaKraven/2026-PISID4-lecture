import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):path.join(dir,e.name));}
const paths=['public/course.json','public/assessment.json','public/teacher-pack.json','public/practice-cases.json','authoring/questions.json','reports/registry.json','reports/migration-map.json',...files('docs/teaching')];
const before=new Map(paths.map(p=>[p,fs.readFileSync(p)]));
execFileSync(process.execPath,['scripts/generate-content.mjs'],{stdio:'inherit'});
execFileSync(process.execPath,['scripts/export-teaching.mjs'],{stdio:'inherit'});
for(const [p,bytes]of before)assert.ok(bytes.equals(fs.readFileSync(p)),'Generated output changed: '+p);
console.log(`Generation reproducible: ${paths.length} outputs, exact bytes`);
