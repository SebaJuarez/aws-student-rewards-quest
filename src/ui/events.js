import {SL} from '../data/badges.js';
import {setMode,resetAll,logStreak,resetStreak,setStorageErrorHandler} from '../domain/store.js';
import {render} from './render.js';
import {toast} from './toast.js';

export function bindEvents(){
  setStorageErrorHandler(toast);

  document.getElementById('modePersonal').onclick=()=>{setMode('personal');render();};
  document.getElementById('modeCommunity').onclick=()=>{setMode('community');render();};

  document.body.addEventListener('click',(e)=>{
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
