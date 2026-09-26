import {BADGES} from '../../data/badges.js';
import {isLocked,statusOf} from '../../domain/status.js';
import {getAtRiskItems} from '../../domain/quest.js';
import {rewardProgress} from '../../domain/progress.js';
import {activitySummary} from '../../domain/activityLog.js';
import {formatDate,todayStr} from '../../domain/dates.js';

const KEY_LABEL={signin:'Sign-in',like:'Like',comment:'Comment',wishVote:'Wish',articlePublish:'Article'};

const STAGES=[
  {name:'Foundation',phases:['Foundation']},
  {name:'Consistency',phases:['7-Day Streaks','4-Week Consistency','30-Day Streaks']},
  {name:'Community',phases:['Community Engagement']},
  {name:'Endgame',phases:['90-Day Endgame']}
];

function phaseModel(ph,view,today){
  const items=BADGES.filter(b=>b.phase===ph);
  const done=items.filter(b=>statusOf(b,view,today)==='completed').length;
  const live=items.some(b=>statusOf(b,view,today)==='active');
  return {ph,items,done,live,pct:Math.round(done/items.length*100)};
}

function stageModel(stg,view,today){
  const phases=stg.phases.map(ph=>phaseModel(ph,view,today));
  const items=phases.flatMap(m=>m.items);
  const done=items.filter(b=>statusOf(b,view,today)==='completed').length;
  const live=items.some(b=>statusOf(b,view,today)==='active');
  return {stg,phases,done,live,total:items.length};
}

function riskPanel(items){
  if(!items.length){
    return `<div class="strip-panel"><div class="strip-head">AT RISK</div>
      <div class="strip-clear">Nothing at risk today — no run closes before you can log it.</div></div>`;
  }
  return `<div class="strip-panel is-risk"><div class="strip-head risk">AT RISK</div>
    ${items.map(r=>`<div class="risk-item">
      <div class="risk-row"><span>${r.label}</span><span class="rval">${r.value}</span></div>
      <div class="rcopy">${r.copy}</div>
    </div>`).join('')}</div>`;
}

function milestonePanel(rp){
  return `<div class="strip-panel">
    <div class="strip-head">NEXT MILESTONE</div>
    <div class="strip-main"><b>${rp.milestoneName||'Nothing projected yet'}</b>${rp.milestoneDate?`<span class="mono">by ${formatDate(rp.milestoneDate)}</span>`:''}</div>
    <div class="strip-sub mono">next reward: ${rp.next.label} · ${rp.remainingToNext} to go</div>
    ${rp.milestoneDate?'':`<div class="strip-note">Log today (or this week) to project a date.</div>`}
  </div>`;
}

export function renderStatusStrip(view){
  const today=todayStr();
  const items=getAtRiskItems(view,today);
  const rp=rewardProgress(view,today);
  document.getElementById('statusStrip').innerHTML=riskPanel(items)+milestonePanel(rp);
}

export function renderRoadmapPreview(view){
  const today=todayStr();
  const stages=STAGES.map(stg=>stageModel(stg,view,today));
  const html=stages.map(sm=>{
    const state=sm.done===sm.total?'done':(sm.live||sm.done>0?'live':'todo');
    const phases=sm.phases.map(pm=>{
      const nodes=pm.items.map(b=>{
        const st=statusOf(b,view,today);
        const locked=isLocked(b,view,today);
        return `<span class="bnode ${locked?'locked':st}" title="${b.name}">${String(b.n).padStart(2,'0')}</span>`;
      }).join('');
      return `<a class="phase-preview" href="#/badges?phase=${encodeURIComponent(pm.ph)}">
        <div class="phase-head"><div class="dot ${pm.done===pm.items.length?'done':(pm.live?'live':'')}"></div><div class="name">${pm.ph}</div><div class="count">${pm.done}/${pm.items.length}</div></div>
        <div class="phase-nodes" aria-hidden="true">${nodes}</div>
        <div class="bar-outer"><div class="bar-inner${pm.pct===100?' done':''}" style="width:${pm.pct}%"></div></div>
      </a>`;
    }).join('');
    return `<div class="qstage">
      <span class="qnode ${state}" aria-hidden="true"></span>
      <div class="qstage-head"><span class="qstage-name">${sm.stg.name}</span><span class="rule"></span><span class="qstage-count">${sm.done}/${sm.total}</span></div>
      <div class="qstage-body">${phases}</div>
    </div>`;
  }).join('');
  document.getElementById('roadmapPreview').innerHTML=`
    <div class="preview-grid quest-map">${html}</div>
    <div class="view-link-row"><a class="view-link" href="#/badges">Open all 21 badges →</a></div>`;
}

export function renderRecentActivity(view){
  const sum=activitySummary(view,todayStr());
  const recent=sum.recent.slice(0,5);
  const html=recent.length
    ? `<ul class="act-recent">${recent.map(d=>`<li><span class="mono">${formatDate(d.date)}</span><span class="act-tags">${d.keys.map(k=>`<span class="act-tag">${KEY_LABEL[k]||k}</span>`).join('')}</span></li>`).join('')}</ul>`
    : `<div class="quest-empty">No activity recorded yet — open Activity to log today. Nothing is ever backfilled.</div>`;
  document.getElementById('recentActivity').innerHTML=html+`<div class="view-link-row"><a class="view-link" href="#/activity">Open Activity →</a></div>`;
}
