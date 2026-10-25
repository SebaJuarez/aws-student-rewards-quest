import {SL,WL} from '../data/badges.js';
import {setMode,resetAll,logStreak,resetStreak,logWeek,resetWeek,getState,importState,setStorageErrorHandler,undo} from '../domain/store.js';
import {completedCount} from '../domain/status.js';
import {cloneState} from '../domain/celebrate.js';
import {generateICS} from '../domain/calendar.js';
import {addDays} from '../domain/dates.js';
import {render} from './render.js';
import {toast} from './toast.js';
import {celebrateAchievements} from './celebrate.js';
import {confirmDialog} from './dialog.js';
import {openDrawer,closeDrawer} from './drawer.js';
import {selectHeatDay} from './views/activity.js';
import {setStatusFilter,setPhaseFilter,setSearchQuery,setSortOrder,updateBadgesUrl,clearBadgesFilters} from './views/badges.js';

function inCommunityMode(){return getState().mode==='community'}

export function bindEvents(){
  setStorageErrorHandler(toast);

  document.getElementById('modePersonal').onclick=()=>{setMode('personal');render();};
  document.getElementById('modeCommunity').onclick=()=>{setMode('community');render();};
  document.getElementById('overlay').onclick=closeDrawer;

  document.addEventListener('keydown',(e)=>{
    if(e.key==='Escape'){
      closeDrawer();
      const sd=document.getElementById('shortcutsDialog');
      if(sd&&sd.open)sd.close();
    }

    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)&&e.target&&e.target.matches&&e.target.matches('button.heat-cell[data-heat]')){
      e.preventDefault();
      const curDate=e.target.dataset.heat;
      const delta=e.key==='ArrowUp'?-1:(e.key==='ArrowDown'?1:(e.key==='ArrowLeft'?-7:7));
      const nextDate=addDays(curDate,delta);
      if(nextDate){
        const nextBtn=document.querySelector(`button.heat-cell[data-heat="${nextDate}"]`);
        if(nextBtn){
          selectHeatDay(nextBtn);
          nextBtn.focus();
        }
      }
      return;
    }

    if((e.key==='Enter'||e.key===' ')&&e.target&&e.target.matches&&e.target.matches('.badge-row[data-open]')){
      e.preventDefault();
      openDrawer(e.target.dataset.open);
      return;
    }

    const tag=e.target?.tagName;
    const isInput=tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT';
    const isModalOpen=document.querySelector('.drawer.open, dialog[open]');
    if(!isInput&&!isModalOpen&&!e.ctrlKey&&!e.altKey&&!e.metaKey){
      if(e.key>='1'&&e.key<='6'){
        const routes=['#/overview','#/badges','#/activity','#/timeline','#/sources','#/settings'];
        window.location.hash=routes[Number(e.key)-1];
        return;
      }
      if(e.key==='l'||e.key==='L'){
        const qlBtn=document.querySelector('#quickLog [data-log]:not([disabled]), #quickLog [data-logweek]:not([disabled])');
        if(qlBtn){
          e.preventDefault();
          qlBtn.focus();
          return;
        }
      }
      if(e.key==='?'){
        e.preventDefault();
        const sd=document.getElementById('shortcutsDialog');
        if(sd&&typeof sd.showModal==='function')sd.showModal();
        return;
      }
    }
  });

  const pickHeat=(e)=>{const cell=e.target.closest&&e.target.closest('[data-heat]');if(cell)selectHeatDay(cell);};
  document.addEventListener('mouseover',pickHeat);
  document.addEventListener('focusin',pickHeat);

  document.getElementById('btnReset').onclick=async()=>{
    if(inCommunityMode()){toast('Switch to Personal Mode to change your data');return;}
    const confirmed=await confirmDialog({
      title:'Reset all progress',
      body:'Reset ALL progress? This cannot be undone (export first if unsure).',
      confirmLabel:'Reset all',
      danger:true
    });
    if(!confirmed)return;
    resetAll();
    render();
    toast('Progress reset',{
      action:{label:'Undo',onClick:()=>{undo();render();toast('Progress restored');}}
    });
  };

  document.getElementById('btnExport').onclick=()=>{
    const blob=new Blob([JSON.stringify(getState(),null,2)],{type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='aws-student-rewards-progress.json'; a.click();
  };

  const btnExportCal=document.getElementById('btnExportCal');
  if(btnExportCal){
    btnExportCal.onclick=()=>{
      const ics=generateICS(getState());
      const blob=new Blob([ics],{type:'text/calendar;charset=utf-8'});
      const a=document.createElement('a');
      a.href=URL.createObjectURL(blob);
      a.download='aws-student-rewards.ics';
      a.click();
      toast('Calendar reminders exported (.ics)');
    };
  }

  const btnShortcuts=document.getElementById('btnShortcuts');
  const shortcutsDialog=document.getElementById('shortcutsDialog');
  if(btnShortcuts&&shortcutsDialog){
    btnShortcuts.onclick=()=>{
      if(typeof shortcutsDialog.showModal==='function')shortcutsDialog.showModal();
      else toast('Shortcuts: 1-6 (views), L (quick log), Esc (close), ? (help)');
    };
  }
  const shortcutsClose=document.getElementById('shortcutsClose');
  if(shortcutsClose&&shortcutsDialog){
    shortcutsClose.onclick=()=>shortcutsDialog.close();
  }

  document.getElementById('btnImport').onclick=()=>{
    if(inCommunityMode()){toast('Switch to Personal Mode to change your data');return;}
    document.getElementById('fileImport').click();
  };

  document.getElementById('fileImport').onchange=(e)=>{
    if(inCommunityMode()){
      toast('Switch to Personal Mode to change your data');
      e.target.value='';
      return;
    }
    const f=e.target.files[0]; if(!f)return;
    const r=new FileReader();
    r.onload=async()=>{
      if(inCommunityMode()){
        toast('Switch to Personal Mode to change your data');
        return;
      }
      try{
        const parsed=JSON.parse(r.result);
        const compCount=Object.keys(parsed.completed||{}).filter(k=>parsed.completed[k]).length;
        const actCount=Object.keys(parsed.activityLog||{}).length;
        const started=parsed.startedAt||'unknown';
        const confirmed=await confirmDialog({
          title:'Import progress',
          body:`This file contains progress started on ${started}, with ${compCount}/21 completed badges and ${actCount} active days logged.\n\nOverwrite current progress with this data?`,
          confirmLabel:'Import & overwrite',
          danger:false
        });
        if(!confirmed)return;
        if(inCommunityMode()){
          toast('Switch to Personal Mode to change your data');
          return;
        }
        importState(parsed);
        render();
        toast('Progress imported',{
          action:{label:'Undo',onClick:()=>{undo();render();toast('Import undone');}}
        });
      }catch(err){
        toast(err instanceof SyntaxError?'Invalid file — could not import':`Invalid file — ${err.message}`);
      }
    };
    r.readAsText(f);
    e.target.value='';
  };

  let searchDebounceTimer=null;
  document.addEventListener('input',(e)=>{
    if(e.target&&e.target.id==='badgeSearch'){
      const val=e.target.value;
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer=setTimeout(()=>{
        setSearchQuery(val);
        updateBadgesUrl();
        render();
      },150);
    }
  });

  document.addEventListener('change',(e)=>{
    if(e.target&&e.target.id==='phaseSelect'){setPhaseFilter(e.target.value);updateBadgesUrl();render();}
    if(e.target&&e.target.id==='sortSelect'){setSortOrder(e.target.value);updateBadgesUrl();render();}
  });

  document.body.addEventListener('click',async(e)=>{
    const clrSearch=e.target.closest('#btnSearchClear');
    if(clrSearch){
      setSearchQuery('');
      updateBadgesUrl();
      render();
      return;
    }
    const clr=e.target.closest('#btnClearFilters');
    if(clr){
      clearBadgesFilters();
      render();
      return;
    }
    const cell=e.target.closest('[data-heat]'); if(cell){selectHeatDay(cell);return;}
    const log=e.target.closest('[data-log]'); if(log){
      if(inCommunityMode()){toast('Switch to Personal Mode to log activity');return;}
      const k=log.dataset.log;
      const before=cloneState(getState());
      const current=logStreak(k);
      if(current===null){toast('Already logged today');return;}
      render();
      celebrateAchievements(before,getState(),`${SL[k]} streak: ${current} days`,{
        label:'Undo',onClick:()=>{undo();render();toast('Activity undone');}
      });
      return;
    }
    const lw=e.target.closest('[data-logweek]'); if(lw){
      if(inCommunityMode()){toast('Switch to Personal Mode to log activity');return;}
      const k=lw.dataset.logweek;
      const before=cloneState(getState());
      const current=logWeek(k);
      if(current===null){toast('Already logged this week');return;}
      render();
      celebrateAchievements(before,getState(),`${WL[k]} streak: ${current} of 4 weeks`,{
        label:'Undo',onClick:()=>{undo();render();toast('Activity undone');}
      });
      return;
    }
    const open=e.target.closest('[data-open]'); if(open){openDrawer(open.dataset.open);return;}
    const filter=e.target.closest('[data-filter]'); if(filter){setStatusFilter(filter.dataset.filter);updateBadgesUrl();render();return;}
    const rs=e.target.closest('[data-resetstreak]'); if(rs){
      if(inCommunityMode()){toast('Switch to Personal Mode first');return;}
      const before=cloneState(getState());
      resetStreak(rs.dataset.resetstreak);
      render();
      celebrateAchievements(before,getState(),'Streak reset',{
        label:'Undo',onClick:()=>{undo();render();toast('Streak restored');}
      });
      return;
    }
    const rw=e.target.closest('[data-resetweek]'); if(rw){
      if(inCommunityMode()){toast('Switch to Personal Mode first');return;}
      const before=cloneState(getState());
      resetWeek(rw.dataset.resetweek);
      render();
      celebrateAchievements(before,getState(),'Weekly streak reset',{
        label:'Undo',onClick:()=>{undo();render();toast('Weekly streak restored');}
      });
      return;
    }
  });
}
