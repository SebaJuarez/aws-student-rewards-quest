import {bindEvents} from './ui/events.js';
import {render} from './ui/render.js';
import {initRouter,applyRoute} from './ui/router.js';
import {syncBadgesRoute} from './ui/views/badges.js';
import {closeDrawer} from './ui/drawer.js';

function handleRoute(route){
  closeDrawer({restoreFocus:false});
  syncBadgesRoute(route);
  render();
  applyRoute();
}

bindEvents();
handleRoute(initRouter(handleRoute));

if(typeof window!=='undefined'&&'serviceWorker' in navigator&&window.location.protocol.startsWith('http')){
  window.addEventListener('load',()=>{
    navigator.serviceWorker.register('./sw.js').catch(()=>{});
  });
}
