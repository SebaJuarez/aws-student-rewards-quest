import test from 'node:test';
import assert from 'node:assert/strict';
import {todayStr} from '../src/domain/dates.js';

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

const storage=fakeStorage();
Object.defineProperty(globalThis,'localStorage',{value:storage,configurable:true,writable:true});

const store=await import('../src/domain/store.js');
const TODAY=todayStr();

test('canUndo is false initially on clean state',()=>{
  store.__resetForTest();
  store.resetAll();
  // resetAll takes a snapshot, let's clear it with __resetForTest
  store.__resetForTest();
  assert.equal(store.canUndo(),false);
});

test('logStreak creates snapshot and undo restores streak and log',()=>{
  store.__resetForTest();
  store.resetAll();
  // State is clean 0 streaks
  assert.equal(store.getState().streaks.signin.current,0);
  assert.equal(store.logStreak('signin',TODAY),1);
  assert.equal(store.getState().streaks.signin.current,1);
  assert.equal(store.getState().activityLog[TODAY]?.signin,true);
  assert.equal(store.canUndo(),true);

  const restored=store.undo();
  assert.ok(restored);
  assert.equal(store.getState().streaks.signin.current,0);
  assert.equal(store.getState().activityLog[TODAY]?.signin,undefined);
  assert.equal(store.canUndo(),false);
  assert.equal(store.undo(),null,'second undo is a no-op');
});

test('resetStreak takes snapshot and undo restores streak',()=>{
  store.__resetForTest();
  store.resetAll();
  store.logStreak('like',TODAY);
  assert.equal(store.getState().streaks.like.current,1);

  store.resetStreak('like');
  assert.equal(store.getState().streaks.like.current,0);
  assert.equal(store.getState().activityLog[TODAY]?.like,undefined);

  store.undo();
  assert.equal(store.getState().streaks.like.current,1);
  assert.equal(store.getState().activityLog[TODAY]?.like,true);
});

test('logWeek and resetWeek take snapshot and undo restores correctly',()=>{
  store.__resetForTest();
  store.resetAll();
  const current=store.logWeek('wishVote',TODAY);
  assert.equal(current,1);
  assert.equal(store.canUndo(),true);

  store.undo();
  assert.equal(store.getState().weekly.wishVote.weeks.length,0);

  // Re-log then reset
  store.logWeek('wishVote',TODAY);
  assert.equal(store.getState().weekly.wishVote.weeks.length,1);
  store.resetWeek('wishVote');
  assert.equal(store.getState().weekly.wishVote.weeks.length,0);

  store.undo();
  assert.equal(store.getState().weekly.wishVote.weeks.length,1);
});

test('setOverride and clearOverride snapshot and undo correctly',()=>{
  store.__resetForTest();
  store.resetAll();
  store.setOverride('hello-world','completed');
  assert.equal(store.getState().overrides['hello-world'],'completed');

  store.undo();
  assert.equal(store.getState().overrides['hello-world'],undefined);

  store.setOverride('hello-world','completed');
  store.clearOverride('hello-world');
  assert.equal(store.getState().overrides['hello-world'],undefined);

  store.undo();
  assert.equal(store.getState().overrides['hello-world'],'completed');
});

test('resetAll takes snapshot and undo restores full progress',()=>{
  store.__resetForTest();
  store.resetAll();
  store.setOverride('knowledge-seeker','completed');
  store.logStreak('signin',TODAY);
  assert.equal(store.getState().overrides['knowledge-seeker'],'completed');
  assert.equal(store.getState().streaks.signin.current,1);

  store.resetAll();
  assert.deepEqual(store.getState().overrides,{});
  assert.equal(store.getState().streaks.signin.current,0);

  store.undo();
  assert.equal(store.getState().overrides['knowledge-seeker'],'completed');
  assert.equal(store.getState().streaks.signin.current,1);
});

test('importState takes snapshot and undo restores state before import',()=>{
  store.__resetForTest();
  store.resetAll();
  store.setOverride('first-wish','completed');

  const incoming={
    version:3,
    startedAt:TODAY,
    mode:'personal',
    completed:{'hello-world':true},
    overrides:{'photo-finisher':'completed'},
    streaks:{},
    weekly:{},
    activityLog:{},
    notes:{}
  };

  store.importState(incoming);
  assert.equal(store.getState().overrides['photo-finisher'],'completed');
  assert.equal(store.getState().overrides['first-wish'],undefined);

  store.undo();
  assert.equal(store.getState().overrides['first-wish'],'completed');
  assert.equal(store.getState().overrides['photo-finisher'],undefined);
});

test('setNote does NOT snapshot (too noisy)',()=>{
  store.__resetForTest();
  store.resetAll();
  store.__resetForTest();
  assert.equal(store.canUndo(),false);

  store.setNote('hello-world','just a test note');
  assert.equal(store.canUndo(),false,'setNote did not create an undo snapshot');
});

test('switching mode clears undoSnapshot so stale snapshots do not survive',()=>{
  store.__resetForTest();
  store.resetAll();
  store.setOverride('hello-world','completed');
  assert.equal(store.canUndo(),true);

  store.setMode('community');
  assert.equal(store.canUndo(),false,'canUndo is false in community mode');
  assert.equal(store.undo(),null,'undo returns null in community mode');

  // snapshot is a no-op in community mode
  store.snapshot('manual');
  assert.equal(store.canUndo(),false);

  // switching back to personal does NOT restore the old snapshot
  store.setMode('personal');
  assert.equal(store.canUndo(),false,'stale pre-community snapshot was cleared on mode switch');
  assert.equal(store.undo(),null,'undo is null after returning to personal mode');
});
