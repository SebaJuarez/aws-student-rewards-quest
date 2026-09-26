import {getNextBestActions,getAtRiskItems} from '../../domain/quest.js';
import {rewardProgress} from '../../domain/progress.js';
import {BADGES} from '../../data/badges.js';
import {formatDate,todayStr} from '../../domain/dates.js';

const GLYPH={risk:'!',start:'▶',weekly:'↻',quick_win:'↗',engagement:'◆'};
const MARK={risk:'risk',start:'go',weekly:'go'};

function badgeNames(ids){
  return ids.map(id=>{
    const b=BADGES.find(x=>x.id===id);
    return b?b.name:id;
  }).join(', ');
}

function timeLabel(minutes){
  return minutes===null?'flexible':`~${minutes} min`;
}

function summaryLine(rp,actions){
  let line=`next reward: ${rp.next.label} · ${rp.remainingToNext} to go`;
  if(rp.milestoneDate)line+=` · ${rp.milestoneName} by ${formatDate(rp.milestoneDate)}`;
  line+=` · ${actions.length} action${actions.length===1?'':'s'}`;
  return `<div class="quest-sum mono">${line}</div>`;
}

function riskBlock(items){
  if(!items.length)return '';
  const rows=items.map(r=>`
    <div class="risk-item">
      <div class="risk-row"><span>${r.label}</span><span class="rval">${r.value}</span></div>
      <div class="rcopy">${r.copy}</div>
    </div>`).join('');
  return `<div class="risk-block"><div class="risk-head">AT RISK</div>${rows}</div>`;
}

function actionItem(a){
  return `
    <div class="quest-item" data-priority="${a.priority}">
      <div class="qmark ${MARK[a.type]||''}">${GLYPH[a.type]||'·'}</div>
      <div class="qbody">
        <div class="qrow"><span class="txt">${a.title}</span><span class="qtime">${timeLabel(a.estimatedMinutes)}</span></div>
        <div class="why">${a.description}</div>
        <div class="qmeta"><b>personal</b>${a.status}</div>
        ${a.requirement?`<div class="qmeta"><b>aws req</b>${a.requirement}</div>`:''}
        <div class="why">Contributes to: ${badgeNames(a.relatedBadges)}</div>
      </div>
    </div>`;
}

export function renderQuest(view){
  const today=todayStr();
  const actions=getNextBestActions(view,today);
  const atRisk=getAtRiskItems(view,today);
  const rp=rewardProgress(view,today);
  const head=summaryLine(rp,actions);
  if(!actions.length){
    document.getElementById('questCard').innerHTML=head+`
      <div class="quest-empty">
        <div class="ac-title">ALL CLEAR</div>
        No streaks are at risk today. Check the roadmap for your next optional quest.
      </div>`;
    return;
  }
  document.getElementById('questCard').innerHTML=head+riskBlock(atRisk)+actions.map(actionItem).join('');
}
