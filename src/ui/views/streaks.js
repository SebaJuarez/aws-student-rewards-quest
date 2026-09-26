import {SL} from '../../data/badges.js';
import {formatDate,todayStr} from '../../domain/dates.js';
import {STREAK_KEYS,streakView} from '../../domain/activity.js';

export function renderStreaks(view){
  const today=todayStr();
  const readOnly=view.mode==='community';
  document.getElementById('streaks').innerHTML=STREAK_KEYS.map(k=>{
    const v=streakView(view.streaks?view.streaks[k]:null,today);
    const pct=Math.min(100,v.current/90*100);
    const lastLabel=v.last?`Last: ${formatDate(v.last)}`:'Not started yet';
    return `<div class="streak-card">
      <div class="streak-top"><span class="name">${SL[k]} streak</span><span class="nums mono">${v.current} / 90</span></div>
      <div class="bar-outer"><div class="bar-inner" style="width:${pct}%"></div></div>
      <div class="streak-sub"><span>Longest: ${v.longest}d</span><span>${lastLabel}</span></div>
      ${v.atRisk?`<div class="risk-flag">⚠ Your ${SL[k].toLowerCase()} streak is at risk today</div>`:''}
      ${v.expired?`<div class="risk-flag">⚠ Streak lapsed — log today to restart from 1</div>`:''}
      <div class="streak-actions">
        <button class="btn${v.loggedToday?'':' primary'}" data-log="${k}"${readOnly||v.loggedToday?' disabled':''}>${v.loggedToday?'✓ Logged today':'Log today'}</button>
        <button class="btn danger" data-resetstreak="${k}"${readOnly?' disabled':''}>Reset</button>
      </div>
    </div>`;
  }).join('');
}
