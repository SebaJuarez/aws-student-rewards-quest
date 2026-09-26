import {SOURCES} from '../../data/sources.js';

function rowHTML(src){
  return `<div class="source-row">
    <div><div class="st">${src.title}</div><div class="sa">${src.author} · published ${src.pub}${src.upd?` · updated ${src.upd}`:''}</div></div>
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

export function renderSources(){
  const official=SOURCES.filter(s=>s.type==='official');
  const community=SOURCES.filter(s=>s.type==='community');
  document.getElementById('srcGroups').innerHTML=
    groupHTML('Official AWS',official,'Program existence, student verification and reward tiers are confirmed against this source.')+
    groupHTML('Community Builder Center',community,'Practical badge interpretations — paraphrased, never copied. Per-badge requirement wording stays community-level.');
}
