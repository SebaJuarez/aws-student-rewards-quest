import {formatDate} from '../../domain/dates.js';
import {timelineModel} from '../../domain/progress.js';

export function renderTimeline(view){
  const {milestones}=timelineModel(view);
  document.getElementById('timeline').innerHTML=milestones.map((m)=>`<div class="tl-step${m.reached?' reached':''}${m.now?' now':''}"><div class="d mono">${formatDate(m.date)}</div><div class="lab">${m.label}</div><div style="font-size:12px;color:var(--dim);margin-top:4px">${m.note}</div></div>`).join('');
}
