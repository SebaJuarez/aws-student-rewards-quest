import {getNextBestActions} from '../../domain/quest.js';
import {BADGES,SL} from '../../data/badges.js';
import {esc} from '../escape.js';

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

function renderCta(a, readOnly){
  const disabled=readOnly?' disabled title="Demo state is read-only — switch to Personal Mode to log"':'';
  if(a.key && (a.type==='risk' || a.type==='start')){
    const label=SL[a.key]?SL[a.key].toLowerCase():'today';
    return `<button class="btn primary q-cta" data-log="${a.key}"${disabled}>✓ Log ${label}</button>`;
  }
  if(a.key && a.type==='weekly'){
    return `<button class="btn primary q-cta" data-logweek="${a.key}"${disabled}>✓ Log this week</button>`;
  }
  const badgeId=(a.relatedBadges && a.relatedBadges[0])||a.badgeId;
  if(badgeId){
    return `<button class="btn q-cta" data-open="${badgeId}"${disabled}>Open badge ↗</button>`;
  }
  return '';
}

function actionItem(a, readOnly){
  const cta=renderCta(a, readOnly);
  return `
    <div class="quest-item" data-priority="${a.priority}">
      <div class="qmark ${MARK[a.type]||''}">${GLYPH[a.type]||'·'}</div>
      <div class="qbody">
        <div class="qrow">
          <span class="txt">${esc(a.title)}</span>
          <div class="qactions">
            <span class="qtime mono">${timeLabel(a.estimatedMinutes)}</span>
            ${cta}
          </div>
        </div>
        <div class="why">${esc(a.description)}</div>
        <div class="qmeta-row">
          <span class="qmeta-status mono">${esc(a.status)}</span>
          <details class="q-why" data-key="why-${a.id}">
            <summary>Why this?</summary>
            <div class="q-why-body">
              <div class="qmeta"><b>personal</b>${esc(a.status)}</div>
              ${a.requirement?`<div class="qmeta"><b>badge req</b>${esc(a.requirement)}</div>`:''}
              <div class="why">Contributes to: ${esc(badgeNames(a.relatedBadges))}</div>
            </div>
          </details>
        </div>
      </div>
    </div>`;
}

export function renderQuest(view){
  const actions=getNextBestActions(view);
  const readOnly=view&&view.mode==='community';
  if(!actions.length){
    document.getElementById('questCard').innerHTML=`
      <div class="quest-empty">
        <div class="ac-title">✓ ALL DONE FOR TODAY</div>
        <p class="ac-copy">Nothing left on your quest today — come back tomorrow to keep your daily runs alive, or check the Badges tab to explore optional goals at your own pace.</p>
      </div>`;
    return;
  }
  document.getElementById('questCard').innerHTML=summaryLine(actions.length)+actions.map(a=>actionItem(a, readOnly)).join('');
}
