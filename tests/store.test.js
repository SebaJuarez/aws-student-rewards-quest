import test from 'node:test';
import assert from 'node:assert/strict';

import {defaultState,normalizeState,STATE_VERSION,STORAGE_KEY,LEGACY_STORAGE_KEY} from '../src/domain/store.js';
import {addDays,todayStr} from '../src/domain/dates.js';

const TODAY=todayStr();

test('a valid v2 state round-trips through normalizeState unchanged',()=>{
  const s=defaultState();
  const again=normalizeState(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(again,s);
  assert.equal(again.version,STATE_VERSION);
  assert.equal(again.streaks.signin.current,0);
  assert.deepEqual(again.weekly.wishVote.weeks,[]);
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

test('a partial state fills the missing sections with defaults',()=>{
  const out=normalizeState({version:2,completed:{'hello-world':true}});
  assert.equal(out.version,STATE_VERSION);
  assert.equal(out.mode,'personal');
  assert.ok(out.startedAt);
  assert.equal(out.streaks.comment.current,0);
  assert.deepEqual(out.weekly.articlePublish.weeks,[]);
  assert.deepEqual(out.notes,{});
});

test('export -> import keeps badges, overrides, streaks, weeks and notes',()=>{
  const s=defaultState();
  s.startedAt='2026-08-01';
  s.mode='community';
  s.completed={'hello-world':true,'first-article':true};
  s.overrides={'first-wish':'completed'};
  s.streaks.signin={current:5,longest:9,startedAt:'2026-09-21',last:'2026-09-25'};
  s.streaks.comment={current:0,longest:3,startedAt:null,last:'2026-06-01'};
  s.weekly.wishVote={weeks:['2026-W37','2026-W38'],longest:2};
  s.notes={'hello-world':'profile done'};

  const wire=JSON.parse(JSON.stringify(s));
  const imported=normalizeState(wire);
  assert.deepEqual(imported,s);
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
    streaks:{like:{current:4,longest:4,startedAt:addDays(TODAY,-3),last:addDays(TODAY,-1)}}
  };
  const out=normalizeState(legacy);
  assert.equal(out.streaks.like.current,4);
  assert.equal(out.streaks.like.startedAt,addDays(TODAY,-3));
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

test('storage keys are versioned so old progress is migrated, not discarded',()=>{
  assert.equal(STORAGE_KEY,'aws-student-rewards.quest.v2');
  assert.equal(LEGACY_STORAGE_KEY,'aws-student-rewards.quest.v1');
  assert.notEqual(STORAGE_KEY,LEGACY_STORAGE_KEY);
});
