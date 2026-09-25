import {todayStr} from './dates.js';

export const STORAGE_KEY='aws-student-rewards.quest.v1';

export function defaultState(){
  return {version:1,startedAt:todayStr(),mode:'personal',
    completed:{'hello-world':true,'photo-finisher':true},
    overrides:{},
    streaks:{signin:{current:0,longest:0,startedAt:null,last:null},like:{current:0,longest:0,startedAt:null,last:null},comment:{current:0,longest:0,startedAt:null,last:null}},
    weekly:{wishVote:{current:0,longest:0,startedAt:null,last:null},articlePublish:{current:0,longest:0,startedAt:null,last:null}},
    notes:{}};
}

export function communityDemoState(){
  return {...defaultState(),completed:{'hello-world':true,'photo-finisher':true,'knowledge-seeker':true,'discussion-debut':true,'first-wish':true},startedAt:todayStr()};
}

let onStorageError=()=>{};
export function setStorageErrorHandler(fn){onStorageError=fn;}

function load(){try{const raw=localStorage.getItem(STORAGE_KEY);if(!raw)return defaultState();const p=JSON.parse(raw);return Object.assign(defaultState(),p);}catch(e){return defaultState();}}
export function save(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}catch(e){onStorageError('Could not save — storage unavailable');}}

let state=load();
export function getState(){return state;}
export function replaceState(next){state=next;save();}

export function setMode(mode){state.mode=mode;save();}
export function setOverride(badgeId,status){state.overrides[badgeId]=status;save();}
export function clearOverride(badgeId){delete state.overrides[badgeId];save();}
export function setNote(badgeId,note){state.notes[badgeId]=note;save();}
export function resetAll(){state=defaultState();save();}

export function logStreak(key){
  const st=state.streaks[key],today=todayStr();
  if(st.last===today)return null;
  if(!st.startedAt)st.startedAt=today;
  st.current+=1; st.last=today; st.longest=Math.max(st.longest,st.current);
  save();
  return st.current;
}

export function resetStreak(key){
  state.streaks[key]={current:0,longest:state.streaks[key].longest,startedAt:null,last:null};
  save();
}
