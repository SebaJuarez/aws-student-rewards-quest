export function renderHeader(s){
  document.getElementById('modePersonal').classList.toggle('active',s.mode==='personal');
  document.getElementById('modeCommunity').classList.toggle('active',s.mode==='community');
  document.getElementById('demoBanner').innerHTML = s.mode==='community' ? `<div class="demo-banner"><span>You're viewing example progress. This is what the tracker looks like — nothing here is saved.</span><button class="btn primary" id="btnStartJourney">Start your journey</button></div>` : '';
}
