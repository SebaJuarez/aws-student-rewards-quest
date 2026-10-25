export function renderHeader(s){
  const mp=document.getElementById('modePersonal');
  if(mp)mp.classList.toggle('active',s.mode==='personal');
  const mc=document.getElementById('modeCommunity');
  if(mc)mc.classList.toggle('active',s.mode==='community');
  const db=document.getElementById('demoBanner');
  if(db)db.innerHTML = s.mode==='community' ? `<div class="demo-banner"><span>You're viewing example progress. This is what the tracker looks like — nothing here is saved.</span><button class="btn primary" id="btnStartJourney">Start your journey</button></div>` : '';
}
