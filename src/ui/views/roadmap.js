import {BADGES,PHASES} from '../../data/badges.js';
import {statusOf} from '../../domain/status.js';
import {todayStr} from '../../domain/dates.js';
import {streakView,weekView} from '../../domain/activity.js';

function metaFor(b,view,today){
  if(b.type==='streak')return streakView(view.streaks?view.streaks[b.key]:null,today).current+'/'+b.target+'d';
  if(b.type==='weekly')return weekView(view.weekly?view.weekly[b.key]:null,today).current+'/'+b.target+'w';
  return b.dur||'';
}

export function renderRoadmap(view){
  const today=todayStr();
  document.getElementById('roadmap').innerHTML = PHASES.map(ph=>{
    const items=BADGES.filter(b=>b.phase===ph);
    const done=items.filter(b=>statusOf(b,view,today)==='completed').length;
    const live=items.some(b=>statusOf(b,view,today)==='active');
    return `<div class="phase"><div class="phase-head"><div class="dot ${done===items.length?'done':(live?'live':'')}"></div><div class="name">${ph}</div><div class="count">${done}/${items.length}</div></div>
    ${items.map(b=>{const st=statusOf(b,view,today);return `<button class="badge-row ${st}" data-open="${b.id}">
      <span class="num">${String(b.n).padStart(2,'0')}</span>
      <span class="name">${b.name}</span>
      <span class="meta">${metaFor(b,view,today)}</span>
      <span class="status-pill ${st}">${st.replace('_',' ')}</span>
    </button>`}).join('')}
    </div>`;
  }).join('');
}
