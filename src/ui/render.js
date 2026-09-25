import {getState,communityDemoState} from '../domain/store.js';
import {renderHeader} from './views/header.js';
import {renderHero} from './views/hero.js';
import {renderQuest} from './views/quest.js';

export function render(){
  const s=getState();
  const view= s.mode==='community' ? communityDemoState() : s;
  renderHeader(s);
  renderHero(view);
  renderQuest(view);
}
