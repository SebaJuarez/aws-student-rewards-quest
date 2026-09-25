import {BADGES} from '../data/badges.js';
import {SOURCES,COMMUNITY_SRC} from '../data/sources.js';
import {statusOf} from '../domain/status.js';
import {getState,setOverride,clearOverride,setNote} from '../domain/store.js';
import {render} from './render.js';

export function openDrawer(id){
  const b=BADGES.find(x=>x.id===id); if(!b)return;
  const s=getState();
  const st=statusOf(b,s);
  let progressHtml='';
  if(b.type==='streak'){const sd=s.streaks[b.key];progressHtml=`<label>Progress</label><div class="mono">${sd.current} / ${b.target} days · longest ${sd.longest}d · started ${sd.startedAt||'not started'}</div>`;}
  if(b.type==='weekly'){const wd=s.weekly[b.key];progressHtml=`<label>Progress</label><div class="mono">${wd.current} / ${b.target} weeks · started ${wd.startedAt||'not started'}</div>`;}
  document.getElementById('drawer').innerHTML=`
    <div class="drawer-head"><div><h3>${b.name}</h3><div class="ph mono">#${String(b.n).padStart(2,'0')} · ${b.phase}</div></div><button class="close-x" id="closeDrawer" aria-label="Close">✕</button></div>
    <label>Requirement summary</label>
    <div style="font-size:14px">${b.req}</div>
    ${progressHtml}
    <label>Status</label>
    <div class="status-btns">
      ${['not_started','active','completed'].map(v=>`<button data-setstatus="${v}" class="${st===v?'on':''}">${v.replace('_',' ')}</button>`).join('')}
      <button data-setstatus="clear">clear override</button>
    </div>
    <div class="verif">Requirement wording is a community interpretation, not official AWS text. Exact thresholds: <b>Verification needed</b> on AWS Builder Center.</div>
    <label>Sources</label>
    ${COMMUNITY_SRC.map(sid=>{const src=SOURCES.find(x=>x.id===sid);return `<div class="src-mini"><a href="${src.url}" target="_blank" rel="noopener">${src.title} ↗</a><div class="a">${src.author} · ${src.pub}</div></div>`}).join('')}
    <label for="noteArea">My notes</label>
    <textarea id="noteArea" placeholder="e.g. commented on X, article published Sep 29...">${s.notes[b.id]||''}</textarea>
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
