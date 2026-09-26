import test from 'node:test';
import assert from 'node:assert/strict';

import {defaultState,normalizeState,STATE_VERSION,STORAGE_KEY,PRIOR_STORAGE_KEY,LEGACY_STORAGE_KEY,LEGACY_STORAGE_KEYS} from '../src/domain/store.js';
import {addDays,todayStr} from '../src/domain/dates.js';

const TODAY=todayStr();

test('a valid v3 state round-trips through normalizeState unchanged',()=>{
  const s=defaultState();
  const again=normalizeState(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(again,s);
  assert.equal(again.version,STATE_VERSION);
  assert.equal(again.streaks.signin.current,0);
  assert.deepEqual(again.weekly.wishVote.weeks,[]);
  assert.deepEqual(again.activityLog,{});
});

test('unknown top-level keys are dropped',()=>{
  const s={...defaultState(),surprise:'drop me'};
  const out=normalizeState(s);
  assert.equal('surprise' in out,false);
});

test('rejected: not an object',()=>{
  assert.throws(()=>normalizeState(null),/JSON object/);
  assert.throws(()=>normalizeState('nope'),/JSON object/);
  assert.throws(()=>normalizeState([1,2,3]),/JSON object/);
});

test('rejected: missing or unsupported version',()=>{
  assert.throws(()=>normalizeState({}),/version/);
  assert.throws(()=>normalizeState({version:'2'}),/version/);
  assert.throws(()=>normalizeState({version:0}),/version/);
  assert.throws(()=>normalizeState({version:99}),/newer/);
});

test('rejected: malformed startedAt, mode, completed, overrides, notes',()=>{
  assert.throws(()=>normalizeState({version:2,startedAt:'banana'}),/date/);
  assert.throws(()=>normalizeState({version:2,mode:'sideways'}),/mode/);
  assert.throws(()=>normalizeState({version:2,completed:'yes'}),/completed/);
  assert.throws(()=>normalizeState({version:2,overrides:{'hello-world':'done'}}),/overrides/);
  assert.throws(()=>normalizeState({version:2,notes:'hello'}),/notes/);
});

test('rejected: malformed streak and weekly structures',()=>{
  assert.throws(()=>normalizeState({version:2,streaks:'no'}),/streaks/);
  assert.throws(()=>normalizeState({version:2,streaks:{signin:'no'}}),/streaks.signin/);
  assert.throws(()=>normalizeState({version:2,streaks:{signin:{current:'5'}}}),/current/);
  assert.throws(()=>normalizeState({version:2,streaks:{signin:{last:'soon'}}}),/date/);
  assert.throws(()=>normalizeState({version:2,weekly:{wishVote:{weeks:'no'}}}),/array/);
  assert.throws(()=>normalizeState({version:2,weekly:{wishVote:{weeks:['nope']}}}),/week key/);
});

test('rejected: malformed activity log structures',()=>{
  assert.throws(()=>normalizeState({version:3,activityLog:'no'}),/activityLog/);
  assert.throws(()=>normalizeState({version:3,activityLog:['2026-09-25']}),/activityLog/);
  assert.throws(()=>normalizeState({version:3,activityLog:{'someday':{signin:true}}}),/invalid date/);
  assert.throws(()=>normalizeState({version:3,activityLog:{'2026-09-25':'yes'}}),/activityLog\.2026-09-25/);
});

test('a partial state fills the missing sections with defaults',()=>{
  const out=normalizeState({version:2,completed:{'hello-world':true}});
  assert.equal(out.version,STATE_VERSION);
  assert.equal(out.mode,'personal');
  assert.ok(out.startedAt);
  assert.equal(out.streaks.comment.current,0);
  assert.deepEqual(out.weekly.articlePublish.weeks,[]);
  assert.deepEqual(out.notes,{});
});

test('export -> import keeps badges, overrides, activity log, streaks, weeks and notes',()=>{
  const s=defaultState();
  s.startedAt='2026-08-01';
  s.mode='community';
  s.completed={'hello-world':true,'first-article':true};
  s.overrides={'first-wish':'completed'};
  s.activityLog={
    '2026-09-21':{signin:true},
    '2026-09-22':{signin:true},
    '2026-09-23':{signin:true},
    '2026-09-24':{signin:true},
    '2026-09-25':{signin:true}
  };
  s.streaks.signin={current:5,longest:9,startedAt:'2026-09-21',last:'2026-09-25'};
  s.streaks.comment={current:0,longest:3,startedAt:null,last:'2026-06-01'};
  s.weekly.wishVote={weeks:['2026-W37','2026-W38'],longest:2};
  s.notes={'hello-world':'profile done'};

  const wire=JSON.parse(JSON.stringify(s));
  const imported=normalizeState(wire);
  assert.deepEqual(imported,s);
});

test('the activity log wins over a stored counter that disagrees with it',()=>{
  const s=defaultState();
  s.streaks.signin={current:40,longest:40,startedAt:'2026-06-01',last:TODAY};
  s.activityLog={[TODAY]:{signin:true}};
  const out=normalizeState(s);
  assert.equal(out.streaks.signin.current,1,'only the day that is actually logged counts');
  assert.equal(out.streaks.signin.last,TODAY);
  assert.equal(out.streaks.signin.longest,40,'the record of the past run is kept');
});

test('v1 import migrates weekly counters into real week identities',()=>{
  const legacy={
    version:1,
    startedAt:addDays(TODAY,-30),
    mode:'personal',
    completed:{'hello-world':true},
    overrides:{},
    streaks:{
      signin:{current:5,longest:9,startedAt:addDays(TODAY,-10),last:addDays(TODAY,-1)},
      like:{current:0,longest:0,startedAt:null,last:null},
      comment:{current:3,longest:3,startedAt:addDays(TODAY,-10),last:addDays(TODAY,-9)}
    },
    weekly:{
      wishVote:{current:3,longest:3,startedAt:addDays(TODAY,-21),last:addDays(TODAY,-8)},
      articlePublish:{current:0,longest:0,startedAt:null,last:null}
    },
    notes:{'hello-world':'done'}
  };

  const out=normalizeState(legacy);
  assert.equal(out.version,STATE_VERSION);

  assert.equal(out.streaks.signin.current,5);
  assert.equal(out.streaks.signin.longest,9);
  assert.equal(out.streaks.signin.last,addDays(TODAY,-1));

  assert.equal(out.streaks.comment.current,0,'a lapsed v1 counter must not stay inflated');
  assert.equal(out.streaks.comment.startedAt,null);
  assert.equal(out.streaks.comment.longest,3);

  const weeks=out.weekly.wishVote.weeks;
  assert.equal(weeks.length,3);
  assert.deepEqual(out.weekly.wishVote.weeks,[...weeks].sort());
  assert.equal(out.weekly.wishVote.longest,3);
  assert.equal(out.weekly.articlePublish.weeks.length,0);
  assert.equal(out.completed['hello-world'],true);
  assert.equal(out.notes['hello-world'],'done');
});

test('v1 import keeps a still-alive counter untouched',()=>{
  const legacy={
    version:1,
    startedAt:TODAY,
    completed:{},
    streaks:{like:{current:4,longest:4,startedAt:addDays(TODAY,-4),last:addDays(TODAY,-1)}}
  };
  const out=normalizeState(legacy);
  assert.equal(out.streaks.like.current,4);
  assert.equal(out.streaks.like.startedAt,addDays(TODAY,-4));
  assert.equal(out.activityLog[addDays(TODAY,-1)].like,true,'the claimed run becomes real days');
  assert.equal(out.activityLog[addDays(TODAY,-4)].like,true);
  assert.equal(out.activityLog[addDays(TODAY,-5)],undefined);
});

test('v1 import accepts a weekly week-key list instead of a counter',()=>{
  const legacy={
    version:1,
    startedAt:TODAY,
    completed:{},
    weekly:{wishVote:{weeks:['2026-W38','2026-W39'],longest:2}}
  };
  const out=normalizeState(legacy);
  assert.deepEqual(out.weekly.wishVote.weeks,['2026-W38','2026-W39']);
  assert.equal(out.weekly.wishVote.longest,2);
});

test('v1 import still rejects obviously broken structures',()=>{
  assert.throws(()=>normalizeState({version:1,streaks:'no'}),/streaks/);
  assert.throws(()=>normalizeState({version:1,weekly:'no'}),/weekly/);
});

test('a v2 state becomes a v3 activity log without inventing history',()=>{
  const v2={
    version:2,
    startedAt:addDays(TODAY,-30),
    completed:{'hello-world':true},
    streaks:{
      signin:{current:5,longest:9,startedAt:addDays(TODAY,-5),last:addDays(TODAY,-1)},
      like:{current:0,longest:4,startedAt:null,last:addDays(TODAY,-40)}
    },
    weekly:{wishVote:{weeks:['2026-W37','2026-W38'],longest:2}},
    notes:{}
  };
  const out=normalizeState(v2);
  assert.equal(out.version,STATE_VERSION);
  assert.equal(out.streaks.signin.current,5,'the counter keeps its value through the migration');
  assert.equal(out.streaks.signin.last,addDays(TODAY,-1));
  for(let i=0;i<5;i++)assert.equal(out.activityLog[addDays(TODAY,-1-i)].signin,true);
  assert.equal(out.streaks.like.current,0,'no day is invented for a counter at 0');
  assert.equal(out.streaks.like.last,addDays(TODAY,-40),'the last-logged record is preserved');
  assert.deepEqual(out.weekly.wishVote.weeks,['2026-W37','2026-W38'],'weeks without a known day stay a baseline');
  assert.equal(out.activityLog[addDays(TODAY,-40)],undefined);
});

test('storage keys are versioned so old progress is migrated, not discarded',()=>{
  assert.equal(STORAGE_KEY,'aws-student-rewards.quest.v3');
  assert.equal(PRIOR_STORAGE_KEY,'aws-student-rewards.quest.v2');
  assert.equal(LEGACY_STORAGE_KEY,'aws-student-rewards.quest.v1');
  assert.deepEqual(LEGACY_STORAGE_KEYS,[PRIOR_STORAGE_KEY,LEGACY_STORAGE_KEY]);
  assert.equal(new Set([STORAGE_KEY,...LEGACY_STORAGE_KEYS]).size,3,'every key is distinct');
});
