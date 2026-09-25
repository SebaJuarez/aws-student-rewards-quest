import {addDays,fmt,todayStr} from '../../domain/dates.js';

export function renderTimeline(view){
  const day1=new Date(view.startedAt);
  const steps=[[0,'Day 1','Start all long streaks'],[6,'Day 7','7-day milestone'],[29,'Day 30','30-day milestone'],[89,'Day 90','90-day milestone']];
  const today=new Date(todayStr());
  document.getElementById('timeline').innerHTML=steps.map(([off,lab,note])=>{
    const d=addDays(day1,off);
    return `<div class="tl-step ${today>=d&&today<addDays(day1,off+7)?'now':''}"><div class="d mono">${fmt(d)}</div><div class="lab">${lab}</div><div style="font-size:12px;color:var(--dim);margin-top:4px">${note}</div></div>`;
  }).join('');
}
