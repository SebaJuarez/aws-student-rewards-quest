import test from 'node:test';
import assert from 'node:assert/strict';

import {emptyWeek,maxWeekRun,nextWeek,weekView,weeksFromAnchor} from '../src/domain/activity.js';
import {weekKeyOf} from '../src/domain/dates.js';

function log(week,...days){
  let current=week;
  const results=[];
  for(const day of days){
    const r=nextWeek(current,day);
    current=r.week;
    results.push(r);
  }
  return {week:current,results};
}

test('week keys are stable ISO weeks',()=>{
  assert.equal(weekKeyOf('2026-09-25'),'2026-W39');
  assert.equal(weekKeyOf('2026-09-30'),'2026-W40');
  assert.equal(weekKeyOf('2026-10-07'),'2026-W41');
});

test('logging twice in the same week does not increment',()=>{
  const first=nextWeek(emptyWeek(),'2026-09-25');
  assert.equal(first.logged,true);
  assert.deepEqual(first.week.weeks,['2026-W39']);
  const second=nextWeek(first.week,'2026-09-27');
  assert.equal(second.logged,false);
  assert.equal(second.reason,'duplicate');
  assert.deepEqual(second.week,first.week);
  assert.equal(weekView(second.week,'2026-09-27').current,1);
});

test('consecutive weeks accumulate into a 4-week milestone',()=>{
  const {week}=log(emptyWeek(),'2026-09-25','2026-09-30','2026-10-07','2026-10-14');
  assert.deepEqual(week.weeks,['2026-W39','2026-W40','2026-W41','2026-W42']);
  assert.equal(week.longest,4);
  const view=weekView(week,'2026-10-14');
  assert.equal(view.current,4);
  assert.equal(view.loggedThisWeek,true);
  assert.equal(view.expired,false);
});

test('skipping a week resets the consecutive counter to 1',()=>{
  const {week}=log(emptyWeek(),'2026-09-25','2026-10-07');
  assert.deepEqual(week.weeks,['2026-W39','2026-W41']);
  const view=weekView(week,'2026-10-07');
  assert.equal(view.current,1);
  assert.equal(view.longest,1);
});

test('a skipped week that already passed expires the streak',()=>{
  const {week}=log(emptyWeek(),'2026-09-25');
  const pending=weekView(week,'2026-09-30');
  assert.equal(pending.current,1);
  assert.equal(pending.alive,true);
  assert.equal(pending.loggedThisWeek,false);
  assert.equal(pending.atRisk,true);

  const dead=weekView(week,'2026-10-14');
  assert.equal(dead.current,0);
  assert.equal(dead.alive,false);
  assert.equal(dead.expired,true);
  assert.equal(dead.atRisk,false);
  assert.equal(dead.longest,1);
});

test('longest is preserved across runs and never below the current run',()=>{
  const {week}=log(emptyWeek(),'2026-09-25','2026-09-30','2026-10-14');
  const view=weekView(week,'2026-10-14');
  assert.equal(view.current,1);
  assert.equal(view.longest,2);
  assert.equal(maxWeekRun(['2026-W39','2026-W40','2026-W42']),2);
  assert.equal(maxWeekRun(['2026-W39','2026-W41','2026-W42','2026-W43']),3);
  assert.equal(maxWeekRun([]),0);
});

test('recorded weeks are unique and sorted',()=>{
  const {week,results}=log(emptyWeek(),'2026-09-30','2026-09-25','2026-09-26');
  assert.deepEqual(week.weeks,['2026-W39','2026-W40']);
  assert.equal(results[1].logged,true,'a past week that was never recorded can still be recorded');
  assert.equal(results[2].logged,false,'the same week twice is always a duplicate');
});

test('weeksFromAnchor reconstructs a contiguous run of weeks',()=>{
  assert.deepEqual(weeksFromAnchor('2026-W40',3),['2026-W38','2026-W39','2026-W40']);
  assert.deepEqual(weeksFromAnchor('2026-W01',2),['2025-W52','2026-W01']);
  assert.deepEqual(weeksFromAnchor('2026-W40',0),[]);
  assert.deepEqual(weeksFromAnchor('nope',2),[]);
});

test('weekView tolerates missing or malformed input',()=>{
  const empty=weekView(null,'2026-09-25');
  assert.equal(empty.current,0);
  assert.equal(empty.weeks.length,0);
  const junk=weekView({weeks:['banana',42],'longest':'x'},'2026-09-25');
  assert.deepEqual(junk.weeks,[]);
  assert.equal(junk.current,0);
});
