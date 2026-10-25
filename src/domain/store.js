import {addDays,daysBetween,isValidDateStr,normWeekKey,todayStr,weekKeyOf} from './dates.js';
import {
  OVERRIDE_VALUES,STREAK_KEYS,WEEK_KEYS,emptyStreak,emptyWeek,maxWeekRun,
  normalizeStreak,normalizeWeek,weekView,weeksFromAnchor
} from './activity.js';
import {
  clearActivity,hasActivity,logHasWeek,normalizeLog,
  rebuildStreaks,rebuildWeekly,writeActivity
} from './activityLog.js';

export const STORAGE_KEY='aws-student-rewards.quest.v3';
export const PRIOR_STORAGE_KEY='aws-student-rewards.quest.v2';
export const LEGACY_STORAGE_KEY='aws-student-rewards.quest.v1';
export const LEGACY_STORAGE_KEYS=[PRIOR_STORAGE_KEY,LEGACY_STORAGE_KEY];
export const STATE_VERSION=3;
const CORRUPT_PREFIX='aws-student-rewards.quest.v3.corrupt-';

const OVERRIDE_SET=new Set(OVERRIDE_VALUES);

export function defaultState(){
  const streaks={},weekly={};
  STREAK_KEYS.forEach(k=>{streaks[k]=emptyStreak()});
  WEEK_KEYS.forEach(k=>{weekly[k]=emptyWeek()});
  return {version:STATE_VERSION,startedAt:todayStr(),mode:'personal',
    completed:{},
    overrides:{},activityLog:{},streaks,weekly,notes:{}};
}

function demoActivityLog(today){
  let log={};
  for(let i=0;i<14;i++){
    const date=addDays(today,-i);
    if(!date)continue;
    log=writeActivity(log,date,'signin');
    if(i%6!==0)log=writeActivity(log,date,'like');
    if(i<2||i%5===0)log=writeActivity(log,date,'comment');
  }
  const lastWeek=addDays(today,-7);
  if(lastWeek){
    log=writeActivity(log,today,'wishVote');
    log=writeActivity(log,lastWeek,'wishVote');
    log=writeActivity(log,lastWeek,'articlePublish');
  }
  return log;
}

export function communityDemoState(){
  const today=todayStr();
  const activityLog=demoActivityLog(today);
  const s={...defaultState(),mode:'community',
    startedAt:addDays(today,-13)||today,
    completed:{'hello-world':true,'photo-finisher':true,'knowledge-seeker':true,'discussion-debut':true,'first-wish':true},
    activityLog};
  s.streaks=rebuildStreaks(activityLog,s.streaks);
  s.weekly=rebuildWeekly(activityLog,s.weekly);
  return s;
}

let onStorageError=()=>{};
export function setStorageErrorHandler(fn){onStorageError=fn;}

function isObj(v){return v!==null&&typeof v==='object'&&!Array.isArray(v)}
function fail(msg){throw new Error(msg)}
function reqObj(v,label){if(v!==undefined&&v!==null&&!isObj(v))fail(`"${label}" must be an object`);return v}
function reqNum(v,label){
  if(v===undefined)return 0;
  if(typeof v!=='number'||!Number.isFinite(v))fail(`"${label}" must be a number`);
  if(v<0)fail(`"${label}" must not be negative`);
  return Math.floor(v);
}
function reqDate(v,label){
  if(v===undefined||v===null)return null;
  if(!isValidDateStr(v))fail(`"${label}" is not a valid YYYY-MM-DD date`);
  return v;
}

function migrateStreaksV1(raw){
  reqObj(raw,'streaks');
  const out={};
  STREAK_KEYS.forEach(k=>{
    const entry=raw?raw[k]:undefined;
    if(entry===undefined||entry===null){out[k]=emptyStreak();return}
    reqObj(entry,`streaks.${k}`);
    const norm=normalizeStreak(entry);
    const gap=norm.last?daysBetween(norm.last,todayStr()):null;
    out[k]=gap!==null&&gap>1?{...norm,current:0,startedAt:null}:norm;
  });
  return out;
}

function anchorWeekOf(v){
  if(v===undefined||v===null)return null;
  return normWeekKey(v)||(isValidDateStr(v)?weekKeyOf(v):null);
}

function migrateWeeklyV1(raw){
  reqObj(raw,'weekly');
  const out={};
  WEEK_KEYS.forEach(k=>{
    const entry=raw?raw[k]:undefined;
    if(entry===undefined||entry===null){out[k]=emptyWeek();return}
    reqObj(entry,`weekly.${k}`);
    if(Array.isArray(entry.weeks)){
      const weeks=entry.weeks.map(x=>normWeekKey(x)||(isValidDateStr(x)?weekKeyOf(x):null)).filter(Boolean);
      out[k]=normalizeWeek({weeks,longest:entry.longest});
      return;
    }
    const count=reqNum(entry.current,`weekly.${k}.current`);
    const anchor=anchorWeekOf(entry.last)||anchorWeekOf(entry.startedAt);
    const weeks=count>0&&anchor?weeksFromAnchor(anchor,count):[];
    out[k]=normalizeWeek({weeks,longest:Math.max(reqNum(entry.longest,`weekly.${k}.longest`),count)});
  });
  return out;
}

function migrateV1(raw){
  const s={...raw,version:2};
  s.streaks=migrateStreaksV1(raw.streaks);
  s.weekly=migrateWeeklyV1(raw.weekly);
  return s;
}

const MAX_SEED_DAYS=365;

// v2 -> v3: materialize the runs the stored counters already claim as real days in the
// activity log (a streak of N days ending on `last` IS those N days). Weeks recorded in v2
// have no known day, so they stay as the `weekly.weeks` baseline instead of being guessed.
function seedLogFromStreaks(base,raw){
  const out={...base};
  if(!raw||typeof raw!=='object')return out;
  STREAK_KEYS.forEach(key=>{
    const entry=raw[key];
    if(!entry||typeof entry!=='object')return;
    const last=isValidDateStr(entry.last)?entry.last:null;
    const n=typeof entry.current==='number'&&Number.isFinite(entry.current)&&entry.current>0
      ?Math.min(Math.floor(entry.current),MAX_SEED_DAYS):0;
    if(!last||n<1)return;
    for(let i=n-1;i>=0;i--){
      const date=addDays(last,-i);
      if(!date)continue;
      if(!out[date])out[date]={};
      out[date][key]=true;
    }
  });
  return out;
}

function migrateV2(raw){
  const base=raw.activityLog&&typeof raw.activityLog==='object'&&!Array.isArray(raw.activityLog)
    ?raw.activityLog:{};
  return {...raw,version:3,activityLog:seedLogFromStreaks(base,raw.streaks)};
}

export function normalizeState(raw){
  if(!isObj(raw))fail('not a progress file (expected a JSON object)');
  if(!Number.isInteger(raw.version))fail('missing or invalid "version"');
  if(raw.version<1)fail('missing or invalid "version"');
  if(raw.version>STATE_VERSION)fail(`version ${raw.version} is newer than this tracker (v${STATE_VERSION}) — update the app first`);
  let s=raw;
  if(s.version===1)s=migrateV1(s);
  if(s.version===2)s=migrateV2(s);

  const out=defaultState();
  out.version=STATE_VERSION;
  out.startedAt=reqDate(s.startedAt,'startedAt')||out.startedAt;
  if(s.mode!==undefined){
    if(s.mode!=='personal'&&s.mode!=='community')fail('"mode" must be "personal" or "community"');
    out.mode=s.mode;
  }

  if(s.completed!==undefined){
    reqObj(s.completed,'completed');
    out.completed={};
    Object.keys(s.completed).forEach(k=>{out.completed[k]=Boolean(s.completed[k])});
  }

  if(s.overrides!==undefined){
    reqObj(s.overrides,'overrides');
    out.overrides={};
    Object.keys(s.overrides).forEach(k=>{
      const v=s.overrides[k];
      if(v===undefined||v===null)return;
      if(!OVERRIDE_SET.has(v))fail(`overrides.${k} must be one of ${OVERRIDE_VALUES.join(', ')}`);
      out.overrides[k]=v;
    });
  }

  if(s.streaks!==undefined){
    reqObj(s.streaks,'streaks');
    STREAK_KEYS.forEach(k=>{
      const entry=s.streaks[k];
      if(entry===undefined||entry===null)return;
      reqObj(entry,`streaks.${k}`);
      out.streaks[k]=normalizeStreak({
        current:reqNum(entry.current,`streaks.${k}.current`),
        longest:reqNum(entry.longest,`streaks.${k}.longest`),
        startedAt:reqDate(entry.startedAt,`streaks.${k}.startedAt`),
        last:reqDate(entry.last,`streaks.${k}.last`)
      });
    });
  }

  if(s.weekly!==undefined){
    reqObj(s.weekly,'weekly');
    WEEK_KEYS.forEach(k=>{
      const entry=s.weekly[k];
      if(entry===undefined||entry===null)return;
      reqObj(entry,`weekly.${k}`);
      let weeks=[];
      if(entry.weeks!==undefined){
        if(!Array.isArray(entry.weeks))fail(`weekly.${k}.weeks must be an array`);
        weeks=entry.weeks.map((w,i)=>{
          const key=normWeekKey(w);
          if(!key)fail(`weekly.${k}.weeks[${i}] is not a valid ISO week key (expected e.g. 2026-W39)`);
          return key;
        });
      }
      out.weekly[k]=normalizeWeek({weeks,longest:reqNum(entry.longest,`weekly.${k}.longest`)});
    });
  }

  if(s.notes!==undefined){
    reqObj(s.notes,'notes');
    out.notes={};
    Object.keys(s.notes).forEach(k=>{
      const v=s.notes[k];
      if(typeof v==='string')out.notes[k]=v;
    });
  }

  out.activityLog=normalizeLog(s.activityLog);
  out.streaks=rebuildStreaks(out.activityLog,out.streaks);
  out.weekly=rebuildWeekly(out.activityLog,out.weekly);

  return out;
}

function readKey(key){
  try{
    const raw=localStorage.getItem(key);
    if(raw===null)return {raw:null,exists:false};
    return {raw,exists:true,parsed:JSON.parse(raw)};
  }catch(e){
    return {raw:localStorage.getItem(key),exists:true,parseError:e};
  }
}

let loadWarning=null;
function setLoadWarning(msg){if(!loadWarning)loadWarning=msg;}
export function consumeLoadWarning(){const msg=loadWarning;loadWarning=null;return msg;}

function listCorruptKeys(){
  try{
    const keys=[];
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i);
      if(k&&k.startsWith(CORRUPT_PREFIX))keys.push(k);
    }
    return keys.sort().reverse();
  }catch(e){return []}
}

function pruneCorruptKeys(){
  const keys=listCorruptKeys();
  if(keys.length<=3)return;
  keys.slice(3).forEach(k=>{try{localStorage.removeItem(k)}catch(e){}});
}

let corruptCounter=0;
function backupCorrupt(key,raw){
  if(!raw)return;
  const stamp=new Date().toISOString().replace(/[:.]/g,'').replace('T','-').slice(0,17);
  const backupKey=CORRUPT_PREFIX+stamp+'-'+(++corruptCounter);
  try{localStorage.setItem(backupKey,raw)}catch(e){}
  pruneCorruptKeys();
}

function load(){
  const keys=[STORAGE_KEY,...LEGACY_STORAGE_KEYS];
  for(const key of keys){
    const {raw,exists,parsed,parseError}=readKey(key);
    if(!exists)continue;
    if(parseError){
      if(key===STORAGE_KEY){
        backupCorrupt(key,raw);
        setLoadWarning('Saved progress was corrupted and has been backed up. Starting fresh.');
      }
      continue;
    }
    try{
      const state=normalizeState(parsed);
      if(key!==STORAGE_KEY)writeState(state);
      return state;
    }catch(e){
      if(key===STORAGE_KEY){
        backupCorrupt(key,raw);
        setLoadWarning('Saved progress was invalid and has been backed up. Starting fresh.');
      }
    }
  }
  return defaultState();
}

function writeState(st){
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(st))}
  catch(e){onStorageError('Could not save — storage unavailable')}
}

let state=null;
let undoSnapshot=null;

function ensureState(){
  if(state===null)state=load();
}

export function canUndo(){
  ensureState();
  return state.mode!=='community'&&undoSnapshot!==null;
}

export function snapshot(label=''){
  ensureState();
  if(state.mode==='community')return;
  undoSnapshot={state:JSON.parse(JSON.stringify(state)),label};
}

export function undo(){
  ensureState();
  if(!canUndo())return null;
  const snap=undoSnapshot;
  undoSnapshot=null;
  state=normalizeState(snap.state);
  save();
  return state;
}

export function save(){writeState(state)}
export function getState(){ensureState();return state}
export function getViewState(){ensureState();return state.mode==='community'?communityDemoState():state}

export function replaceState(next){
  ensureState();
  const normalized=normalizeState(next);
  snapshot('replaceState');
  state=normalized;
  save();
}

export function importState(raw){
  ensureState();
  const next=normalizeState(raw);
  snapshot('importState');
  state=next;
  save();
  return state;
}

// Test-only: reset module state for testing corrupt storage scenarios
export function __resetForTest(){
  state=null;
  loadWarning=null;
  undoSnapshot=null;
}

export function setMode(mode){
  ensureState();
  if(state.mode!==mode){
    undoSnapshot=null;
    state.mode=mode;
    save();
  }
}

export function setOverride(badgeId,status){
  ensureState();
  snapshot('setOverride');
  state.overrides[badgeId]=status;
  save();
}

export function clearOverride(badgeId){
  ensureState();
  snapshot('clearOverride');
  delete state.overrides[badgeId];
  save();
}

export function setNote(badgeId,note){ensureState();state.notes[badgeId]=note;save()}

export function resetAll(){
  ensureState();
  snapshot('resetAll');
  state=defaultState();
  save();
}

export function logStreak(key,today=todayStr()){
  ensureState();
  if(!STREAK_KEYS.includes(key))return null;
  const last=state.streaks[key]?state.streaks[key].last:null;
  if(last&&daysBetween(last,today)<1)return null;
  if(hasActivity(state.activityLog,today,key))return null;
  snapshot('logStreak');
  state.activityLog=writeActivity(state.activityLog,today,key);
  state.streaks=rebuildStreaks(state.activityLog,state.streaks);
  save();
  return state.streaks[key].current;
}

export function resetStreak(key){
  ensureState();
  if(!STREAK_KEYS.includes(key))return;
  snapshot('resetStreak');
  const longest=state.streaks[key]?state.streaks[key].longest:0;
  state.activityLog=clearActivity(state.activityLog,key);
  state.streaks[key]={...emptyStreak(),longest};
  save();
}

export function logWeek(key,today=todayStr()){
  ensureState();
  if(!WEEK_KEYS.includes(key))return null;
  const week=weekKeyOf(today);
  if(!week)return null;
  if(state.weekly[key]&&state.weekly[key].weeks.includes(week))return null;
  if(logHasWeek(state.activityLog,key,week))return null;
  snapshot('logWeek');
  state.activityLog=writeActivity(state.activityLog,today,key);
  state.weekly=rebuildWeekly(state.activityLog,state.weekly);
  save();
  return weekView(state.weekly[key],today).current;
}

export function resetWeek(key){
  ensureState();
  if(!WEEK_KEYS.includes(key))return;
  snapshot('resetWeek');
  const longest=state.weekly[key]?state.weekly[key].longest:0;
  state.activityLog=clearActivity(state.activityLog,key);
  state.weekly[key]={weeks:[],longest};
  save();
}

// Read-only facts for the Settings view. localStorage access stays in this module.
export function storageInfo(){
  let bytes=0;
  try{
    const raw=localStorage.getItem(STORAGE_KEY);
    bytes=raw?raw.length:0;
  }catch(e){}
  const legacy=LEGACY_STORAGE_KEYS.filter(k=>{
    try{return localStorage.getItem(k)!==null}catch(e){return false}
  });
  const corrupt=listCorruptKeys();
  return {key:STORAGE_KEY,bytes,version:STATE_VERSION,legacy,corrupt};
}

