import {SL} from '../../data/badges.js';
import {todayStr} from '../../domain/dates.js';

export function renderStreaks(view){
  document.getElementById('streaks').innerHTML=['signin','like','comment'].map(k=>{
    const st=view.streaks[k];
    const pct=Math.min(100,st.current/90*100);
    const risk = st.startedAt && st.last!==todayStr() && st.current<90;
    return `<div class="streak-card">
      <div class="streak-top"><span class="name">${SL[k]} streak</span><span class="nums mono">${st.current} / 90</span></div>
      <div class="bar-outer"><div class="bar-inner" style="width:${pct}%"></div></div>
      <div class="streak-sub"><span>Longest: ${st.longest}d</span><span>Milestones: 7 · 30 · 90</span></div>
      ${risk?`<div class="risk-flag">⚠ Your ${SL[k].toLowerCase()} streak is at risk today</div>`:''}
      <div class="streak-actions">
        <button class="btn primary" data-log="${k}">Log today</button>
        <button class="btn danger" data-resetstreak="${k}">Reset</button>
      </div>
    </div>`;
  }).join('');
}
