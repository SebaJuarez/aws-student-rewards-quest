import {BADGES} from '../data/badges.js';

export function statusOf(b,s){
  const ov=s.overrides[b.id];
  if(ov)return ov;
  if(b.type==='quick'||b.type==='community')return s.completed[b.id]?'completed':'not_started';
  if(b.type==='streak'){const st=s.streaks[b.key];return st.current>=b.target?'completed':(st.startedAt?'active':'not_started');}
  if(b.type==='weekly'){const w=s.weekly[b.key];return w.current>=b.target?'completed':(w.startedAt?'active':'not_started');}
}
export function completedCount(s){return BADGES.filter(b=>statusOf(b,s)==='completed').length}
