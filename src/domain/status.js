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
