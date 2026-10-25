import {addDays,addWeeks,daysBetween,isValidDateStr,todayStr,weekEndDate} from './dates.js';
import {BADGES} from '../data/badges.js';
import {STREAK_KEYS,WEEK_KEYS,streakView,weekView} from './activity.js';
import {completedCount,statusOf} from './status.js';
import {getNextBestActions} from './quest.js';

export function levelFor(c){if(c>=21)return'Badge Master';if(c>=14)return'Community Builder';if(c>=7)return'Streak Builder';if(c>=2)return'Cloud Initiate';return'Newcomer'}
export function nextMilestone(c){if(c<7)return{n:7,label:'7 badges → $10 credits'};if(c<14)return{n:14,label:'14 badges → +$20 credits'};if(c<21)return{n:21,label:'21 badges → cert voucher'};return{n:21,label:'All 21 complete'}}
export function dayNumber(s,today=todayStr()){
  if(!s||!s.startedAt)return 1;
  const diff=daysBetween(s.startedAt,today);
  return diff===null?1:Math.max(1,diff+1);
}

const MILESTONE_STEPS=[
  {off:0,label:'Day 1',note:'Start all long streaks'},
  {off:6,label:'Day 7',note:'7-day milestone'},
  {off:29,label:'Day 30',note:'30-day milestone'},
  {off:89,label:'Day 90',note:'90-day milestone'}
];

export function timelineModel(s,today=todayStr()){
  const start=s&&isValidDateStr(s.startedAt)?s.startedAt:today;
  const milestones=MILESTONE_STEPS.map(step=>{
    const date=addDays(start,step.off);
    return {
      off:step.off,
      label:step.label,
      note:step.note,
      date,
      day:step.off+1,
      reached:date!==null&&today>=date,
      now:date!==null&&today>=date&&today<addDays(date,7)
    };
  });
  return {start,today,day:dayNumber(s,today),milestones};
}

// Derive whether the user is on their first run (no completed badges, no overrides and empty activityLog).
// No schema change or storage writes needed.
export function isFirstRun(s){
  if(!s)return true;
  const completedCount=s.completed?Object.keys(s.completed).filter(k=>s.completed[k]).length:0;
  const overridesCount=s.overrides?Object.keys(s.overrides).length:0;
  const logCount=s.activityLog?Object.keys(s.activityLog).length:0;
  return completedCount===0&&overridesCount===0&&logCount===0;
}

// Projection: all upcoming streak/weekly milestone candidates that can be stated honestly right now —
// only for runs already logged today/this week (nothing is projected from a lapsed run),
// and never for badges the user pinned with a manual override.
export function projectedCandidates(s,today){
  const candidates=[];
  const pinned=s&&s.overrides?s.overrides:{};
  const streaks=s&&s.streaks?s.streaks:{};
  STREAK_KEYS.forEach(key=>{
    const v=streakView(streaks[key],today);
    if(!v.loggedToday||v.current<1)return;
    BADGES.filter(b=>b.type==='streak'&&b.key===key&&!pinned[b.id]&&statusOf(b,s,today)!=='completed').forEach(b=>{
      const date=addDays(today,b.target-v.current);
      if(date)candidates.push({date,badge:b.id,name:b.name,n:b.n});
    });
  });
  const weekly=s&&s.weekly?s.weekly:{};
  WEEK_KEYS.forEach(key=>{
    const v=weekView(weekly[key],today);
    if(!v.loggedThisWeek||v.current<1)return;
    const badge=BADGES.find(b=>b.type==='weekly'&&b.key===key);
    if(!badge||pinned[badge.id]||statusOf(badge,s,today)==='completed')return;
    const weekKey=addWeeks(v.thisWeek,badge.target-v.current);
    const date=weekEndDate(weekKey);
    if(date)candidates.push({date,badge:badge.id,name:badge.name,n:badge.n});
  });
  candidates.sort((a,b)=>a.date.localeCompare(b.date)||a.n-b.n);
  return candidates;
}

function nextBadgeDate(s,today){
  const candidates=projectedCandidates(s,today);
  return candidates.length?candidates[0]:null;
}

// Helper behind the quest summary line: next reward, how many badges are missing for it,
// the earliest projected milestone date (null when nothing can be projected) and the top
// recommended actions.
export function rewardProgress(s,today=todayStr()){
  const completed=completedCount(s,today);
  const next=nextMilestone(completed);
  const candidates=projectedCandidates(s,today);
  const milestone=candidates.length?candidates[0]:null;
  const remainingToNext=Math.max(0,next.n-completed);
  const targetBadges=candidates.slice(0,remainingToNext);
  const projectedRewardDate=candidates.length>=remainingToNext&&remainingToNext>0?candidates[remainingToNext-1].date:null;
  const actionsNeeded=getNextBestActions(s,today);
  return {
    completed,
    total:BADGES.length,
    remaining:Math.max(0,BADGES.length-completed),
    remainingToNext,
    next,
    milestoneDate:milestone?milestone.date:null,
    milestoneBadge:milestone?milestone.badge:null,
    milestoneName:milestone?milestone.name:null,
    projectedBadges:candidates,
    targetBadges,
    projectedRewardDate,
    actionsNeeded
  };
}
