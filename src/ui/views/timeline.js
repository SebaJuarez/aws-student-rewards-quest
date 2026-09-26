import {formatDate,todayStr,daysBetween} from '../../domain/dates.js';
import {timelineModel} from '../../domain/progress.js';
import {activeDaysInRange} from '../../domain/activityLog.js';

export function renderTimeline(view){
  const today=todayStr();
  const model=timelineModel(view,today);
  const log=view&&view.activityLog?view.activityLog:{};

  document.getElementById('tlMeta').textContent=`started ${formatDate(model.start)} · today ${formatDate(today)} · day ${model.day}`;

  document.getElementById('timeline').innerHTML=model.milestones.map(step=>{
    let foot;
    if(step.reached){
      const n=activeDaysInRange(log,model.start,step.date);
      foot=`${n} active day${n===1?'':'s'} logged by then`;
    }else{
      const away=daysBetween(today,step.date);
      foot=away===null?'—':(away<=0?'today':`${away} day${away===1?'':'s'} away`);
    }
    return `<div class="tl-step${step.reached?' reached':''}${step.now?' now':''}">
      <div class="d mono">${formatDate(step.date)}</div>
      <div class="lab">${step.label}</div>
      <div class="tl-note">${step.note}</div>
      <div class="tl-days mono">${foot}</div>
    </div>`;
  }).join('');

  const logged=activeDaysInRange(log,model.start,today);
  document.getElementById('tlFoot').innerHTML=`<div class="tl-foot">
    <span class="mono">${logged} active day${logged===1?'':'s'} logged since day 1</span>
    <a href="#/activity">See the full record in Activity →</a>
  </div>`;
}
