import {BADGES,SL,WL} from '../data/badges.js';
import {statusOf} from './status.js';
import {todayStr} from './dates.js';
import {STREAK_KEYS,WEEK_KEYS,streakView,weekView} from './activity.js';

export function getNextBestActions(s,today=todayStr()){
  const acts=[];
  const streak=(k)=>streakView(s&&s.streaks?s.streaks[k]:null,today);
  const week=(k)=>weekView(s&&s.weekly?s.weekly[k]:null,today);

  STREAK_KEYS.forEach(k=>{
    const v=streak(k);
    if(v.atRisk&&v.current<90)acts.push({risk:true,txt:`Keep your ${SL[k]} streak alive — log today's activity`,why:badgesForStreak(k)});
  });
  WEEK_KEYS.forEach(k=>{
    const v=week(k);
    if(v.atRisk)acts.push({risk:true,txt:`Log this week's ${WL[k].toLowerCase()} to keep the 4-week streak alive`,why:badgesForWeek(k)});
  });
  STREAK_KEYS.forEach(k=>{
    if(!streak(k).alive)acts.push({go:true,txt:`Start your ${SL[k]} streak today`,why:badgesForStreak(k)});
  });
  BADGES.filter(b=>b.type==='quick' && statusOf(b,s,today)!=='completed').forEach(b=>acts.push({txt:`Complete "${b.name}"`,why:[b.name]}));
  WEEK_KEYS.forEach(k=>{
    if(!week(k).alive)acts.push({go:true,txt:`Start your ${WL[k].toLowerCase()} streak this week`,why:badgesForWeek(k)});
  });
  BADGES.filter(b=>b.type==='community' && statusOf(b,s,today)!=='completed').forEach(b=>acts.push({txt:`Work toward "${b.name}"`,why:[b.name]}));
  return acts.slice(0,5);
}
function badgesForStreak(k){return BADGES.filter(b=>b.type==='streak'&&b.key===k).map(b=>b.name)}
function badgesForWeek(k){return BADGES.filter(b=>b.type==='weekly'&&b.key===k).map(b=>b.name)}
