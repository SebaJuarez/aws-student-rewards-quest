import {WL} from '../../data/badges.js';
import {todayStr} from '../../domain/dates.js';
import {WEEK_KEYS,weekView} from '../../domain/activity.js';

export function renderWeekly(view){
  const today=todayStr();
  const readOnly=view.mode==='community';
  document.getElementById('weekly').innerHTML=WEEK_KEYS.map(k=>{
    const v=weekView(view.weekly?view.weekly[k]:null,today);
    const pct=Math.min(100,v.current/4*100);
    const thisLabel=v.loggedThisWeek?'This week: logged':(v.gap===1?`Pending for ${v.thisWeek}`:(v.lastWeek?`Last logged: ${v.lastWeek}`:'No weeks yet'));
    return `<div class="streak-card">
      <div class="streak-top"><span class="name">${WL[k]} streak</span><span class="nums mono">${v.current} / 4 weeks</span></div>
      <div class="bar-outer"><div class="bar-inner" style="width:${pct}%"></div></div>
      <div class="streak-sub"><span>Longest: ${v.longest}w</span><span>${thisLabel}</span></div>
      ${v.atRisk?`<div class="risk-flag">⚠ Log this week (${v.thisWeek}) to keep the streak</div>`:''}
      ${v.expired?`<div class="risk-flag">⚠ Streak lapsed after ${v.lastWeek} — log this week to restart from 1</div>`:''}
      <div class="streak-actions">
        <button class="btn${v.loggedThisWeek?'':' primary'}" data-logweek="${k}"${readOnly||v.loggedThisWeek?' disabled':''}>${v.loggedThisWeek?'✓ Logged this week':'Log this week'}</button>
        <button class="btn danger" data-resetweek="${k}"${readOnly?' disabled':''}>Reset</button>
      </div>
    </div>`;
  }).join('');
}
