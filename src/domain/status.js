import {BADGES} from '../data/badges.js';
import {todayStr} from './dates.js';
import {OVERRIDE_VALUES,streakView,weekView} from './activity.js';

const OVERRIDE_SET=new Set(OVERRIDE_VALUES);

function milestoneStatus(current,target){
  if(current>=target)return 'completed';
  if(current>0)return 'active';
  return 'not_started';
}

export function statusOf(b,s,today=todayStr()){
  if(!s)return 'not_started';
  const ov=s.overrides?s.overrides[b.id]:undefined;
  if(ov&&OVERRIDE_SET.has(ov))return ov;
  if(b.type==='quick'||b.type==='community')return s.completed&&s.completed[b.id]?'completed':'not_started';
  if(b.type==='streak'){
    const v=streakView(s.streaks?s.streaks[b.key]:null,today);
    return milestoneStatus(v.current,b.target);
  }
  if(b.type==='weekly'){
    const v=weekView(s.weekly?s.weekly[b.key]:null,today);
    return milestoneStatus(v.current,b.target);
  }
  return 'not_started';
}

export function completedCount(s,today=todayStr()){
  return BADGES.filter(b=>statusOf(b,s,today)==='completed').length;
}

// Compact progress label for dense list views: progress toward THIS badge, capped
// at its own target. Streak and weekly badges show their position on the current
// run; one-time badges collapse to 0/1 or 1/1.
export function progressOf(b,s,today=todayStr()){
  if(!s)return '0/'+(b.target||1);
  if(b.type==='streak'){
    const v=streakView(s.streaks?s.streaks[b.key]:null,today);
    return Math.min(v.current,b.target)+'/'+b.target+'d';
  }
  if(b.type==='weekly'){
    const v=weekView(s.weekly?s.weekly[b.key]:null,today);
    return Math.min(v.current,b.target)+'/'+b.target+'w';
  }
  return statusOf(b,s,today)==='completed'?'1/1':'0/1';
}

// A later milestone of a streak family is locked while a smaller one of the same
// family is still unearned (nothing can be lost yet, so weekly/quick/community
// badges are never locked). This is a UI affordance, not an AWS prerequisite claim.
export function isLocked(b,s,today=todayStr()){
  if(!s||b.type!=='streak')return false;
  if(statusOf(b,s,today)!=='not_started')return false;
  const smaller=BADGES.filter(x=>x.type==='streak'&&x.key===b.key&&x.target<b.target);
  return smaller.some(x=>statusOf(x,s,today)!=='completed');
}
