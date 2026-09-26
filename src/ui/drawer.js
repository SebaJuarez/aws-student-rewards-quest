import {BADGES} from '../data/badges.js';
import {SOURCES,COMMUNITY_SRC} from '../data/sources.js';
import {statusOf} from '../domain/status.js';
import {getViewState,setOverride,clearOverride,setNote} from '../domain/store.js';
import {todayStr} from '../domain/dates.js';
import {streakView,weekView} from '../domain/activity.js';
import {render} from './render.js';

function progressFor(b,s,today){
  if(b.type==='streak'){
    const v=streakView(s.streaks?s.streaks[b.key]:null,today);
    const lines=[`${v.current} / ${b.target} days · longest ${v.longest}d`];
    lines.push(v.last?`last logged ${v.last}`:'no activity yet');
    if(v.startedAt)lines.push(`current run started ${v.startedAt}`);
    if(v.expired)lines.push('streak lapsed — logging today restarts it at 1');
    return `<label>Progress</label>${lines.map(l=>`<div class="mono">${l}</div>`).join('')}`;
  }
  if(b.type==='weekly'){
    const v=weekView(s.weekly?s.weekly[b.key]:null,today);
    const lines=[`${v.current} / ${b.target} weeks · longest ${v.longest}w`];
    lines.push(v.loggedThisWeek?`${v.thisWeek} logged`:`${v.thisWeek} pending`);
    lines.push(v.weeks.length?`recorded weeks: ${v.weeks.join(', ')}`:'no weeks recorded');
    if(v.expired)lines.push('streak lapsed — logging this week restarts it at 1');
    return `<label>Progress</label>${lines.map(l=>`<div class="mono">${l}</div>`).join('')}`;
  }
  return '';
}

export function openDrawer(id){
  const b=BADGES.find(x=>x.id===id); if(!b)return;
  const s=getViewState();
  const readOnly=s.mode==='community';
  const today=todayStr();
  const st=statusOf(b,s,today);
  document.getElementById('drawer').innerHTML=`
    <div class="drawer-head"><div><h3>${b.name}</h3><div class="ph mono">#${String(b.n).padStart(2,'0')} · ${b.phase}</div></div><button class="close-x" id="closeDrawer" aria-label="Close">✕</button></div>
    <label>Requirement summary</label>
    <div style="font-size:14px">${b.req}</div>
    ${progressFor(b,s,today)}
    <label>Status</label>
    <div class="status-btns">
      ${['not_started','active','completed'].map(v=>`<button data-setstatus="${v}" class="${st===v?'on':''}"${readOnly?' disabled':''}>${v.replace('_',' ')}</button>`).join('')}
      <button data-setstatus="clear"${readOnly?' disabled':''}>clear override</button>
    </div>
    ${readOnly?'<div class="verif">Community Mode shows example progress — switch to Personal Mode to record activity or overrides.</div>':''}
    <div class="verif">Requirement wording is a community interpretation, not official AWS text. Exact thresholds: <b>Verification needed</b> on AWS Builder Center.</div>
    <label>Sources</label>
    ${COMMUNITY_SRC.map(sid=>{const src=SOURCES.find(x=>x.id===sid);return `<div class="src-mini"><a href="${src.url}" target="_blank" rel="noopener">${src.title} ↗</a><div class="a">${src.author} · ${src.pub}</div></div>`}).join('')}
    <label for="noteArea">My notes</label>
    <textarea id="noteArea" placeholder="e.g. commented on X, article published Sep 29..."${readOnly?' readonly':''}>${s.notes[b.id]||''}</textarea>
  `;
  document.getElementById('overlay').classList.add('open');
  document.getElementById('drawer').classList.add('open');
  document.getElementById('closeDrawer').onclick=closeDrawer;
  document.getElementById('closeDrawer').focus();
  document.querySelectorAll('[data-setstatus]').forEach(btn=>btn.onclick=()=>{
    const v=btn.dataset.setstatus;
    if(v==='clear') clearOverride(b.id); else setOverride(b.id,v);
    render();openDrawer(id);
  });
  document.getElementById('noteArea').oninput=(e)=>{setNote(b.id,e.target.value);};
}

export function closeDrawer(){
  document.getElementById('overlay').classList.remove('open');
  document.getElementById('drawer').classList.remove('open');
}
