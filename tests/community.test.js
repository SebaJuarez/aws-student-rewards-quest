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
const storage=fakeStorage();
Object.defineProperty(globalThis,'localStorage',{value:storage,configurable:true,writable:true});

const store=await import('../src/domain/store.js');

test('communityDemoState is labeled example data and self-contained',()=>{
  const d=store.communityDemoState();
  assert.equal(d.mode,'community');
  assert.ok(Object.keys(d.completed).length>=1,'demo should show earned badges');
  assert.ok(Object.keys(d.activityLog).length>=7,'demo should show a recent activity log');
  assert.deepEqual(d.overrides,{},'demo carries no manual overrides');
  assert.deepEqual(d.notes,{},'demo carries no personal notes');
  const days=Object.keys(d.activityLog);
  const oldest=addDays(todayStr(),-14);
  assert.ok(days.every(day=>day>=oldest&&day<=todayStr()),'demo log stays within its recent window');
});

test('Community Mode never exposes or overwrites personal progress',()=>{
  store.resetAll();
  store.replaceState({
    ...store.getState(),
    completed:{'hello-world':true,'photo-finisher':true},
    notes:{'first-wish':'my private note'}
  });
  const persistedBeforeMode=JSON.parse(storage.getItem(V3_KEY));
  assert.deepEqual(persistedBeforeMode.notes,{'first-wish':'my private note'});

  store.setMode('community');
  const view=store.getViewState();
  assert.equal(view.mode,'community');
  assert.deepEqual(view.notes,{},'demo view must not show personal notes');
  assert.deepEqual(view.overrides,{},'demo view must not show personal overrides');

  const personal=store.getState();
  assert.deepEqual(personal.completed,{'hello-world':true,'photo-finisher':true},'personal state unchanged while viewing demo');
  assert.deepEqual(personal.notes,{'first-wish':'my private note'});
  const persistedDuringMode=JSON.parse(storage.getItem(V3_KEY));
  assert.deepEqual(persistedDuringMode.completed,{'hello-world':true,'photo-finisher':true},'demo data is never written to storage');
  assert.equal(persistedDuringMode.mode,'community','only the mode flag persists');

  store.setMode('personal');
  const back=store.getViewState();
  assert.equal(back,store.getState(),'personal mode returns the real state');
  assert.deepEqual(back.completed,{'hello-world':true,'photo-finisher':true});
  assert.deepEqual(back.notes,{'first-wish':'my private note'});
});

test('resetAll restores the default personal state and leaves Community Mode',()=>{
  store.setMode('community');
  store.resetAll();
  const s=store.getState();
  assert.equal(s.mode,'personal','reset switches back to Personal Mode');
  assert.deepEqual(s.completed,store.defaultState().completed,'reset returns the default starting badges');
  assert.deepEqual(s.notes,{});
  assert.deepEqual(s.overrides,{});
});
