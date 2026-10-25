import {getState,getViewState} from '../domain/store.js';
import {renderHeader} from './views/header.js';
import {renderHero} from './views/hero.js';
import {renderOnboarding,renderOverviewStreaks,renderRoadmapPreview,renderStatusStrip} from './views/overview.js';
import {renderQuickLog} from './views/quicklog.js';
import {renderQuest} from './views/quest.js';
import {renderBadges} from './views/badges.js';
import {renderStreaks} from './views/streaks.js';
import {renderWeekly} from './views/weekly.js';
import {renderActivity} from './views/activity.js';
import {renderTimeline} from './views/timeline.js';
import {renderRewards} from './views/rewards.js';
import {renderSources} from './views/sources.js';
import {renderSettings} from './views/settings.js';

function getFocusInfo(){
  if(typeof document==='undefined'||!document.activeElement)return null;
  const el=document.activeElement;
  if(el===document.body||el===document.documentElement)return null;

  let selector=null;
  if(el.id){
    const escId=window.CSS&&CSS.escape?CSS.escape(el.id):el.id;
    selector=`#${escId}`;
  }else{
    const DATA_ATTRS=['data-key','data-log','data-logweek','data-open','data-filter','data-heat','data-nav','data-resetstreak','data-resetweek','data-setstatus'];
    for(const attr of DATA_ATTRS){
      if(el.hasAttribute(attr)){
        const val=el.getAttribute(attr);
        const escVal=window.CSS&&CSS.escape?CSS.escape(val):val;
        const base=`[${attr}="${escVal}"]`;
        const parent=el.parentElement&&el.parentElement.closest('[id]');
        if(parent&&parent.id){
          const pId=window.CSS&&CSS.escape?CSS.escape(parent.id):parent.id;
          selector=`#${pId} ${base}`;
        }else{
          selector=base;
        }
        break;
      }
    }
  }

  let selection=null;
  if(el.tagName==='TEXTAREA'||(el.tagName==='INPUT'&&typeof el.selectionStart==='number')){
    try{
      selection={start:el.selectionStart,end:el.selectionEnd,direction:el.selectionDirection};
    }catch(_){}
  }

  return selector?{selector,selection}:null;
}

function getOpenDetails(){
  if(typeof document==='undefined')return [];
  const openKeys=[];
  try{
    const openEls=document.querySelectorAll('details[open]');
    openEls.forEach(el=>{
      if(el.dataset&&el.dataset.key){
        const escKey=window.CSS&&CSS.escape?CSS.escape(el.dataset.key):el.dataset.key;
        openKeys.push(`details[data-key="${escKey}"]`);
      }else if(el.id){
        const escId=window.CSS&&CSS.escape?CSS.escape(el.id):el.id;
        openKeys.push(`details#${escId}`);
      }
    });
  }catch(_){}
  return openKeys;
}

function restoreOpenDetails(keys){
  if(!keys||!keys.length)return;
  for(const sel of keys){
    try{
      const el=document.querySelector(sel);
      if(el&&el.tagName==='DETAILS'){
        el.open=true;
      }
    }catch(_){}
  }
}

function restoreFocus(focusInfo){
  if(!focusInfo||!focusInfo.selector)return;
  try{
    const el=document.querySelector(focusInfo.selector);
    if(el&&typeof el.focus==='function'){
      el.focus({preventScroll:true});
      if(focusInfo.selection&&typeof el.setSelectionRange==='function'){
        try{
          el.setSelectionRange(focusInfo.selection.start,focusInfo.selection.end,focusInfo.selection.direction);
        }catch(_){}
      }
    }
  }catch(_){}
}

export function render(){
  const focusInfo=getFocusInfo();
  const openDetails=getOpenDetails();

  const s=getState();
  const view=getViewState();
  renderHeader(s);
  renderHero(view);
  renderOnboarding(view);
  renderQuickLog(view);
  renderQuest(view);
  renderStatusStrip(view);
  renderOverviewStreaks(view);
  renderRewards(view);
  renderRoadmapPreview(view);
  renderBadges(view);
  renderActivity(view);
  renderStreaks(view);
  renderWeekly(view);
  renderTimeline(view);
  renderSources();
  renderSettings(s);

  restoreOpenDetails(openDetails);
  restoreFocus(focusInfo);
}
