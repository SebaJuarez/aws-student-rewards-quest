import {SOURCES} from '../../data/sources.js';

export function renderSources(){
  document.getElementById('sources').innerHTML=SOURCES.map(src=>`<div class="source-row">
    <div><div class="st">${src.title}</div><div class="sa">${src.author} · ${src.pub}${src.upd?' · updated '+src.upd:''}</div></div>
    <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end"><span class="tag ${src.type}">${src.type}</span><a href="${src.url}" target="_blank" rel="noopener">Open ↗</a></div>
  </div>`).join('');
}
