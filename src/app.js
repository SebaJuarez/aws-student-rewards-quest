import {bindEvents} from './ui/events.js';
import {render} from './ui/render.js';
import {initRouter,applyRoute} from './ui/router.js';
import {syncBadgesRoute} from './ui/views/badges.js';

function handleRoute(route){
  syncBadgesRoute(route);
  render();
  applyRoute();
}

bindEvents();
handleRoute(initRouter(handleRoute));
