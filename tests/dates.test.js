import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

import {
  addDays,addWeeks,daysBetween,formatDate,isWeekKey,isValidDateStr,
  normWeekKey,parseLocalDate,todayStr,weekDiff,weekKeyOf
} from '../src/domain/dates.js';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const pad=(n)=>String(n).padStart(2,'0');

test('todayStr returns the local calendar date, not the UTC one',()=>{
  const d=new Date();
  const local=`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  assert.equal(todayStr(),local);
  assert.match(todayStr(),/^\d{4}-\d{2}-\d{2}$/);
});

test('parseLocalDate lands on local midnight instead of UTC midnight',()=>{
  const d=parseLocalDate('2026-01-01');
  assert.ok(d);
  assert.equal(d.getHours(),0);
  assert.equal(d.getMinutes(),0);
  assert.equal(d.getDate(),1);
  assert.equal(d.getMonth(),0);
  assert.equal(d.getFullYear(),2026);
});

test('parseLocalDate rejects malformed and impossible dates',()=>{
  assert.equal(parseLocalDate('banana'),null);
  assert.equal(parseLocalDate('2026-1-1'),null);
  assert.equal(parseLocalDate('2026-02-30'),null);
  assert.equal(parseLocalDate('2026-13-01'),null);
  assert.equal(parseLocalDate(''),null);
  assert.equal(parseLocalDate(null),null);
  assert.equal(isValidDateStr('2026-09-25'),true);
  assert.equal(isValidDateStr('2026-09-31'),false);
});

test('addDays crosses month, year and leap boundaries',()=>{
  assert.equal(addDays('2026-09-28',1),'2026-09-29');
  assert.equal(addDays('2026-09-30',1),'2026-10-01');
  assert.equal(addDays('2026-12-31',1),'2027-01-01');
  assert.equal(addDays('2026-01-01',-1),'2025-12-31');
  assert.equal(addDays('2028-02-28',1),'2028-02-29');
  assert.equal(addDays('2027-02-28',1),'2027-03-01');
  assert.equal(addDays('2026-09-25',0),'2026-09-25');
  assert.equal(addDays('nope',1),null);
});

test('addDays is a pure calendar operation (DST cannot shift the date)',()=>{
  assert.equal(daysBetween(addDays('2026-03-06',1),'2026-03-07'),0);
  assert.equal(daysBetween('2026-03-06','2026-03-07'),1);
  assert.equal(daysBetween('2026-11-01','2026-11-02'),1);
});

test('daysBetween counts whole calendar days',()=>{
  assert.equal(daysBetween('2026-09-25','2026-09-25'),0);
  assert.equal(daysBetween('2026-09-25','2026-09-26'),1);
  assert.equal(daysBetween('2026-09-25','2026-09-30'),5);
  assert.equal(daysBetween('2026-09-30','2026-09-25'),-5);
  assert.equal(daysBetween('2025-12-31','2026-01-01'),1);
  assert.equal(daysBetween('2026-01-01','2026-12-31'),364);
  assert.equal(daysBetween('garbage','2026-01-01'),null);
});

test('formatDate never drifts to the previous or next day',()=>{
  assert.equal(formatDate('2026-01-01'),'Jan 1');
  assert.equal(formatDate('2026-12-31'),'Dec 31');
  assert.equal(formatDate('2026-09-25'),'Sep 25');
  assert.equal(formatDate('nonsense'),'');
});

test('weekKeyOf uses ISO-8601 weeks (Mon–Sun, week 1 = week with Jan 4)',()=>{
  assert.equal(weekKeyOf('2026-09-25'),'2026-W39');
  assert.equal(weekKeyOf('2026-09-27'),'2026-W39');
  assert.equal(weekKeyOf('2026-09-28'),'2026-W40');
  assert.equal(weekKeyOf('2026-01-01'),'2026-W01');
  assert.equal(weekKeyOf('2025-12-29'),'2026-W01');
  assert.equal(weekKeyOf('2025-12-28'),'2025-W52');
  assert.equal(weekKeyOf('garbage'),null);
});

test('normWeekKey pads, validates and rejects impossible week numbers',()=>{
  assert.equal(normWeekKey('2026-W39'),'2026-W39');
  assert.equal(normWeekKey('2026-W3'),'2026-W03');
  assert.equal(normWeekKey('2026-W03'),'2026-W03');
  assert.equal(normWeekKey('2026-W53'),'2026-W53');
  assert.equal(normWeekKey('2025-W53'),null);
  assert.equal(normWeekKey('2026-09-25'),null);
  assert.equal(normWeekKey('garbage'),null);
  assert.equal(isWeekKey('2026-W39'),true);
  assert.equal(isWeekKey('2026-09-25'),false);
});

test('addWeeks and weekDiff work across year boundaries',()=>{
  assert.equal(addWeeks('2026-W39',1),'2026-W40');
  assert.equal(addWeeks('2026-W39',-1),'2026-W38');
  assert.equal(addWeeks('2026-W01',-1),'2025-W52');
  assert.equal(addWeeks('2025-W52',1),'2026-W01');
  assert.equal(addWeeks('2026-W53',1),'2027-W01');
  assert.equal(weekDiff('2026-W39','2026-W39'),0);
  assert.equal(weekDiff('2026-W39','2026-W40'),1);
  assert.equal(weekDiff('2026-W39','2026-W41'),2);
  assert.equal(weekDiff('2026-W40','2026-W39'),-1);
  assert.equal(weekDiff('2026-W01','2026-W01'),0);
});

test('timezone: helpers behave the same under a non-UTC zone',(t)=>{
  const DATES_URL=pathToFileURL(path.join(ROOT,'src','domain','dates.js')).href;
  const child=spawnSync(process.execPath,['--input-type=module','-e',`
const mod=await import(${JSON.stringify(DATES_URL)});
const d=new Date();
const local=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
console.log(JSON.stringify({
  offset:d.getTimezoneOffset(),
  today:mod.todayStr(),
  local,
  midnight:mod.parseLocalDate('2026-01-01').getHours(),
  added:mod.addDays('2026-12-31',1),
  fmt:mod.formatDate('2026-01-01')
}));
`],{cwd:ROOT,env:{...process.env,TZ:'Pacific/Kiritimati'},encoding:'utf8',timeout:20000});

  if(child.status!==0){
    t.skip('child process could not run the timezone check');
    return;
  }
  const out=JSON.parse(child.stdout.trim());
  if(out.offset!==-840){
    t.skip('this runtime ignores the TZ environment variable');
    return;
  }
  assert.equal(out.today,out.local,'todayStr must use the browser/local date, not UTC');
  assert.equal(out.midnight,0,'parseLocalDate must produce local midnight, not UTC midnight');
  assert.equal(out.added,'2027-01-01');
  assert.equal(out.fmt,'Jan 1');
});
