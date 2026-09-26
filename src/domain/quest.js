import {BADGES,SL,WL} from '../data/badges.js';
import {statusOf} from './status.js';
import {addDays,formatDate,todayStr,weekdayIndex} from './dates.js';
import {STREAK_KEYS,WEEK_KEYS,streakView,weekView} from './activity.js';

// Deterministic rule engine behind Today's Quest. No AI, no clock reads: every rule takes
// (state, today) and emits the same action for the same input. Priorities are data, not copy.
export const PRIORITY=Object.freeze({
  DAILY_AT_RISK:100,   // a daily streak dies at midnight if nothing is logged
  LONG_START:90,       // long runway activity (90-day family) never started
  WEEKLY_WINDOW:80,    // this week's window closes on Sunday
  QUICK_WIN:70,        // one-time quick badges still open
  ENGAGEMENT:60        // slower community badges
});
export const MAX_ACTIONS=5;

const ESTIMATES={signin:1,like:1,comment:2,wishVote:5,articlePublish:30};
const DEFAULT_MINUTES=2;

// ISO week runs Mon..Sun; the window relevant to a weekly badge closes on Sunday.
function endOfWeek(today){
  const wdi=weekdayIndex(today);
  return wdi===null?null:addDays(today,6-wdi);
}

function familyBadges(key){
  return BADGES.filter(b=>b.type==='streak'&&b.key===key).sort((a,b)=>a.target-b.target);
}
function weeklyBadge(key){
  return BADGES.find(b=>b.type==='weekly'&&b.key===key)||null;
}
function isDone(b,s,today){
  return statusOf(b,s,today)==='completed';
}
function everyDone(badges,s,today){
  return badges.length>0&&badges.every(b=>isDone(b,s,today));
}
function nextRequirement(badges,s,today){
  const next=badges.find(b=>!isDone(b,s,today));
  return next?next.req:null;
}
function streaksOf(s){return (s&&s.streaks)||{}}
function weeksOf(s){return (s&&s.weekly)||{}}

function dailyAtRisk(s,today,out){
  STREAK_KEYS.forEach(key=>{
    const badges=familyBadges(key);
    if(everyDone(badges,s,today))return;
    const v=streakView(streaksOf(s)[key],today);
    if(!v.atRisk)return;
    const maxTarget=badges.length?badges[badges.length-1].target:90;
    out.push({
      id:`risk-${key}`,
      type:'risk',
      reason:'daily-at-risk',
      priority:PRIORITY.DAILY_AT_RISK,
      title:`Log today's ${SL[key].toLowerCase()}`,
      description:`Keeps your ${SL[key].toLowerCase()} streak alive - log it before the day ends.`,
      relatedBadges:badges.map(b=>b.id),
      estimatedMinutes:ESTIMATES[key]!==undefined?ESTIMATES[key]:DEFAULT_MINUTES,
      deadline:today,
      risk:'high',
      status:`Day ${v.current} of ${maxTarget} - not logged today`,
      requirement:nextRequirement(badges,s,today),
      basis:'recommended'
    });
  });
}

function longRunwayStarts(s,today,out){
  STREAK_KEYS.forEach(key=>{
    const badges=familyBadges(key);
    if(everyDone(badges,s,today))return;
    const v=streakView(streaksOf(s)[key],today);
    if(v.current>0)return; // a live run is not a "start"; dailyAtRisk covers its risk
    const longest=badges.length?badges[badges.length-1]:null;
    out.push({
      id:`start-${key}`,
      type:'start',
      reason:'long-runway',
      priority:PRIORITY.LONG_START,
      title:`Start the ${longest?longest.target:90}-day ${SL[key].toLowerCase()} streak today`,
      description:'Starting today gives you the longest possible runway.',
      relatedBadges:badges.map(b=>b.id),
      estimatedMinutes:ESTIMATES[key]!==undefined?ESTIMATES[key]:DEFAULT_MINUTES,
      deadline:null,
      risk:null,
      status:v.last?`Lapsed ${v.gap} days ago - best run ${v.longest} days`:'Not started yet',
      requirement:nextRequirement(badges,s,today),
      basis:'recommended'
    });
  });
}

function weeklyWindows(s,today,out){
  const sunday=endOfWeek(today);
  WEEK_KEYS.forEach(key=>{
    const badge=weeklyBadge(key);
    const v=weekView(weeksOf(s)[key],today);
    if(badge&&isDone(badge,s,today)&&!v.alive)return;
    if(v.loggedThisWeek)return;
    const target=badge?badge.target:4;
    const keepingRun=v.atRisk; // a live run whose current week is still open
    out.push({
      id:`weekly-${key}`,
      type:'weekly',
      reason:'weekly-window',
      priority:PRIORITY.WEEKLY_WINDOW,
      title:keepingRun?`Log this week's ${WL[key].toLowerCase()}`:`Start the ${target}-week ${WL[key].toLowerCase()} streak this week`,
      description:keepingRun?`Keeps your ${WL[key].toLowerCase()} run alive.`:'Log once this week to open a fresh run.',
      relatedBadges:badge?[badge.id]:[],
      estimatedMinutes:ESTIMATES[key]!==undefined?ESTIMATES[key]:DEFAULT_MINUTES,
      deadline:sunday,
      risk:keepingRun?'medium':null,
      status:`${v.current>0?`Week ${v.current} / ${target}`:`0 / ${target} weeks`} - window closes ${formatDate(sunday)}`,
      requirement:badge?badge.req:null,
      progress:{current:v.current,target,label:v.current>0?`Week ${v.current} / ${target}`:`0 / ${target} weeks`},
      basis:'recommended'
    });
  });
}

function quickWins(s,today,out){
  BADGES.filter(b=>b.type==='quick'&&!isDone(b,s,today)).forEach(b=>{
    const minutes=/(\d+)/.exec(b.dur||'');
    out.push({
      id:`quick-${b.id}`,
      type:'quick_win',
      reason:'quick-win',
      priority:PRIORITY.QUICK_WIN,
      title:`Complete "${b.name}"`,
      description:'One-time win - finish it once and it stays earned.',
      relatedBadges:[b.id],
      estimatedMinutes:minutes?Number(minutes[1]):null,
      deadline:null,
      risk:null,
      status:'Not completed yet',
      requirement:b.req,
      basis:'recommended'
    });
  });
}

function engagementGoals(s,today,out){
  BADGES.filter(b=>b.type==='community'&&!isDone(b,s,today)).forEach(b=>{
    out.push({
      id:`engage-${b.id}`,
      type:'engagement',
      reason:'engagement',
      priority:PRIORITY.ENGAGEMENT,
      title:`Work toward "${b.name}"`,
      description:'Longer-term community goal - no daily deadline, no streak to lose.',
      relatedBadges:[b.id],
      estimatedMinutes:null,
      deadline:null,
      risk:null,
      status:'Not completed yet',
      requirement:b.req,
      basis:'recommended'
    });
  });
}

export function getNextBestActions(s,today=todayStr()){
  const acts=[];
  dailyAtRisk(s,today,acts);
  longRunwayStarts(s,today,acts);
  weeklyWindows(s,today,acts);
  quickWins(s,today,acts);
  engagementGoals(s,today,acts);
  const seen=new Set();
  const unique=acts.filter(a=>{if(seen.has(a.id))return false;seen.add(a.id);return true});
  unique.sort((a,b)=>b.priority-a.priority); // stable: rule order breaks ties
  return unique.slice(0,MAX_ACTIONS);
}

// Per-badge effort estimate for dense list views. null = no honest estimate (community).
export function estimateMinutes(b){
  if(b.type==='streak'||b.type==='weekly')return ESTIMATES[b.key]!==undefined?ESTIMATES[b.key]:DEFAULT_MINUTES;
  if(b.type==='quick'){
    const m=/(\d+)/.exec(b.dur||'');
    return m?Number(m[1]):null;
  }
  return null;
}

// The single next step for one badge, derived from the same views the quest engine
// uses (never re-deriving rules in a view). '—' means nothing is left to do.
export function nextActionForBadge(b,s,today=todayStr()){
  if(statusOf(b,s,today)==='completed')return '—';
  if(b.type==='streak'){
    const v=streakView(streaksOf(s)[b.key],today);
    if(v.atRisk)return 'Log today';
    if(v.loggedToday)return 'Log again tomorrow';
    if(v.expired)return 'Restart today';
    return 'Start today';
  }
  if(b.type==='weekly'){
    const v=weekView(weeksOf(s)[b.key],today);
    if(v.loggedThisWeek)return 'Logged this week';
    if(v.atRisk)return 'Log this week';
    if(v.expired)return 'Restart this week';
    return 'Log this week';
  }
  if(b.type==='quick')return 'Open & complete';
  return 'Open & track';
}

// Only real, objective risk: a run that dies if today/this week closes untouched.
// Never lists what merely has not been started - there is nothing to lose yet.
export function getAtRiskItems(s,today=todayStr()){
  const items=[];
  const sunday=endOfWeek(today);
  STREAK_KEYS.forEach(key=>{
    const badges=familyBadges(key);
    if(everyDone(badges,s,today))return;
    const v=streakView(streaksOf(s)[key],today);
    if(!v.atRisk)return;
    items.push({
      id:`risk-${key}`,
      kind:'streak',
      priority:PRIORITY.DAILY_AT_RISK,
      label:`${SL[key]} streak`,
      value:`${v.current} day${v.current===1?'':'s'}`,
      deadline:today,
      copy:`Log today's ${SL[key].toLowerCase()} before the day ends.`
    });
  });
  WEEK_KEYS.forEach(key=>{
    const badge=weeklyBadge(key);
    const v=weekView(weeksOf(s)[key],today);
    if(badge&&isDone(badge,s,today)&&!v.alive)return;
    if(!v.atRisk)return;
    items.push({
      id:`weekly-${key}`,
      kind:'week',
      priority:PRIORITY.WEEKLY_WINDOW,
      label:`${WL[key]} streak`,
      value:`${v.current} week${v.current===1?'':'s'}`,
      deadline:sunday,
      copy:`Log this week's ${WL[key].toLowerCase()} before Sunday (${formatDate(sunday)}) to keep the run alive.`
    });
  });
  return items;
}
