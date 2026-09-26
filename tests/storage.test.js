import test from 'node:test';
import assert from 'node:assert/strict';

import {addDays,todayStr} from '../src/domain/dates.js';

function fakeStorage(){
  const map=new Map();
  return {
    getItem:(k)=>(map.has(k)?map.get(k):null),
    setItem:(k,v)=>{map.set(k,String(v))},
    removeItem:(k)=>{map.delete(k)},
    clear:()=>{map.clear()},
    key:(i)=>([...map.keys()][i]??null),
    get length(){return map.size},
    keys:()=>[...map.keys()]
  };
}

const V3_KEY='aws-student-rewards.quest.v3';
const V2_KEY='aws-student-rewards.quest.v2';
const V1_KEY='aws-student-rewards.quest.v1';
const TODAY=todayStr();

const storage=fakeStorage();
Object.defineProperty(globalThis,'localStorage',{value:storage,configurable:true,writable:true});

storage.setItem(V1_KEY,JSON.stringify({
  version:1,
  startedAt:addDays(TODAY,-40),
  mode:'personal',
  completed:{'hello-world':true,'photo-finisher':true},
  overrides:{'first-wish':'completed'},
  streaks:{
    signin:{current:5,longest:9,startedAt:addDays(TODAY,-10),last:addDays(TODAY,-1)},
    like:{current:0,longest:0,startedAt:null,last:null},
    comment:{current:2,longest:4,startedAt:addDays(TODAY,-10),last:addDays(TODAY,-7)}
  },
  weekly:{
    wishVote:{current:3,longest:3,startedAt:addDays(TODAY,-21),last:addDays(TODAY,-8)},
    articlePublish:{current:0,longest:0,startedAt:null,last:null}
  },
  notes:{'first-wish':'shipped'}
}));

const store=await import('../src/domain/store.js');

function saved(){
  const raw=storage.getItem(V3_KEY);
  assert.ok(raw,'expected progress to be written under the v3 key');
  return JSON.parse(raw);
}

test('legacy v1 progress is migrated into the v3 key instead of being lost',()=>{
  const s=store.getState();
  assert.equal(s.version,3);
  assert.equal(s.startedAt,addDays(TODAY,-40));
  assert.equal(s.completed['hello-world'],true);
  assert.equal(s.overrides['first-wish'],'completed');
  assert.equal(s.streaks.signin.current,5,'an alive v1 streak keeps its counter');
  assert.equal(s.streaks.signin.longest,9);
  assert.equal(s.streaks.signin.last,addDays(TODAY,-1));
  assert.equal(s.streaks.comment.current,0,'a lapsed v1 streak restarts at 0');
  assert.equal(s.weekly.wishVote.weeks.length,3);
  assert.deepEqual(Object.keys(s.weekly.wishVote),['weeks','longest']);

  for(let i=4;i>=0;i--){
    const day=addDays(TODAY,-1-i);
    assert.equal(s.activityLog[day].signin,true,`the claimed run of 5 days is materialized on ${day}`);
  }
  assert.equal(s.activityLog[addDays(TODAY,-7)],undefined,'no day is invented for a lapsed counter');

  const onDisk=saved();
  assert.equal(onDisk.version,3);
  assert.equal(storage.getItem(V1_KEY)!==null,true,'the v1 key is kept as a backup');
  assert.equal(storage.getItem(V2_KEY),null,'the v2 key is not recreated when migrating straight from v1');
});

test('logStreak is idempotent within a day and strict about gaps',()=>{
  store.resetAll();
  assert.equal(store.logStreak('signin','2026-09-25'),1);
  assert.equal(store.logStreak('signin','2026-09-25'),null);
  assert.equal(store.logStreak('signin','2026-09-25'),null);
  assert.equal(store.getState().streaks.signin.current,1);

  assert.equal(store.logStreak('signin','2026-09-26'),2);
  assert.equal(store.logStreak('signin','2026-09-27'),3);
  assert.equal(store.logStreak('signin','2026-09-28'),4);
  assert.equal(store.logStreak('signin','2026-09-30'),1,'a missed day restarts at 1');
  assert.equal(store.getState().streaks.signin.longest,4);

  const persisted=saved();
  assert.equal(persisted.streaks.signin.current,1);
  assert.equal(persisted.streaks.signin.longest,4);
  assert.equal(persisted.streaks.signin.last,'2026-09-30');
});

test('logStreak refuses unknown keys and out-of-order dates',()=>{
  assert.equal(store.logStreak('nope','2026-09-30'),null);
  assert.equal(store.logStreak('signin','2026-09-25'),null);
  assert.equal(store.getState().streaks.signin.current,1);
});

test('logWeek records week identity and never double-counts a week',()=>{
  store.resetAll();
  assert.equal(store.logWeek('wishVote','2026-09-25'),1);
  assert.equal(store.logWeek('wishVote','2026-09-27'),null,'same ISO week');
  assert.equal(store.logWeek('wishVote','2026-09-30'),2,'next ISO week');
  assert.equal(store.logWeek('wishVote','2026-10-07'),3);
  assert.deepEqual(store.getState().weekly.wishVote.weeks,['2026-W39','2026-W40','2026-W41']);
  assert.equal(store.getState().weekly.wishVote.longest,3);

  const persisted=saved();
  assert.deepEqual(persisted.weekly.wishVote.weeks,['2026-W39','2026-W40','2026-W41']);

  assert.equal(store.logWeek('wishVote','2026-10-21'),1,'a skipped week restarts at 1');
  assert.equal(store.getState().weekly.wishVote.longest,3);
  assert.equal(store.logWeek('unknownWeek','2026-10-21'),null);
});

test('resetStreak and resetWeek clear the run but keep the record',()=>{
  store.resetAll();
  assert.equal(store.logStreak('signin','2026-09-25'),1);
  assert.equal(store.logStreak('signin','2026-09-26'),2);
  store.resetStreak('signin');
  assert.equal(store.getState().streaks.signin.current,0);
  assert.equal(store.getState().streaks.signin.longest,2);
  assert.equal(store.getState().streaks.signin.last,null);

  assert.equal(store.logWeek('wishVote','2026-09-25'),1);
  assert.equal(store.logWeek('wishVote','2026-09-30'),2);
  store.resetWeek('wishVote');
  assert.deepEqual(store.getState().weekly.wishVote.weeks,[]);
  assert.equal(store.getState().weekly.wishVote.longest,2);
});

test('an export can be re-imported byte for byte',()=>{
  const exported=JSON.stringify(store.getState());
  const reimported=store.importState(JSON.parse(exported));
  assert.deepEqual(reimported,JSON.parse(exported));
  assert.equal(storage.getItem(V3_KEY),JSON.stringify(store.getState()));
});

test('importState rejects junk without corrupting the saved state',()=>{
  const before=JSON.stringify(store.getState());
  assert.throws(()=>store.importState({version:2,completed:'nope'}),/completed/);
  assert.throws(()=>store.importState({nothing:true}),/version/);
  assert.throws(()=>store.importState('string'),/JSON object/);
  assert.equal(JSON.stringify(store.getState()),before);
  assert.equal(storage.getItem(V3_KEY),before);
});

test('setOverride, setNote, setMode and resetAll persist through save()',()=>{
  store.setOverride('first-wish','active');
  assert.equal(store.getState().overrides['first-wish'],'active');
  store.clearOverride('first-wish');
  assert.equal(store.getState().overrides['first-wish'],undefined);

  store.setNote('hello-world','note to remember');
  assert.equal(saved().notes['hello-world'],'note to remember');

  store.setMode('community');
  assert.equal(saved().mode,'community');
  assert.equal(store.getViewState().mode,'community');
  store.setMode('personal');
  assert.equal(store.getViewState().mode,'personal');

  store.resetAll();
  const fresh=store.getState();
  assert.equal(fresh.version,3);
  assert.equal(fresh.completed['hello-world'],true);
  assert.deepEqual(fresh.weekly.wishVote.weeks,[]);
  assert.equal(saved().startedAt,fresh.startedAt);
});

test('storageInfo reports the live key, its size and surviving legacy backups',()=>{
  const info=store.storageInfo();
  assert.equal(info.key,'aws-student-rewards.quest.v3');
  assert.equal(info.version,3);
  assert.ok(info.bytes>0);
  assert.equal(info.bytes,storage.getItem('aws-student-rewards.quest.v3').length);
  assert.ok(info.legacy.includes('aws-student-rewards.quest.v1'),'the v1 backup is never deleted');
  assert.ok(!info.legacy.includes('aws-student-rewards.quest.v2'),'no v2 backup was seeded in this test');
});
