import {getNextBestActions} from '../../domain/quest.js';
import {BADGES} from '../../data/badges.js';

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

function summaryLine(n){
  return `<div class="quest-sum mono">${n} action${n===1?'':'s'} · ranked by what matters most today</div>`;
}

function actionItem(a){
  return `
    <div class="quest-item" data-priority="${a.priority}">
      <div class="qmark ${MARK[a.type]||''}">${GLYPH[a.type]||'·'}</div>
      <div class="qbody">
        <div class="qrow"><span class="txt">${a.title}</span><span class="qtime">${timeLabel(a.estimatedMinutes)}</span></div>
        <div class="why">${a.description}</div>
        <div class="qmeta"><b>personal</b>${a.status}</div>
        ${a.requirement?`<div class="qmeta"><b>badge req</b>${a.requirement}</div>`:''}
        <div class="why">Contributes to: ${badgeNames(a.relatedBadges)}</div>
      </div>
    </div>`;
}

export function renderQuest(view){
  const actions=getNextBestActions(view);
  if(!actions.length){
    document.getElementById('questCard').innerHTML=`
      <div class="quest-empty">
        <div class="ac-title">ALL CLEAR</div>
        No streaks are at risk today. Check Badges for your next optional quest.
      </div>`;
    return;
  }
  document.getElementById('questCard').innerHTML=summaryLine(actions.length)+actions.map(actionItem).join('');
}
