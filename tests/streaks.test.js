import test from 'node:test';
import assert from 'node:assert/strict';

import {emptyStreak,nextStreak,streakView} from '../src/domain/activity.js';
import {addDays} from '../src/domain/dates.js';

function log(streak,...days){
  let current=streak;
  const results=[];
  for(const day of days){
    const r=nextStreak(current,day);
    current=r.streak;
    results.push(r);
  }
  return {streak:current,results};
}

test('a consecutive run increments by exactly one per day',()=>{
  const {streak}=log(emptyStreak(),'2026-09-25','2026-09-26','2026-09-27','2026-09-28');
  assert.equal(streak.current,4);
  assert.equal(streak.longest,4);
  assert.equal(streak.last,'2026-09-28');
  assert.equal(streak.startedAt,'2026-09-25');
});

test('a missing day restarts the run at 1 and keeps longest',()=>{
  const {streak}=log(emptyStreak(),'2026-09-25','2026-09-26','2026-09-27','2026-09-28','2026-09-30');
  assert.equal(streak.current,1);
  assert.equal(streak.startedAt,'2026-09-30');
  assert.equal(streak.last,'2026-09-30');
  assert.equal(streak.longest,4);
});

test('logging the same day twice is idempotent',()=>{
  const first=nextStreak(emptyStreak(),'2026-09-25');
  assert.equal(first.logged,true);
  assert.equal(first.streak.current,1);
  const second=nextStreak(first.streak,'2026-09-25');
  assert.equal(second.logged,false);
  assert.equal(second.reason,'duplicate');
  assert.deepEqual(second.streak,first.streak);
  const third=nextStreak(second.streak,'2026-09-25');
  assert.equal(third.streak.current,1);
});

test('logging a date before the last log is refused',()=>{
  const {streak}=log(emptyStreak(),'2026-09-25','2026-09-26');
  const outOfOrder=nextStreak(streak,'2026-09-24');
  assert.equal(outOfOrder.logged,false);
  assert.equal(outOfOrder.reason,'out_of_order');
  assert.equal(outOfOrder.streak.current,2);
});

test('a long run then a gap keeps longest and restarts at 1',()=>{
  const days=[];
  for(let i=0;i<10;i++)days.push(addDays('2026-06-01',i));
  const {streak}=log(emptyStreak(),...days);
  assert.equal(streak.current,10);
  const restarted=nextStreak(streak,'2026-06-20');
  assert.equal(restarted.streak.current,1);
  assert.equal(restarted.streak.longest,10);
});

test('streakView exposes alive / at-risk / expired / logged-today',()=>{
  const logged=streakView({current:3,longest:3,startedAt:'2026-09-25',last:'2026-09-27'},'2026-09-27');
  assert.equal(logged.current,3);
  assert.equal(logged.loggedToday,true);
  assert.equal(logged.atRisk,false);
  assert.equal(logged.expired,false);
  assert.equal(logged.alive,true);

  const pending=streakView({current:3,longest:3,startedAt:'2026-09-25',last:'2026-09-27'},'2026-09-28');
  assert.equal(pending.current,3);
  assert.equal(pending.loggedToday,false);
  assert.equal(pending.atRisk,true);
  assert.equal(pending.expired,false);

  const dead=streakView({current:3,longest:9,startedAt:'2026-09-25',last:'2026-09-27'},'2026-09-30');
  assert.equal(dead.current,0);
  assert.equal(dead.longest,9);
  assert.equal(dead.alive,false);
  assert.equal(dead.expired,true);
  assert.equal(dead.atRisk,false);
  assert.equal(dead.startedAt,null);
});

test('streakView never reports a stale counter from a lapsed run',()=>{
  const stale=streakView({current:30,longest:30,startedAt:'2026-06-01',last:'2026-06-30'},'2026-09-25');
  assert.equal(stale.current,0);
  assert.equal(stale.longest,30);
});

test('streakView tolerates missing or malformed input',()=>{
  const empty=streakView(null,'2026-09-25');
  assert.equal(empty.current,0);
  assert.equal(empty.alive,false);
  const junk=streakView({current:'x',last:'nope'},'2026-09-25');
  assert.equal(junk.current,0);
  assert.equal(junk.last,null);
});

test('logging tomorrow after an expired run starts a fresh run of 1',()=>{
  const old=nextStreak({current:7,longest:7,startedAt:'2026-09-01',last:'2026-09-07'},'2026-09-20');
  assert.equal(old.logged,true);
  assert.equal(old.streak.current,1);
  assert.equal(old.streak.startedAt,'2026-09-20');
  assert.equal(old.streak.longest,7);
});
