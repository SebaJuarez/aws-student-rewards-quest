import {addDays,daysBetween,isValidDateStr,todayStr} from './dates.js';

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
