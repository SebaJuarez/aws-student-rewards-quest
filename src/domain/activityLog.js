import {addDays,daysBetween,formatMonth,isValidDateStr,todayStr,weekKeyOf,weekdayIndex} from './dates.js';
import {
  STREAK_KEYS,WEEK_KEYS,emptyStreak,emptyWeek,nextStreak,nextWeek,
  normalizeStreak,normalizeWeek,streakView
} from './activity.js';
import {timelineModel} from './progress.js';

export const DAILY_KEYS=STREAK_KEYS;
export const WEEKLY_LOG_KEYS=WEEK_KEYS;
export const ACTIVITY_KEYS=[...DAILY_KEYS,...WEEKLY_LOG_KEYS];

const HEAT_WINDOW=90;
const LOSS_THRESHOLD=7;

export function emptyLog(){return {}}

export function normalizeLog(raw){
  if(raw===undefined||raw===null)return {};
  if(typeof raw!=='object'||Array.isArray(raw))failLog('"activityLog" must be an object of days');
  const out={};
  for(const date of Object.keys(raw)){
    if(!isValidDateStr(date))failLog(`activityLog has an invalid date "${date}" (expected YYYY-MM-DD)`);
    const entry=raw[date];
    if(entry===undefined||entry===null)continue;
    if(typeof entry!=='object'||Array.isArray(entry))failLog(`activityLog.${date} must be an object of activities`);
    const day={};
    for(const key of ACTIVITY_KEYS){
      if(entry[key])day[key]=true;
    }
    if(Object.keys(day).length)out[date]=day;
  }
  return out;
}
function failLog(msg){throw new Error(msg)}

export function hasActivity(log,date,key){
  return Boolean(log&&log[date]&&log[date][key])
}

export function dayKeys(log,date){
  const day=log?log[date]:null;
  if(!day)return [];
  return ACTIVITY_KEYS.filter(key=>day[key]);
}

export function daysWith(log,key){
  if(!log)return [];
  const days=Object.keys(log).filter(date=>log[date]&&log[date][key]);
  days.sort();
  return days;
}

export function countActivities(log){
  let n=0;
  if(!log)return n;
  for(const date of Object.keys(log)){
    n+=dayKeys(log,date).length;
  }
  return n;
}

export function activeDayCount(log){
  if(!log)return 0;
  return Object.keys(log).filter(date=>dayKeys(log,date).length>0).length;
}

// Active days within an inclusive date range — feeds the timeline's
// "days logged by then" stats. String comparison is safe for YYYY-MM-DD.
export function activeDaysInRange(log,from,to){
  if(!log||!from||!to||from>to)return 0;
  return Object.keys(log).filter(date=>date>=from&&date<=to&&dayKeys(log,date).length>0).length;
}

export function writeActivity(log,date,key){
  if(!ACTIVITY_KEYS.includes(key)||!isValidDateStr(date))return log;
  if(hasActivity(log,date,key))return log;
  const day={...(log[date]||{}),[key]:true};
  const ordered={};
  for(const k of ACTIVITY_KEYS)if(day[k])ordered[k]=true;
  return {...log,[date]:ordered};
}

export function clearActivity(log,key){
  if(!ACTIVITY_KEYS.includes(key))return log;
  const out={};
  for(const date of Object.keys(log||{})){
    const day={...log[date]};
    delete day[key];
    if(Object.keys(day).length)out[date]=day;
  }
  return out;
}

export function logHasWeek(log,key,week){
  return daysWith(log,key).some(date=>weekKeyOf(date)===week);
}

// Rebuild the cached daily streaks from the log. The log is the source of truth for the
// run itself; `longest` and a `last` (only when the log has no day for that activity)
// survive from the stored baseline so records and legacy display are never lost.
export function rebuildStreaks(log,prev){
  const out={};
  for(const key of STREAK_KEYS){
    const base=normalizeStreak(prev?prev[key]:null);
    const days=daysWith(log,key);
    if(!days.length){
      out[key]={current:0,longest:base.longest,startedAt:null,last:base.last};
      continue;
    }
    let streak=emptyStreak();
    for(const date of days)streak=nextStreak(streak,date).streak;
    out[key]={
      current:streak.current,
      longest:Math.max(base.longest,streak.longest),
      startedAt:streak.startedAt,
      last:streak.last
    };
  }
  return out;
}

// Rebuild the cached weekly streaks from the log. Weeks that only exist in the stored
// baseline (logged before the activity log existed, so no day is known) are kept.
export function rebuildWeekly(log,prev){
  const out={};
  for(const key of WEEK_KEYS){
    const base=normalizeWeek(prev?prev[key]:null);
    let week=emptyWeek();
    for(const date of daysWith(log,key))week=nextWeek(week,date).week;
    const weeks=[...new Set([...base.weeks,...week.weeks])];
    out[key]=normalizeWeek({weeks,longest:Math.max(base.longest,week.longest)});
  }
  return out;
}

export function activitySummary(s,today=todayStr()){
  const log=s&&s.activityLog?s.activityLog:{};
  const last7=[];
  for(let i=6;i>=0;i--){
    const date=addDays(today,-i);
    if(date)last7.push({date,keys:dayKeys(log,date)});
  }
  const recentDates=Object.keys(log).filter(date=>date<=today).sort().reverse();
  const totals={};
  ACTIVITY_KEYS.forEach(key=>{totals[key]=daysWith(log,key).length});
  return {
    today:{date:today,keys:dayKeys(log,today)},
    last7,
    recent:recentDates.slice(0,10).map(date=>({date,keys:dayKeys(log,date)})),
    totals,
    total:countActivities(log),
    activeDays:activeDayCount(log),
    last7Total:last7.reduce((n,day)=>n+day.keys.length,0)
  };
}

function runLengthEndingOn(set,date){
  let count=0;
  let cursor=date;
  while(cursor&&set.has(cursor)){
    count+=1;
    cursor=addDays(cursor,-1);
  }
  return count;
}

// 90 day cells grouped into week columns (Mon-Sun), one state per day:
// active (with activity count), milestone (Day 1 / 7 / 30 / 90 date), lost (the day a
// run of >= 7 days ended - only once that day has passed; a run whose deadline is
// today is still alive and shows as risk instead) and risk (today still has an
// at-risk streak).
export function heatmapModel(s,today=todayStr()){
  const log=s&&s.activityLog?s.activityLog:{};
  const {milestones}=timelineModel(s,today);
  const milestoneByDate={};
  milestones.forEach(m=>{if(m.date)milestoneByDate[m.date]=m.label});

  const atRisk=DAILY_KEYS.some(key=>streakView(s&&s.streaks?s.streaks[key]:null,today).atRisk);

  const lostOn={};
  DAILY_KEYS.forEach(key=>{
    const set=new Set(daysWith(log,key));
    set.forEach(date=>{
      const next=addDays(date,1);
      if(!next||set.has(next))return;
      if(next===today)return; // the run ends today at the earliest - that is risk, not loss
      if(runLengthEndingOn(set,date)<LOSS_THRESHOLD)return;
      if(!lostOn[next])lostOn[next]=[];
      lostOn[next].push(key);
    });
  });

  const start=addDays(today,-(HEAT_WINDOW-1));
  const byDate={};
  if(start){
    for(let i=HEAT_WINDOW-1;i>=0;i--){
      const date=addDays(today,-i);
      if(!date)continue;
      const keys=dayKeys(log,date);
      byDate[date]={
        date,
        keys,
        active:keys.length>0,
        count:keys.length,
        milestone:milestoneByDate[date]||null,
        lost:lostOn[date]||[],
        risk:date===today&&atRisk,
        today:date===today
      };
    }
  }

  const columns=[];
  if(start){
    const gridStart=addDays(start,-weekdayIndex(start));
    const gridEnd=addDays(today,6-weekdayIndex(today));
    const cols=Math.ceil((daysBetween(gridStart,gridEnd)+1)/7);
    let prevMonth=null;
    for(let c=0;c<cols;c++){
      const colStart=addDays(gridStart,c*7);
      const month=formatMonth(colStart);
      const label=month!==prevMonth?month:'';
      prevMonth=month;
      const cells=[];
      for(let r=0;r<7;r++){
        const date=addDays(colStart,r);
        const cell=date?byDate[date]:null;
        cells.push(cell||{date,outside:true});
      }
      columns.push({label,cells});
    }
  }

  return {start,today,window:HEAT_WINDOW,columns,byDate};
}


export function personalRecords(s){
  const state=s||{};
  const streaks=state.streaks||{};
  const weekly=state.weekly||{};
  const log=state.activityLog||{};

  const longest={
    signin:Number(streaks.signin?.longest)||0,
    like:Number(streaks.like?.longest)||0,
    comment:Number(streaks.comment?.longest)||0,
    wishVote:Number(weekly.wishVote?.longest)||0,
    articlePublish:Number(weekly.articlePublish?.longest)||0
  };

  const weekCounts={};
  for(const date of Object.keys(log)){
    const w=weekKeyOf(date);
    if(!w)continue;
    const count=dayKeys(log,date).length;
    weekCounts[w]=(weekCounts[w]||0)+count;
  }

  let bestWeek=null;
  for(const [w,count] of Object.entries(weekCounts)){
    if(!bestWeek||count>bestWeek.count){
      bestWeek={week:w,count};
    }
  }

  return {
    longest,
    bestWeek,
    totalActiveDays:activeDayCount(log),
    totalActivities:countActivities(log)
  };
}
