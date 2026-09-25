import {getState,communityDemoState} from '../domain/store.js';
import {renderHeader} from './views/header.js';
import {renderHero} from './views/hero.js';
import {renderQuest} from './views/quest.js';
import {renderRoadmap} from './views/roadmap.js';
import {renderStreaks} from './views/streaks.js';
import {renderTimeline} from './views/timeline.js';
import {renderRewards} from './views/rewards.js';

export function render(){
  const s=getState();
  const view= s.mode==='community' ? communityDemoState() : s;
  renderHeader(s);
  renderHero(view);
  renderQuest(view);
  renderRoadmap(view);
  renderStreaks(view);
  renderTimeline(view);
  renderRewards(view);
}
