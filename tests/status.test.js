import test from 'node:test';
import assert from 'node:assert/strict';

import {BADGES} from '../src/data/badges.js';
import {defaultState} from '../src/domain/store.js';
import {completedCount,isLocked,progressOf,statusOf} from '../src/domain/status.js';
import {addDays} from '../src/domain/dates.js';

const TODAY='2026-09-25';

function badge(id){
  const b=BADGES.find(x=>x.id===id);
  assert.ok(b,`unknown badge ${id}`);
  return b;
}

function stateWith(parts={}){
  const s=defaultState();
  if(parts.completed!==undefined)s.completed=parts.completed;
  if(parts.overrides!==undefined)s.overrides=parts.overrides;
  if(parts.streaks)s.streaks={...s.streaks,...parts.streaks};
  if(parts.weekly)s.weekly={...s.weekly,...parts.weekly};
  return s;
}

function aliveStreak(current,today=TODAY){
  return {current,longest:current,startedAt:addDays(today,-(current-1)),last:today};
}

function lapsedStreak(longest){
  return {current:0,longest,startedAt:null,last:'2026-01-05'};
}

test('streak badges are milestones off the current run, not per-badge counters',()=>{
  const seven=stateWith({completed:{},streaks:{signin:aliveStreak(7)}});
  assert.equal(statusOf(badge('streak-signin-7'),seven,TODAY),'completed');
  assert.equal(statusOf(badge('streak-signin-30'),seven,TODAY),'active');
  assert.equal(statusOf(badge('streak-signin-90'),seven,TODAY),'active');

  const thirty=stateWith({completed:{},streaks:{signin:aliveStreak(30)}});
  assert.equal(statusOf(badge('streak-signin-7'),thirty,TODAY),'completed');
  assert.equal(statusOf(badge('streak-signin-30'),thirty,TODAY),'completed');
  assert.equal(statusOf(badge('streak-signin-90'),thirty,TODAY),'active');

  const ninety=stateWith({completed:{},streaks:{signin:aliveStreak(90)}});
  assert.equal(statusOf(badge('streak-signin-90'),ninety,TODAY),'completed');
  assert.equal(completedCount(ninety,TODAY),3,'one 90-day run unlocks the 7 / 30 / 90 milestones of that family only');
});

test('a streak just below the milestone is active, not completed',()=>{
  const s=stateWith({completed:{},streaks:{like:aliveStreak(6)}});
  assert.equal(statusOf(badge('streak-like-7'),s,TODAY),'active');
  const s29=stateWith({completed:{},streaks:{comment:aliveStreak(29)}});
  assert.equal(statusOf(badge('streak-comment-30'),s29,TODAY),'active');
});

test('a lapsed streak does not keep a milestone alive',()=>{
  const s=stateWith({completed:{},streaks:{signin:lapsedStreak(12)}});
  assert.equal(statusOf(badge('streak-signin-7'),s,TODAY),'not_started');
  assert.equal(statusOf(badge('streak-signin-30'),s,TODAY),'not_started');
  assert.equal(statusOf(badge('streak-signin-90'),s,TODAY),'not_started');
});

test('weekly badges derive from consecutive weeks',()=>{
  const three=stateWith({completed:{},weekly:{wishVote:{weeks:['2026-W37','2026-W38','2026-W39'],longest:3}}});
  assert.equal(statusOf(badge('weekly-wish-vote'),three,TODAY),'active');
  const four=stateWith({completed:{},weekly:{wishVote:{weeks:['2026-W36','2026-W37','2026-W38','2026-W39'],longest:4}}});
  assert.equal(statusOf(badge('weekly-wish-vote'),four,TODAY),'completed');
  const none=stateWith({completed:{},weekly:{articlePublish:{weeks:[],longest:0}}});
  assert.equal(statusOf(badge('weekly-article'),none,TODAY),'not_started');
});

test('manual overrides always win',()=>{
  const s=stateWith({completed:{},overrides:{'streak-signin-7':'completed'},streaks:{signin:lapsedStreak(0)}});
  assert.equal(statusOf(badge('streak-signin-7'),s,TODAY),'completed');
  const s2=stateWith({completed:{'hello-world':true},overrides:{'hello-world':'not_started'}});
  assert.equal(statusOf(badge('hello-world'),s2,TODAY),'not_started');
  const s3=stateWith({completed:{},overrides:{'first-wish':'active'}});
  assert.equal(statusOf(badge('first-wish'),s3,TODAY),'active');
});

test('an unknown override value is ignored instead of leaking into the UI',()=>{
  const s=stateWith({completed:{'hello-world':true},overrides:{'hello-world':'destroyed'}});
  assert.equal(statusOf(badge('hello-world'),s,TODAY),'completed');
});

test('quick and community badges read only the completed map',()=>{
  const s=stateWith({completed:{'knowledge-seeker':true,'conversation-starter':true}});
  assert.equal(statusOf(badge('knowledge-seeker'),s,TODAY),'completed');
  assert.equal(statusOf(badge('photo-finisher'),s,TODAY),'not_started');
  assert.equal(statusOf(badge('conversation-starter'),s,TODAY),'completed');
  assert.equal(statusOf(badge('meaningful-contributor'),s,TODAY),'not_started');
});

test('completedCount matches statusOf across every badge',()=>{
  const s=stateWith({
    completed:{'hello-world':true,'photo-finisher':true},
    overrides:{'first-wish':'completed'},
    streaks:{signin:aliveStreak(7)},
    weekly:{wishVote:{weeks:['2026-W36','2026-W37','2026-W38','2026-W39'],longest:4}}
  });
  const expected=BADGES.filter(b=>statusOf(b,s,TODAY)==='completed').length;
  assert.equal(completedCount(s,TODAY),expected);
  assert.equal(expected,5);
});

test('statusOf never returns undefined for any badge shape',()=>{
  const s=stateWith({completed:{}});
  BADGES.forEach(b=>{
    const st=statusOf(b,s,TODAY);
    assert.ok(['not_started','active','completed'].includes(st),`${b.id} -> ${st}`);
  });
});

test('progressOf renders a dense-list label per badge type',()=>{
  const s=stateWith({
    completed:{'hello-world':true},
    streaks:{signin:aliveStreak(14),like:lapsedStreak(9)},
    weekly:{wishVote:{weeks:['2026-W37','2026-W38'],longest:2}}
  });
  assert.equal(progressOf(badge('streak-signin-30'),s,TODAY),'14/30d');
  assert.equal(progressOf(badge('streak-signin-7'),s,TODAY),'7/7d','capped at the badge milestone, the run itself is longer');
  assert.equal(progressOf(badge('streak-like-30'),s,TODAY),'0/30d','a lapsed run reads 0, not the stored counter');
  assert.equal(progressOf(badge('weekly-wish-vote'),s,TODAY),'2/4w');
  assert.equal(progressOf(badge('hello-world'),s,TODAY),'1/1');
  assert.equal(progressOf(badge('first-wish'),s,TODAY),'0/1');
  assert.equal(progressOf(badge('conversation-starter'),s,TODAY),'0/1');
  assert.equal(progressOf(badge('first-wish'),null,TODAY),'0/1','a missing state must not throw');
});

test('isLocked only gates later streak milestones behind smaller unearned ones',()=>{
  const fresh=stateWith({completed:{}});
  assert.equal(isLocked(badge('streak-signin-7'),fresh,TODAY),false,'the first milestone of a family is never locked');
  assert.equal(isLocked(badge('streak-signin-30'),fresh,TODAY),true);
  assert.equal(isLocked(badge('streak-signin-90'),fresh,TODAY),true);
  assert.equal(isLocked(badge('streak-like-90'),fresh,TODAY),true);

  const sevenDone=stateWith({completed:{},overrides:{'streak-signin-7':'completed'}});
  assert.equal(isLocked(badge('streak-signin-30'),sevenDone,TODAY),false,'earned 7-day unlocks the 30-day milestone');
  assert.equal(isLocked(badge('streak-signin-90'),sevenDone,TODAY),true,'the 30-day step still gates the 90-day one');

  const lapsed=stateWith({completed:{},streaks:{signin:lapsedStreak(12)}});
  assert.equal(isLocked(badge('streak-signin-30'),lapsed,TODAY),true,'a dead run still gates the 30-day until the 7-day is earned');
  assert.equal(isLocked(badge('streak-signin-7'),lapsed,TODAY),false);
  const running=stateWith({completed:{},streaks:{signin:aliveStreak(4)}});
  assert.equal(isLocked(badge('streak-signin-30'),running,TODAY),false,'a live run makes the milestone active, not locked');
  const active=stateWith({completed:{},streaks:{signin:aliveStreak(7)}});
  assert.equal(isLocked(badge('streak-signin-30'),active,TODAY),false,'an active milestone is not locked');

  const oneTime=stateWith({completed:{}});
  BADGES.filter(b=>b.type!=='streak').forEach(b=>{
    assert.equal(isLocked(b,oneTime,TODAY),false,`${b.id} is a one-time or weekly badge - never locked`);
  });
});
