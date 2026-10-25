import {BADGES} from '../../data/badges.js';
import {SOURCES} from '../../data/sources.js';
import {isLocked,statusOf} from '../../domain/status.js';
import {getAtRiskItems} from '../../domain/quest.js';
import {rewardProgress,isFirstRun} from '../../domain/progress.js';
import {activitySummary} from '../../domain/activityLog.js';
import {formatDate,todayStr} from '../../domain/dates.js';
import {streakView,weekView} from '../../domain/activity.js';

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

export function renderOnboarding(view){
  const el=document.getElementById('onboardingCard');
  if(!el)return;
  if(!isFirstRun(view)){
    el.innerHTML='';
    return;
  }
  const s1=SOURCES.find(s=>s.id==='s1');
  const s8=SOURCES.find(s=>s.id==='s8');
  const foundationBadges=BADGES.filter(b=>b.phase==='Foundation');

  el.innerHTML=`
    <div class="onboarding-card">
      <div class="onboarding-section">
        <div class="onboarding-head">
          <span class="tag official">AWS Requirement</span>
          <span class="onboarding-subtitle mono">Confirmed official prerequisites</span>
        </div>
        <p class="onboarding-desc">Before earning badge rewards, AWS requires two prerequisites. Complete them directly on AWS Builder Center:</p>
        <div class="onboarding-reqs">
          <div class="onboarding-req-item">
            <span class="req-step-num mono">1</span>
            <div class="req-step-body">
              <div class="req-step-title">SheerID Student Verification <span class="tag official">Confirmed AWS fact</span></div>
              <div class="req-step-desc">Verify your active student status via SheerID on AWS Builder Center to unlock Student Rewards eligibility.</div>
              ${s1?`<div class="req-step-cite"><a href="${s1.url}" target="_blank" rel="noopener noreferrer">Source: ${s1.title} ↗</a></div>`:''}
            </div>
          </div>
          <div class="onboarding-req-item">
            <span class="req-step-num mono">2</span>
            <div class="req-step-body">
              <div class="req-step-title">Complete Builder Center Profile <span class="tag official">Confirmed AWS fact</span></div>
              <div class="req-step-desc">Fill out your Builder Center profile's About section and upload a profile photo.</div>
              ${s8?`<div class="req-step-cite"><a href="${s8.url}" target="_blank" rel="noopener noreferrer">Source: ${s8.title} ↗</a></div>`:''}
            </div>
          </div>
        </div>
      </div>

      <div class="onboarding-divider"></div>

      <div class="onboarding-section">
        <div class="onboarding-head">
          <span class="tag community">Recommended Path</span>
          <span class="onboarding-subtitle mono">This tracker's opinionated first steps</span>
        </div>
        <p class="onboarding-desc">Start your quest with these 3 quick-win foundation badges and your daily habit:</p>
        <div class="onboarding-steps">
          ${foundationBadges.map(b=>`
            <div class="onboarding-step-card">
              <div class="onboarding-step-main">
                <span class="step-badge-n mono">${String(b.n).padStart(2,'0')}</span>
                <div class="step-badge-info">
                  <div class="step-badge-name">${b.name} <span class="step-badge-dur mono">${b.dur||''}</span></div>
                  <div class="step-badge-req">${b.req}</div>
                </div>
              </div>
              <button type="button" class="btn q-cta" data-open="${b.id}">Open badge ↗</button>
            </div>
          `).join('')}
        </div>
      </div>
    </div>`;
}

export function renderOverviewStreaks(view){
  const el=document.getElementById('overviewStreaks');
  if(!el)return;
  const today=todayStr();

  const streakRows=[
    {
      key:'signin',
      name:'Sign-in',
      isWeek:false,
      view:streakView(view.streaks?view.streaks.signin:null,today)
    },
    {
      key:'like',
      name:'Like',
      isWeek:false,
      view:streakView(view.streaks?view.streaks.like:null,today)
    },
    {
      key:'comment',
      name:'Comment',
      isWeek:false,
      view:streakView(view.streaks?view.streaks.comment:null,today)
    },
    {
      key:'wishVote',
      name:'Wish vote',
      isWeek:true,
      view:weekView(view.weekly?view.weekly.wishVote:null,today)
    },
    {
      key:'articlePublish',
      name:'Article',
      isWeek:true,
      view:weekView(view.weekly?view.weekly.articlePublish:null,today)
    }
  ];

  const rowsHtml=streakRows.map(r=>{
    const v=r.view;
    let target, currentStr, longestStr, pct;
    if(r.isWeek){
      target=4;
      currentStr=`${v.current} / 4w`;
      longestStr=`${v.longest}w`;
      pct=Math.min(100,Math.round((v.current/4)*100));
    }else{
      target=v.current<7?7:(v.current<30?30:90);
      currentStr=`${v.current} / ${target}d`;
      longestStr=`${v.longest}d`;
      pct=Math.min(100,Math.round((v.current/target)*100));
    }

    let stateHtml;
    if(r.isWeek){
      if(v.loggedThisWeek){
        stateHtml=`<span class="status-pill completed"><i aria-hidden="true">&#10003;</i> Logged this week</span>`;
      }else if(v.atRisk){
        stateHtml=`<span class="status-pill at_risk"><i aria-hidden="true">&#9888;</i> At risk</span>`;
      }else if(v.expired){
        stateHtml=`<span class="status-pill lost"><i aria-hidden="true">&#10005;</i> Lost</span>`;
      }else{
        stateHtml=`<span class="status-pill not_started"><i aria-hidden="true">&#9675;</i> Not started</span>`;
      }
    }else{
      if(v.loggedToday){
        stateHtml=`<span class="status-pill completed"><i aria-hidden="true">&#10003;</i> Logged today</span>`;
      }else if(v.atRisk){
        stateHtml=`<span class="status-pill at_risk"><i aria-hidden="true">&#9888;</i> At risk</span>`;
      }else if(v.expired){
        stateHtml=`<span class="status-pill lost"><i aria-hidden="true">&#10005;</i> Lost</span>`;
      }else{
        stateHtml=`<span class="status-pill not_started"><i aria-hidden="true">&#9675;</i> Not started</span>`;
      }
    }

    return `
      <tr class="st-row">
        <td class="st-name">${r.name}</td>
        <td class="st-prog">
          <div class="st-prog-wrap">
            <div class="bar-outer st-bar"><div class="bar-inner${pct>=100?' done':''}" style="width:${pct}%"></div></div>
            <span class="st-nums mono">${currentStr}</span>
          </div>
        </td>
        <td class="st-longest mono">${longestStr}</td>
        <td class="st-state">${stateHtml}</td>
      </tr>`;
  }).join('');

  el.innerHTML=`
    <div class="streak-table-wrap">
      <table class="streak-table" aria-label="Streaks progress and live status">
        <thead>
          <tr>
            <th scope="col">Streak</th>
            <th scope="col">Next Milestone</th>
            <th scope="col">Longest</th>
            <th scope="col">State</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>`;
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
  const target=rp.next.n;
  const pct=Math.min(100,Math.round((rp.completed/target)*100));

  let badgesHtml='';
  if(rp.targetBadges&&rp.targetBadges.length>0){
    badgesHtml=`
      <div class="milestone-badges-list">
        <div class="strip-sub-title mono">Projected toward ${rp.next.label}:</div>
        <ul class="strip-badge-items">
          ${rp.targetBadges.map(b=>`<li><span class="strip-badge-name">${b.name}</span> <span class="mono strip-badge-date">by ${formatDate(b.date)}</span></li>`).join('')}
        </ul>
        ${rp.projectedRewardDate?`<div class="strip-proj-date mono">Projected tier date: <b>${formatDate(rp.projectedRewardDate)}</b></div>`:''}
      </div>`;
  }

  return `<div class="strip-panel">
    <div class="strip-head">NEXT MILESTONE</div>
    <div class="strip-tier-row">
      <span class="tier-label"><b>${rp.next.label}</b></span>
      <span class="mono tier-count">${rp.completed} / ${target} badges</span>
    </div>
    <div class="bar-outer strip-tier-bar">
      <div class="bar-inner${pct>=100?' done':''}" style="width:${pct}%"></div>
    </div>
    <div class="strip-sub mono">${rp.remainingToNext>0?`${rp.remainingToNext} to go`:'All 21 completed!'}</div>
    ${rp.milestoneName?`
      <div class="strip-main" style="margin-top:10px">
        <b>${rp.milestoneName}</b>
        <span class="mono">projected by ${formatDate(rp.milestoneDate)}</span>
      </div>
      <div class="strip-note mono" style="font-size:10.5px">Projected by tracker from active streaks</div>
    `:''}
    ${badgesHtml}
    ${!rp.milestoneDate?`<div class="strip-note">Log today (or this week) to project dates. Nothing is projected from lapsed runs.</div>`:''}
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
  const el=document.getElementById('recentActivity');
  if(!el)return;
  const sum=activitySummary(view,todayStr());
  const recent=sum.recent.slice(0,5);
  const html=recent.length
    ? `<ul class="act-recent">${recent.map(d=>`<li><span class="mono">${formatDate(d.date)}</span><span class="act-tags">${d.keys.map(k=>`<span class="act-tag">${KEY_LABEL[k]||k}</span>`).join('')}</span></li>`).join('')}</ul>`
    : `<div class="quest-empty">No activity recorded yet — open Activity to log today. Nothing is ever backfilled.</div>`;
  el.innerHTML=html+`<div class="view-link-row"><a class="view-link" href="#/activity">Open Activity →</a></div>`;
}
