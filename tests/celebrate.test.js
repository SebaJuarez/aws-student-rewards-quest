import test from 'node:test';
import assert from 'node:assert/strict';

import {BADGES} from '../src/data/badges.js';
import {REWARD_TIERS} from '../src/data/rewards.js';
import {defaultState} from '../src/domain/store.js';
import {diffAchievements,cloneState} from '../src/domain/celebrate.js';
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

test('diffAchievements: no false positives when state is unchanged',()=>{
  const state=stateWith({
    completed:{'hello-world':true},
    streaks:{signin:aliveStreak(5,TODAY)}
  });
  const cloned=cloneState(state);
  const diff=diffAchievements(state,cloned,TODAY);
  assert.deepEqual(diff.badges,[]);
  assert.deepEqual(diff.tiers,[]);
});

test('diffAchievements: newly completed streak milestone e.g. 7-day reached by logging',()=>{
  const before=stateWith({
    streaks:{signin:aliveStreak(6,addDays(TODAY,-1))}
  });
  const after=stateWith({
    streaks:{signin:aliveStreak(7,TODAY)}
  });

  const diff=diffAchievements(before,after,TODAY);
  assert.equal(diff.badges.length,1);
  assert.equal(diff.badges[0].id,'streak-signin-7');
  assert.equal(diff.badges[0].name,'7-Day Sign-In Streak');
  // 1 badge completed does not reach tier 1 (target 7)
  assert.deepEqual(diff.tiers,[]);
});

test('diffAchievements: override to completed is detected as newly completed badge',()=>{
  const before=defaultState();
  const after=stateWith({
    overrides:{'hello-world':'completed'}
  });

  const diff=diffAchievements(before,after,TODAY);
  assert.equal(diff.badges.length,1);
  assert.equal(diff.badges[0].id,'hello-world');
  assert.equal(diff.badges[0].name,'Hello, World!');
  assert.deepEqual(diff.tiers,[]);
});

test('diffAchievements: tier crossing 6 -> 7 badges',()=>{
  // 6 quick badges completed
  const before=stateWith({
    completed:{
      'knowledge-seeker':true,
      'hello-world':true,
      'photo-finisher':true,
      'discussion-debut':true,
      'first-wish':true,
      'first-article':true
    }
  });

  // 7th badge earned via 7-day signin streak
  const after=stateWith({
    completed:{
      'knowledge-seeker':true,
      'hello-world':true,
      'photo-finisher':true,
      'discussion-debut':true,
      'first-wish':true,
      'first-article':true
    },
    streaks:{signin:aliveStreak(7,TODAY)}
  });

  const diff=diffAchievements(before,after,TODAY);
  assert.equal(diff.badges.length,1);
  assert.equal(diff.badges[0].id,'streak-signin-7');

  assert.equal(diff.tiers.length,1);
  assert.deepEqual(diff.tiers[0],REWARD_TIERS[0]);
  assert.equal(diff.tiers[0][0],7);
  assert.equal(diff.tiers[0][1],'$10 AWS Credits');
});

test('diffAchievements: higher tier crossing (13 -> 14 badges)',()=>{
  const completed={};
  // complete 13 badges
  for(let i=0;i<13;i++){
    completed[BADGES[i].id]='completed';
  }
  const before=stateWith({overrides:completed});

  const afterCompleted={...completed,[BADGES[13].id]:'completed'};
  const after=stateWith({overrides:afterCompleted});

  const diff=diffAchievements(before,after,TODAY);
  assert.equal(diff.badges.length,1);
  assert.equal(diff.badges[0].id,BADGES[13].id);

  assert.equal(diff.tiers.length,1);
  assert.deepEqual(diff.tiers[0],REWARD_TIERS[1]);
  assert.equal(diff.tiers[0][0],14);
});

test('diffAchievements: undo direction (completed -> not) yields nothing',()=>{
  const before=stateWith({
    completed:{
      'knowledge-seeker':true,
      'hello-world':true,
      'photo-finisher':true,
      'discussion-debut':true,
      'first-wish':true,
      'first-article':true
    },
    streaks:{signin:aliveStreak(7,TODAY)}
  });

  // Streak undone back to 6
  const after=stateWith({
    completed:{
      'knowledge-seeker':true,
      'hello-world':true,
      'photo-finisher':true,
      'discussion-debut':true,
      'first-wish':true,
      'first-article':true
    },
    streaks:{signin:aliveStreak(6,addDays(TODAY,-1))}
  });

  const diff=diffAchievements(before,after,TODAY);
  assert.deepEqual(diff.badges,[]);
  assert.deepEqual(diff.tiers,[]);
});

test('diffAchievements: does not report a milestone that was already completed in beforeState',()=>{
  const before=stateWith({
    streaks:{signin:aliveStreak(7,addDays(TODAY,-1))}
  });
  const after=stateWith({
    streaks:{signin:aliveStreak(8,TODAY)}
  });

  const diff=diffAchievements(before,after,TODAY);
  assert.deepEqual(diff.badges,[],'7-day streak was already completed in beforeState');
  assert.deepEqual(diff.tiers,[]);
});

test('diffAchievements: handles null or undefined beforeState gracefully',()=>{
  const after=stateWith({
    overrides:{'hello-world':'completed'}
  });
  const diff=diffAchievements(null,after,TODAY);
  assert.equal(diff.badges.length,1);
  assert.equal(diff.badges[0].id,'hello-world');
});

test('diffAchievements: handles weekly streak milestone (4 weeks)',()=>{
  const before=stateWith({
    weekly:{wishVote:{weeks:['2026-W36','2026-W37','2026-W38'],longest:3}}
  });
  const after=stateWith({
    weekly:{wishVote:{weeks:['2026-W36','2026-W37','2026-W38','2026-W39'],longest:4}}
  });

  const diff=diffAchievements(before,after,TODAY);
  assert.equal(diff.badges.length,1);
  assert.equal(diff.badges[0].id,'weekly-wish-vote');
});

test('diffAchievements: multiple simultaneous badge completions',()=>{
  const before=stateWith({
    streaks:{
      signin:aliveStreak(6,addDays(TODAY,-1)),
      like:aliveStreak(6,addDays(TODAY,-1))
    }
  });
  const after=stateWith({
    streaks:{
      signin:aliveStreak(7,TODAY),
      like:aliveStreak(7,TODAY)
    }
  });

  const diff=diffAchievements(before,after,TODAY);
  assert.equal(diff.badges.length,2);
  assert.deepEqual(diff.badges.map(b=>b.id),['streak-signin-7','streak-like-7']);
});
