import test from 'node:test';
import assert from 'node:assert/strict';

import {BADGES} from '../src/data/badges.js';
import {defaultState} from '../src/domain/store.js';
import {completedCount,statusOf} from '../src/domain/status.js';
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
