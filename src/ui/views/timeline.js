import {addDays,formatDate,todayStr} from '../../domain/dates.js';

export function renderTimeline(view){
  const start=view.startedAt||todayStr();
  const today=todayStr();
  const steps=[[0,'Day 1','Start all long streaks'],[6,'Day 7','7-day milestone'],[29,'Day 30','30-day milestone'],[89,'Day 90','90-day milestone']];
  document.getElementById('timeline').innerHTML=steps.map(([off,lab,note])=>{
    const d=addDays(start,off);
    const end=addDays(start,off+7);
    return `<div class="tl-step ${today>=d&&today<end?'now':''}"><div class="d mono">${formatDate(d)}</div><div class="lab">${lab}</div><div style="font-size:12px;color:var(--dim);margin-top:4px">${note}</div></div>`;
  }).join('');
}
