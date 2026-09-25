import {BADGES,SL} from '../data/badges.js';
import {statusOf} from './status.js';
import {todayStr} from './dates.js';

export function getNextBestActions(s){
  const today=todayStr(),acts=[];
  ['signin','like','comment'].forEach(k=>{
    const st=s.streaks[k];
    if(st.startedAt && st.last!==today && st.current<90){
      acts.push({risk:true,txt:`Keep your ${SL[k]} streak alive — log today's activity`,why:badgesForStreak(k)});
    }
  });
  ['signin','like','comment'].forEach(k=>{
    if(!s.streaks[k].startedAt){
      acts.push({risk:false,go:true,txt:`Start your ${SL[k]} streak today`,why:badgesForStreak(k)});
    }
  });
  BADGES.filter(b=>b.type==='quick' && statusOf(b,s)!=='completed').forEach(b=>acts.push({txt:`Complete "${b.name}"`,why:[b.name]}));
  BADGES.filter(b=>b.type==='weekly' && statusOf(b,s)==='not_started').forEach(b=>acts.push({go:true,txt:`Start "${b.name}" this week`,why:[b.name]}));
  BADGES.filter(b=>b.type==='community' && statusOf(b,s)!=='completed').forEach(b=>acts.push({txt:`Work toward "${b.name}"`,why:[b.name]}));
  return acts.slice(0,5);
}
function badgesForStreak(k){return BADGES.filter(b=>b.type==='streak'&&b.key===k).map(b=>b.name)}
