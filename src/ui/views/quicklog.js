import {ACTIVITY_KEYS,WEEKLY_LOG_KEYS,activitySummary} from '../../domain/activityLog.js';
import {todayStr,weekKeyOf} from '../../domain/dates.js';

export const QUICKLOG_LABELS={
  signin:'Sign-in',
  like:'Like',
  comment:'Comment',
  wishVote:'Wish vote',
  articlePublish:'Article'
};

export function buildQuickLogPills(view, today=todayStr()){
  const readOnly=view&&view.mode==='community';
  const sum=activitySummary(view,today);
  const week=weekKeyOf(today);

  return ACTIVITY_KEYS.map((key)=>{
    const label=QUICKLOG_LABELS[key]||key;
    const doneToday=sum.today.keys.includes(key);
    const weekly=WEEKLY_LOG_KEYS.includes(key);
    const doneWeek=weekly&&((view.weekly&&view.weekly[key]&&view.weekly[key].weeks)||[]).includes(week);

    if(doneToday){
      return `<span class="apill on"><i aria-hidden="true">&#10003;</i>${label}</span>`;
    }
    if(doneWeek){
      return `<span class="apill on week"><i aria-hidden="true">&#10003;</i>${label}<em>this week</em></span>`;
    }
    if(readOnly){
      return `<button type="button" class="apill" disabled title="Demo state is read-only — switch to Personal Mode to log"><i aria-hidden="true">&#9675;</i>${label}<em>${weekly?'week':'log'}</em></button>`;
    }
    return `<button type="button" class="apill act" data-${weekly?'logweek':'log'}="${key}"><i aria-hidden="true">&#9675;</i>${label}<em>${weekly?'log week':'log'}</em></button>`;
  }).join('');
}

export function renderQuickLog(view){
  const el=document.getElementById('quickLog');
  if(!el)return;
  const today=todayStr();
  const sum=activitySummary(view,today);
  const pills=buildQuickLogPills(view,today);

  el.innerHTML=`
    <div class="act-today quick-log-bar">
      <div class="act-today-head">
        <span class="mono">${sum.today.keys.length} of ${ACTIVITY_KEYS.length} logged today</span>
        <span class="mono quick-log-hint">1 tap to record · undone anytime</span>
      </div>
      <div class="apills">${pills}</div>
    </div>`;
}
