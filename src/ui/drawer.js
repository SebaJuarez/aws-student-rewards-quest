import {BADGES,SL} from '../data/badges.js';
import {SOURCES} from '../data/sources.js';
import {statusOf} from '../domain/status.js';
import {getViewState,setOverride,clearOverride,setNote} from '../domain/store.js';
import {todayStr} from '../domain/dates.js';
import {streakView,weekView} from '../domain/activity.js';
import {estimateMinutes,nextActionForBadge} from '../domain/quest.js';
import {render} from './render.js';

const srcById=id=>SOURCES.find(x=>x.id===id);

function progressLines(b,s,today){
  if(b.type==='streak'){
    const v=streakView(s.streaks?s.streaks[b.key]:null,today);
    const lines=[`${v.current} / ${b.target} days · longest ${v.longest}d`];
    lines.push(v.last?`last logged ${v.last}`:'no activity yet');
    if(v.startedAt)lines.push(`current run started ${v.startedAt}`);
    if(v.expired)lines.push('streak lapsed — logging today restarts it at 1');
    return lines.map(l=>`<div class="mono">${l}</div>`).join('');
  }
  if(b.type==='weekly'){
    const v=weekView(s.weekly?s.weekly[b.key]:null,today);
    const lines=[`${v.current} / ${b.target} weeks · longest ${v.longest}w`];
    lines.push(v.loggedThisWeek?`${v.thisWeek} logged`:`${v.thisWeek} pending`);
    lines.push(v.weeks.length?`recorded weeks: ${v.weeks.join(', ')}`:'no weeks recorded');
    if(v.expired)lines.push('streak lapsed — logging this week restarts it at 1');
    return lines.map(l=>`<div class="mono">${l}</div>`).join('');
  }
  const done=statusOf(b,s,today)==='completed';
  return `<div class="mono">${done?'1 / 1 completed':'0 / 1 — not completed yet'}</div>`;
}

function pathLines(b){
  const lines=[`phase: ${b.phase} — recommended grouping, not an AWS sequence`];
  if(b.type==='streak'){
    lines.push(`family: one continuous ${SL[b.key].toLowerCase()} run — this badge is its ${b.target}-day milestone`);
    lines.push(`effort: ~${estimateMinutes(b)} min/day habit`);
    lines.push('cadence: consecutive days — a skipped day restarts the run at 1');
  }else if(b.type==='weekly'){
    lines.push(`window: log once per ISO week (Mon–Sun) — ${b.target} straight weeks`);
    lines.push(`effort: ~${estimateMinutes(b)} min/week`);
    lines.push('cadence: consecutive weeks — a skipped week restarts the run at 1');
  }else if(b.type==='quick'){
    lines.push('kind: one-time — earn once, it stays earned');
    if(b.dur)lines.push(`effort: ${b.dur}`);
  }else{
    lines.push('kind: longer-term community goal — no daily deadline, nothing to lose');
    lines.push('effort: no fixed estimate');
  }
  return lines.map(l=>`<div class="mono">${l}</div>`).join('');
}

function nextActionHTML(b,s,today){
  const action=nextActionForBadge(b,s,today);
  const done=action==='—';
  const text=done?'Nothing to do — badge completed.':action;
  return `<div class="next-action${done?' done':''}">${text}</div>`;
}

function awsRequirementHTML(b){
  const faq=srcById('s8');
  const blog=srcById('s1');
  if(b.official){
    return `<div class="req official">${b.official}</div>
      <div class="src-kinds mono">source: <a href="${faq.url}" target="_blank" rel="noopener">${faq.title} ↗</a></div>`;
  }
  return `<div class="req">Program confirmed by AWS (AWS News Blog, 24 Aug 2026): Student Rewards spans 21 badges with reward tiers at 7 / 14 / 21.</div>
    <div class="src-kinds mono">source: <a href="${blog.url}" target="_blank" rel="noopener">${blog.title} ↗</a></div>
    <div class="verif">Per-badge requirement wording: <b>Verification needed</b> — AWS has not published exact wording for this badge.</div>`;
}

function viewSourceHTML(entry){
  const src=srcById(entry.id); if(!src)return '';
  return `<details class="src-view">
    <summary><span class="vs-btn">View source</span><span class="vs-id mono">${src.id} · ${src.author}</span></summary>
    <div class="sv-body">
      <div class="sv-title">${src.title}</div>
      <div class="sv-meta mono">${src.author} · ${src.pub?`published ${src.pub}`:'undated page'} · ${src.upd?`updated ${src.upd} · `:''}type: ${src.type}</div>
      <div class="sv-url"><a href="${src.url}" target="_blank" rel="noopener">${src.url} ↗</a></div>
      <div class="sv-part"><b>Synthesized for this badge:</b> ${entry.part}</div>
    </div>
  </details>`;
}

function communitySynthesisHTML(b){
  const n=b.sources.length;
  return `<div class="req">${b.req}</div>
    <div class="src-kinds mono">community synthesis — paraphrased from ${n} source${n===1?'':'s'}, never copied or quoted</div>
    ${b.sources.map(viewSourceHTML).join('')}`;
}

export function openDrawer(id){
  const b=BADGES.find(x=>x.id===id); if(!b)return;
  const s=getViewState();
  const readOnly=s.mode==='community';
  const today=todayStr();
  const st=statusOf(b,s,today);
  document.getElementById('drawer').innerHTML=`
    <div class="drawer-head"><div><h3>${b.name}</h3><div class="ph mono">#${String(b.n).padStart(2,'0')} · ${b.phase}</div></div><button class="close-x" id="closeDrawer" aria-label="Close">✕</button></div>
    <label>AWS requirement</label>
    ${awsRequirementHTML(b)}
    <label>Community synthesis</label>
    ${communitySynthesisHTML(b)}
    <label>Recommended path</label>
    <div class="path-lines">${pathLines(b)}</div>
    <label>Your progress</label>
    ${progressLines(b,s,today)}
    <div class="sub-cap mono">manual status override</div>
    <div class="status-btns" role="group" aria-label="Manual status override">
      ${['not_started','active','completed'].map(v=>`<button data-setstatus="${v}" class="${st===v?'on':''}"${readOnly?' disabled':''}>${v==='not_started'?'Not started':v[0].toUpperCase()+v.slice(1)}</button>`).join('')}
      <button data-setstatus="clear"${readOnly?' disabled':''}>Clear override</button>
    </div>
    ${readOnly?'<div class="verif">Community Mode shows example progress — switch to Personal Mode to record activity or overrides.</div>':''}
    <label>Next action</label>
    ${nextActionHTML(b,s,today)}
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
