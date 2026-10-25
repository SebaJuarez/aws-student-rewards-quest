import {bindEvents} from './ui/events.js';
import {render} from './ui/render.js';
import {initRouter,applyRoute} from './ui/router.js';
import {syncBadgesRoute} from './ui/views/badges.js';
import {openDrawer,closeDrawer} from './ui/drawer.js';
import {setMode} from './domain/store.js';

function handleRoute(route){
  if(route.params&&route.params.get('mode')==='community'){
    setMode('community');
  }
  const badgeToOpen=route.params&&route.params.get('badge');
  if(!badgeToOpen){
    closeDrawer({restoreFocus:false});
  }
  syncBadgesRoute(route);
  render();
  applyRoute();
  if(badgeToOpen){
    openDrawer(badgeToOpen);
  }
}

bindEvents();
handleRoute(initRouter(handleRoute));

if(typeof window!=='undefined'&&'serviceWorker' in navigator&&window.location.protocol.startsWith('http')){
  window.addEventListener('load',()=>{
    navigator.serviceWorker.register('./sw.js').catch(()=>{});
  });
}
