import {SL,WL} from '../data/badges.js';
import {setMode,resetAll,logStreak,resetStreak,logWeek,resetWeek,getState,importState,setStorageErrorHandler} from '../domain/store.js';
import {render} from './render.js';
import {toast} from './toast.js';
import {openDrawer,closeDrawer} from './drawer.js';
import {selectHeatDay} from './views/activity.js';
import {setStatusFilter,setPhaseFilter} from './views/badges.js';

function inCommunityMode(){return getState().mode==='community'}

export function bindEvents(){
  setStorageErrorHandler(toast);

  document.getElementById('modePersonal').onclick=()=>{setMode('personal');render();};
  document.getElementById('modeCommunity').onclick=()=>{setMode('community');render();};
  document.getElementById('overlay').onclick=closeDrawer;
  document.addEventListener('keydown',(e)=>{if(e.key==='Escape')closeDrawer();});

  const pickHeat=(e)=>{const cell=e.target.closest&&e.target.closest('[data-heat]');if(cell)selectHeatDay(cell);};
  document.addEventListener('mouseover',pickHeat);
  document.addEventListener('focusin',pickHeat);

  document.getElementById('btnReset').onclick=()=>{if(confirm('Reset ALL progress? This cannot be undone (export first if unsure).')){resetAll();render();toast('Progress reset');}};
  document.getElementById('btnExport').onclick=()=>{
    const blob=new Blob([JSON.stringify(getState(),null,2)],{type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='aws-student-rewards-progress.json'; a.click();
  };
  document.getElementById('btnImport').onclick=()=>document.getElementById('fileImport').click();
  document.getElementById('fileImport').onchange=(e)=>{
    const f=e.target.files[0]; if(!f)return;
    const r=new FileReader();
    r.onload=()=>{
      try{
        importState(JSON.parse(r.result));
        render(); toast('Progress imported');
      }catch(err){
        toast(err instanceof SyntaxError?'Invalid file — could not import':`Invalid file — ${err.message}`);
      }
    };
    r.readAsText(f);
    e.target.value='';
  };

  document.addEventListener('change',(e)=>{
    if(e.target&&e.target.id==='phaseSelect'){setPhaseFilter(e.target.value);render();}
  });

  document.body.addEventListener('click',(e)=>{
    const cell=e.target.closest('[data-heat]'); if(cell){selectHeatDay(cell);return;}
    const open=e.target.closest('[data-open]'); if(open){openDrawer(open.dataset.open);return;}
    const filter=e.target.closest('[data-filter]'); if(filter){setStatusFilter(filter.dataset.filter);render();return;}
    const start=e.target.closest('#btnStartJourney'); if(start){
      if(confirm('Reset to a fresh 0/21 start and switch to Personal Mode?')){resetAll();render();toast('Fresh start — good luck!');}
      return;
    }
    const log=e.target.closest('[data-log]'); if(log){
      if(inCommunityMode()){toast('Switch to Personal Mode to log activity');return;}
      const k=log.dataset.log;
      const current=logStreak(k);
      if(current===null){toast('Already logged today');return;}
      render();toast(`${SL[k]} streak: ${current} days`);return;
    }
    const lw=e.target.closest('[data-logweek]'); if(lw){
      if(inCommunityMode()){toast('Switch to Personal Mode to log activity');return;}
      const k=lw.dataset.logweek;
      const current=logWeek(k);
      if(current===null){toast('Already logged this week');return;}
      render();toast(`${WL[k]} streak: ${current} of 4 weeks`);return;
    }
    const rs=e.target.closest('[data-resetstreak]'); if(rs){
      if(inCommunityMode()){toast('Switch to Personal Mode first');return;}
      if(confirm('Reset this streak to 0?')){resetStreak(rs.dataset.resetstreak);render();toast('Streak reset');}
      return;
    }
    const rw=e.target.closest('[data-resetweek]'); if(rw){
      if(inCommunityMode()){toast('Switch to Personal Mode first');return;}
      if(confirm('Reset this weekly streak to 0?')){resetWeek(rw.dataset.resetweek);render();toast('Weekly streak reset');}
      return;
    }
  });
}
