import {SOURCES,LAST_CHECKED} from '../../data/sources.js';

const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];

function fmtChecked(iso){
  const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if(!m)return iso;
  return `${MONTHS[Number(m[2])-1]} ${Number(m[3])}, ${m[1]}`;
}

function rowHTML(src){
  return `<div class="source-row">
    <div><div class="st">${src.title}</div><div class="sa">${src.author} · ${src.pub?`published ${src.pub}`:'undated page'}${src.upd?` · updated ${src.upd}`:''}</div>
    <div class="su">${src.usedFor}</div></div>
    <div class="src-side"><span class="tag ${src.type}">${src.type}</span><a href="${src.url}" target="_blank" rel="noopener">Open ↗</a></div>
  </div>`;
}

function groupHTML(title,items,note){
  return `<div class="src-group">
    <h3 class="sub-h">${title} <span class="src-count mono">${items.length}</span></h3>
    <div class="src-note">${note}</div>
    <div class="source-list">${items.map(rowHTML).join('')}</div>
  </div>`;
}

const OWN_RULES=[
 'Phase grouping (Foundation → 7-Day → 4-Week → 30-Day → Community → 90-Day) — AWS has not published an official sequence.',
 "Today's Quest priorities: at-risk streaks first, then unstarted long streaks, weekly windows, quick wins, community goals.",
 'At-risk definition: a live daily streak not yet logged today, or a live weekly streak whose current week is still open.',
 'Locked convention: a later streak milestone shows locked until its smaller milestone in the same family is earned.',
 'Effort estimates (min/day, min/week, ~5 min) and milestone read-offs from your own counters.'
];

function ownRulesHTML(){
  return `<div class="src-group">
    <h3 class="sub-h">Recommended path — this tracker's own rules <span class="src-count mono">${OWN_RULES.length}</span></h3>
    <div class="src-note">Not AWS guidance and not community claims. These are the app's own recommendation rules, applied to your local data.</div>
    <div class="source-list src-rules">${OWN_RULES.map(r=>`<div class="rule-row">${r}</div>`).join('')}</div>
  </div>`;
}

export function renderSources(){
  const official=SOURCES.filter(s=>s.type==='official');
  const community=SOURCES.filter(s=>s.type==='community');
  document.getElementById('srcGroups').innerHTML=
    groupHTML('Official AWS',official,'Only these sources feed the "AWS requirement" layer: program facts, verification flow, reward tiers and the two badge actions AWS states explicitly.')+
    groupHTML('Community Builder Center',community,'Individual-author posts — paraphrased, never copied. Each badge drawer cites exactly which of these sources synthesized that badge\'s requirement.')+
    ownRulesHTML();
  const el=document.getElementById('lastChecked');
  if(el)el.textContent=fmtChecked(LAST_CHECKED);
}
