import {BADGES,PHASES} from '../../data/badges.js';
import {statusOf} from '../../domain/status.js';
import {getState} from '../../domain/store.js';

export function renderRoadmap(view){
  document.getElementById('roadmap').innerHTML = PHASES.map(ph=>{
    const items=BADGES.filter(b=>b.phase===ph);
    const done=items.filter(b=>statusOf(b,view)==='completed').length;
    const live=items.some(b=>statusOf(b,view)==='active');
    return `<div class="phase"><div class="phase-head"><div class="dot ${done===items.length?'done':(live?'live':'')}"></div><div class="name">${ph}</div><div class="count">${done}/${items.length}</div></div>
    ${items.map(b=>{const st=statusOf(b,view);return `<button class="badge-row ${st}" data-open="${b.id}">
      <span class="num">${String(b.n).padStart(2,'0')}</span>
      <span class="name">${b.name}</span>
      <span class="meta">${b.type==='streak'?getState().streaks[b.key].current+'/'+b.target+'d':b.type==='weekly'?getState().weekly[b.key].current+'/'+b.target+'w':(b.dur||'')}</span>
      <span class="status-pill ${st}">${st.replace('_',' ')}</span>
    </button>`}).join('')}
    </div>`;
  }).join('');
}
