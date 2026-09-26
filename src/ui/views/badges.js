import {BADGES,PHASES} from '../../data/badges.js';
import {isLocked,progressOf,statusOf} from '../../domain/status.js';
import {estimateMinutes,nextActionForBadge} from '../../domain/quest.js';
import {todayStr} from '../../domain/dates.js';

const STATUS_FILTERS=[
  {id:'all',label:'All'},
  {id:'available',label:'Available'},
  {id:'in_progress',label:'In progress'},
  {id:'completed',label:'Completed'},
  {id:'locked',label:'Locked'}
];

let statusFilter='all';
let phaseFilter='all';

// Route params (#/badges?phase=...) only apply when the route changes; filter
// clicks below change module state without touching the hash.
export function syncBadgesRoute(route){
  if(!route||route.view!=='badges')return;
  const st=route.params.get('status');
  const ph=route.params.get('phase');
  statusFilter=STATUS_FILTERS.some(f=>f.id===st)?st:'all';
  phaseFilter=PHASES.includes(ph)?ph:'all';
}

export function setStatusFilter(v){
  if(STATUS_FILTERS.some(f=>f.id===v))statusFilter=v;
}

export function setPhaseFilter(v){
  phaseFilter=PHASES.includes(v)?v:'all';
}

function matches(f,st,locked){
  if(f==='all')return true;
  if(f==='completed')return st==='completed';
  if(f==='in_progress')return st==='active';
  if(f==='available')return st==='not_started'&&!locked;
  if(f==='locked')return locked;
  return true;
}

function effortFor(b){
  if(b.type==='quick')return b.dur||'—';
  if(b.type==='streak')return `~${estimateMinutes(b)} min/day`;
  if(b.type==='weekly')return `~${estimateMinutes(b)} min/week`;
  return '—';
}

function rowHTML(m){
  const pill=m.locked?'locked':m.st;
  const pillText=m.locked?'locked':m.st.replace('_',' ');
  return `<button class="badge-row ${m.st}" data-open="${m.b.id}">
    <span class="num">${String(m.b.n).padStart(2,'0')}</span>
    <span class="name">${m.b.name}</span>
    <span class="bmeta">
      <span class="bphase">${m.b.phase}</span>
      <span class="status-pill ${pill}">${pillText}</span>
      <span class="bprog mono">${m.progress}</span>
      <span class="bnext">${m.next}</span>
      <span class="btime mono">${effortFor(m.b)}</span>
      <span class="bsrc" title="Requirement wording: community interpretation — see Sources"><span class="tag community">comm</span></span>
    </span>
  </button>`;
}

function emptyHTML(){
  if(statusFilter==='locked'){
    return `<div class="list-empty"><b>Nothing is locked.</b> A later streak milestone (30 / 90 days) only shows as locked while its smaller milestone in the same family is still unearned — earn the 7-day badge to open the rest. Weekly, quick and community badges are never locked. This is a tracker convention, not an AWS prerequisite.</div>`;
  }
  if(statusFilter==='completed'){
    return `<div class="list-empty"><b>No completed badges${phaseFilter!=='all'?` in ${phaseFilter}`:''} yet.</b> Complete quick badges from their detail drawer, or log streak days from Overview.</div>`;
  }
  return `<div class="list-empty">No badges match this filter${phaseFilter!=='all'?` in ${phaseFilter}`:''}.</div>`;
}

export function renderBadges(view){
  const today=todayStr();
  const models=BADGES.map(b=>({
    b,
    st:statusOf(b,view,today),
    locked:isLocked(b,view,today),
    progress:progressOf(b,view,today),
    next:nextActionForBadge(b,view,today)
  }));
  const phaseModels=phaseFilter==='all'?models:models.filter(m=>m.b.phase===phaseFilter);
  const counts={};
  STATUS_FILTERS.forEach(f=>{counts[f.id]=phaseModels.filter(m=>matches(f.id,m.st,m.locked)).length});
  const rows=phaseModels.filter(m=>matches(statusFilter,m.st,m.locked));

  document.getElementById('badgeFilters').innerHTML=`
    <div class="seg" role="group" aria-label="Filter badges by status">
      ${STATUS_FILTERS.map(f=>`<button type="button" class="seg-btn${statusFilter===f.id?' on':''}" data-filter="${f.id}" aria-pressed="${statusFilter===f.id}">${f.label}<i>${counts[f.id]}</i></button>`).join('')}
    </div>
    <label class="phase-sel">Phase <select id="phaseSelect" aria-label="Filter by phase">
      <option value="all"${phaseFilter==='all'?' selected':''}>All phases</option>
      ${PHASES.map(p=>`<option value="${p}"${phaseFilter===p?' selected':''}>${p}</option>`).join('')}
    </select></label>`;

  const head=`<div class="badge-hrow" aria-hidden="true">
    <span>#</span><span>Badge</span><span>Phase</span><span>Status</span><span>Progress</span><span>Next action</span><span>Effort</span><span>Source</span>
  </div>`;
  document.getElementById('badgeList').innerHTML=head+(rows.length?rows.map(rowHTML).join(''):emptyHTML());
}
