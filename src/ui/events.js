import {setMode,resetAll,setStorageErrorHandler} from '../domain/store.js';
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
  });
}
