import {daysBetween,todayStr} from './dates.js';

export function levelFor(c){if(c>=21)return'Badge Master';if(c>=14)return'Community Builder';if(c>=7)return'Streak Builder';if(c>=2)return'Cloud Initiate';return'Newcomer'}
export function nextMilestone(c){if(c<7)return{n:7,label:'7 badges → $10 credits'};if(c<14)return{n:14,label:'14 badges → +$20 credits'};if(c<21)return{n:21,label:'21 badges → cert voucher'};return{n:21,label:'All 21 complete'}}
export function dayNumber(s,today=todayStr()){
  if(!s||!s.startedAt)return 1;
  const diff=daysBetween(s.startedAt,today);
  return diff===null?1:Math.max(1,diff+1);
}
