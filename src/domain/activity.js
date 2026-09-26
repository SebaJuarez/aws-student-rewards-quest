import {addWeeks,daysBetween,isValidDateStr,normWeekKey,weekDiff,weekKeyOf} from './dates.js';

export const STREAK_KEYS=['signin','like','comment'];
export const WEEK_KEYS=['wishVote','articlePublish'];
export const OVERRIDE_VALUES=['not_started','active','completed'];

function toCount(v){
  const n=Math.floor(Number(v));
  return Number.isFinite(n)&&n>0?n:0;
}

function toNullableDate(v){
  return isValidDateStr(v)?v:null;
}

export function emptyStreak(){return {current:0,longest:0,startedAt:null,last:null}}
export function emptyWeek(){return {weeks:[],longest:0}}

export function normalizeStreak(raw){
  const s=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
  const current=toCount(s.current);
  const longest=Math.max(toCount(s.longest),current);
  return {current,longest,startedAt:toNullableDate(s.startedAt),last:toNullableDate(s.last)};
}

export function normalizeWeek(raw){
  const w=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
  const weeks=[];
  if(Array.isArray(w.weeks)){
    for(const entry of w.weeks){
      const key=normWeekKey(entry);
      if(key&&!weeks.includes(key))weeks.push(key);
    }
  }
  weeks.sort();
  return {weeks,longest:Math.max(toCount(w.longest),maxWeekRun(weeks))};
}

export function streakView(raw,today){
  const st=normalizeStreak(raw);
  const gap=st.last?daysBetween(st.last,today):null;
  const alive=gap!==null&&gap<=1;
  return {
    current:alive?st.current:0,
    longest:Math.max(st.longest,st.current),
    startedAt:alive?st.startedAt:null,
    last:st.last,
    gap,
    alive,
    loggedToday:gap===0,
    atRisk:alive&&gap===1,
    expired:gap!==null&&gap>1
  };
}

export function nextStreak(raw,today){
  const base=normalizeStreak(raw);
  if(base.last===today)return {streak:base,logged:false,reason:'duplicate'};
  const gap=base.last?daysBetween(base.last,today):null;
  if(gap!==null&&gap<1)return {streak:base,logged:false,reason:'out_of_order'};
  const current=gap===1?base.current+1:1;
  const startedAt=gap===1?(base.startedAt||base.last):today;
  return {
    streak:{current,longest:Math.max(base.longest,current),startedAt,last:today},
    logged:true,
    reason:'logged'
  };
}

export function maxWeekRun(weeks){
  let best=0,run=0,prev=null;
  for(const week of weeks){
    run=prev!==null&&weekDiff(prev,week)===1?run+1:1;
    if(run>best)best=run;
    prev=week;
  }
  return best;
}

function runEndingAt(weeks,end){
  let count=0,cursor=end;
  while(cursor!==null&&weeks.includes(cursor)){
    count+=1;
    cursor=addWeeks(cursor,-1);
  }
  return count;
}

export function weekView(raw,today){
  const w=normalizeWeek(raw);
  const thisWeek=weekKeyOf(today);
  const lastWeek=w.weeks.length?w.weeks[w.weeks.length-1]:null;
  const gap=lastWeek&&thisWeek?weekDiff(lastWeek,thisWeek):null;
  const alive=gap!==null&&gap<=1;
  const current=alive?runEndingAt(w.weeks,lastWeek):0;
  return {
    weeks:w.weeks,
    current,
    longest:Math.max(w.longest,current),
    firstWeek:w.weeks[0]||null,
    lastWeek,
    thisWeek,
    gap,
    alive,
    loggedThisWeek:w.weeks.includes(thisWeek),
    atRisk:alive&&gap===1,
    expired:gap!==null&&gap>1
  };
}

export function nextWeek(raw,today){
  const base=normalizeWeek(raw);
  const thisWeek=weekKeyOf(today);
  if(!thisWeek)return {week:base,logged:false,reason:'bad_date'};
  if(base.weeks.includes(thisWeek))return {week:base,logged:false,reason:'duplicate'};
  const weeks=[...base.weeks,thisWeek].sort();
  return {
    week:{weeks,longest:Math.max(base.longest,maxWeekRun(weeks))},
    logged:true,
    reason:'logged'
  };
}

export function weeksFromAnchor(anchor,count){
  const weeks=[];
  const start=normWeekKey(anchor);
  if(!start||count<1)return weeks;
  for(let i=count-1;i>=0;i--){
    const key=addWeeks(start,-i);
    if(key)weeks.push(key);
  }
  return weeks;
}
