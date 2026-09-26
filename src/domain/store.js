import {daysBetween,isValidDateStr,normWeekKey,todayStr,weekKeyOf} from './dates.js';
import {
  OVERRIDE_VALUES,STREAK_KEYS,WEEK_KEYS,emptyStreak,emptyWeek,maxWeekRun,
  nextStreak,nextWeek,normalizeStreak,normalizeWeek,weekView,weeksFromAnchor
} from './activity.js';

export const STORAGE_KEY='aws-student-rewards.quest.v2';
export const LEGACY_STORAGE_KEY='aws-student-rewards.quest.v1';
export const STATE_VERSION=2;

const OVERRIDE_SET=new Set(OVERRIDE_VALUES);

export function defaultState(){
  const streaks={},weekly={};
  STREAK_KEYS.forEach(k=>{streaks[k]=emptyStreak()});
  WEEK_KEYS.forEach(k=>{weekly[k]=emptyWeek()});
  return {version:STATE_VERSION,startedAt:todayStr(),mode:'personal',
    completed:{'hello-world':true,'photo-finisher':true},
    overrides:{},streaks,weekly,notes:{}};
}

export function communityDemoState(){
  return {...defaultState(),mode:'community',
    completed:{'hello-world':true,'photo-finisher':true,'knowledge-seeker':true,'discussion-debut':true,'first-wish':true}};
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
  const s={...raw,version:STATE_VERSION};
  s.streaks=migrateStreaksV1(raw.streaks);
  s.weekly=migrateWeeklyV1(raw.weekly);
  return s;
}

export function normalizeState(raw){
  if(!isObj(raw))fail('not a progress file (expected a JSON object)');
  if(!Number.isInteger(raw.version))fail('missing or invalid "version"');
  if(raw.version<1)fail('missing or invalid "version"');
  if(raw.version>STATE_VERSION)fail(`version ${raw.version} is newer than this tracker (v${STATE_VERSION}) — update the app first`);
  const s=raw.version===1?migrateV1(raw):raw;

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

  return out;
}

function readKey(key){
  try{
    const raw=localStorage.getItem(key);
    if(!raw)return null;
    return JSON.parse(raw);
  }catch(e){return null}
}

function writeState(st){
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(st))}
  catch(e){onStorageError('Could not save — storage unavailable')}
}

function load(){
  const current=readKey(STORAGE_KEY);
  if(current!==null){try{return normalizeState(current)}catch(e){}}
  const legacy=readKey(LEGACY_STORAGE_KEY);
  if(legacy!==null){
    try{
      const migrated=normalizeState(legacy);
      writeState(migrated);
      return migrated;
    }catch(e){}
  }
  return defaultState();
}

export function save(){writeState(state)}

let state=load();
export function getState(){return state}
export function getViewState(){return state.mode==='community'?communityDemoState():state}
export function replaceState(next){state=next;save()}
export function importState(raw){state=normalizeState(raw);save();return state}

export function setMode(mode){state.mode=mode;save()}
export function setOverride(badgeId,status){state.overrides[badgeId]=status;save()}
export function clearOverride(badgeId){delete state.overrides[badgeId];save()}
export function setNote(badgeId,note){state.notes[badgeId]=note;save()}
export function resetAll(){state=defaultState();save()}

export function logStreak(key,today=todayStr()){
  if(!STREAK_KEYS.includes(key))return null;
  const result=nextStreak(state.streaks[key],today);
  state.streaks[key]=result.streak;
  if(result.logged)save();
  return result.logged?state.streaks[key].current:null;
}

export function resetStreak(key){
  if(!STREAK_KEYS.includes(key))return;
  const prev=state.streaks[key];
  state.streaks[key]={...emptyStreak(),longest:prev?prev.longest:0};
  save();
}

export function logWeek(key,today=todayStr()){
  if(!WEEK_KEYS.includes(key))return null;
  const result=nextWeek(state.weekly[key],today);
  state.weekly[key]=result.week;
  if(result.logged)save();
  return result.logged?weekView(state.weekly[key],today).current:null;
}

export function resetWeek(key){
  if(!WEEK_KEYS.includes(key))return;
  const prev=state.weekly[key];
  state.weekly[key]={...emptyWeek(),longest:prev?prev.longest:0};
  save();
}
