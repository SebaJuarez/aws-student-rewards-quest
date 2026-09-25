import {SL} from '../data/badges.js';
import {setMode,resetAll,logStreak,resetStreak,getState,replaceState,defaultState,setStorageErrorHandler} from '../domain/store.js';
import {render} from './render.js';
import {toast} from './toast.js';
import {openDrawer,closeDrawer} from './drawer.js';

export function bindEvents(){
  setStorageErrorHandler(toast);

  document.getElementById('modePersonal').onclick=()=>{setMode('personal');render();};
  document.getElementById('modeCommunity').onclick=()=>{setMode('community');render();};
  document.getElementById('overlay').onclick=closeDrawer;
  document.addEventListener('keydown',(e)=>{if(e.key==='Escape')closeDrawer();});

  document.getElementById('btnReset').onclick=()=>{if(confirm('Reset ALL progress? This cannot be undone (export first if unsure).')){resetAll();render();toast('Progress reset');}};
  document.getElementById('btnExport').onclick=()=>{
    const blob=new Blob([JSON.stringify(getState(),null,2)],{type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='aws-student-rewards-progress.json'; a.click();
  };
  document.getElementById('btnImport').onclick=()=>document.getElementById('fileImport').click();
  document.getElementById('fileImport').onchange=(e)=>{
    const f=e.target.files[0]; if(!f)return;
    const r=new FileReader();
    r.onload=()=>{try{const p=JSON.parse(r.result); if(typeof p!=='object'||!p.completed) throw 0; replaceState(Object.assign(defaultState(),p)); render(); toast('Progress imported');}catch(err){toast('Invalid file — could not import');}};
    r.readAsText(f);
  };

  document.body.addEventListener('click',(e)=>{
    const open=e.target.closest('[data-open]'); if(open){openDrawer(open.dataset.open);return;}
    const start=e.target.closest('#btnStartJourney'); if(start){
      if(confirm('Reset to a fresh 0/21 start and switch to Personal Mode?')){resetAll();render();toast('Fresh start — good luck!');}
      return;
    }
    const log=e.target.closest('[data-log]'); if(log){
      const k=log.dataset.log;
      const current=logStreak(k);
      if(current===null){toast('Already logged today');return;}
      render();toast(`${SL[k]} streak: ${current} days`);return;
    }
    const rs=e.target.closest('[data-resetstreak]'); if(rs){
      if(confirm('Reset this streak to 0?')){resetStreak(rs.dataset.resetstreak);render();toast('Streak reset');}
      return;
    }
  });
}
