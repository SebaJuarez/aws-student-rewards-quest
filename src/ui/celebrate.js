import {toast} from './toast.js';
import {diffAchievements} from '../domain/celebrate.js';

let bannerEl=null;
let autoHideTimer=null;

function ensureBanner(){
  if(typeof document==='undefined')return null;
  if(!bannerEl){
    bannerEl=document.getElementById('celebration-banner');
    if(!bannerEl){
      bannerEl=document.createElement('aside');
      bannerEl.id='celebration-banner';
      bannerEl.className='celebration-banner';
      bannerEl.setAttribute('role','status');
      bannerEl.setAttribute('aria-live','polite');
      document.body.appendChild(bannerEl);
    }
  }
  return bannerEl;
}

export function dismissRewardBanner(){
  if(autoHideTimer){
    clearTimeout(autoHideTimer);
    autoHideTimer=null;
  }
  if(bannerEl){
    bannerEl.classList.remove('show');
  }
}

export function showRewardBanner(tier){
  if(typeof document==='undefined')return;
  const banner=ensureBanner();
  if(!banner)return;

  if(autoHideTimer){
    clearTimeout(autoHideTimer);
    autoHideTimer=null;
  }

  const [count,label]=Array.isArray(tier)?tier:[tier.count,tier.label];

  banner.innerHTML=`
    <div class="celebration-banner-inner">
      <div class="celebration-banner-content">
        <div class="celebration-banner-title">◆ Reward tier reached: ${count} badges — ${label}</div>
        <div class="celebration-banner-note">Rewards are granted by AWS and should be verified on AWS Builder Center. Independent community tracker.</div>
      </div>
      <button type="button" class="celebration-banner-close" id="closeCelebrationBanner" aria-label="Close celebration banner">✕</button>
    </div>
  `;

  const closeBtn=banner.querySelector('#closeCelebrationBanner');
  if(closeBtn){
    closeBtn.onclick=()=>dismissRewardBanner();
  }

  void banner.offsetWidth;
  banner.classList.add('show');

  autoHideTimer=setTimeout(()=>{
    dismissRewardBanner();
  },8000);
}

export function celebrateAchievements(beforeState,afterState,defaultToastMsg,undoAction=null){
  if(!afterState)return;
  if(afterState.mode==='community'||beforeState?.mode==='community')return;

  const diff=diffAchievements(beforeState,afterState);

  let toastMsg=defaultToastMsg;
  if(diff.badges.length===1){
    toastMsg=`✓ ${diff.badges[0].name} reached`;
  }else if(diff.badges.length>1){
    toastMsg=`✓ ${diff.badges.length} badges reached: ${diff.badges.map(b=>b.name).join(', ')}`;
  }

  if(toastMsg){
    toast(toastMsg,undoAction?{action:undoAction}:{});
  }

  if(diff.tiers.length>0){
    diff.tiers.forEach(tier=>showRewardBanner(tier));
  }
}

if(typeof document!=='undefined'){
  document.addEventListener('keydown',(e)=>{
    if(e.key==='Escape'&&bannerEl&&bannerEl.classList.contains('show')){
      dismissRewardBanner();
    }
  });
}
