import {getState,getViewState} from '../domain/store.js';
import {renderHeader} from './views/header.js';
import {renderHero} from './views/hero.js';
import {renderQuest} from './views/quest.js';
import {renderRoadmap} from './views/roadmap.js';
import {renderStreaks} from './views/streaks.js';
import {renderWeekly} from './views/weekly.js';
import {renderActivity} from './views/activity.js';
import {renderTimeline} from './views/timeline.js';
import {renderRewards} from './views/rewards.js';
import {renderSources} from './views/sources.js';

export function render(){
  const s=getState();
  const view=getViewState();
  renderHeader(s);
  renderHero(view);
  renderQuest(view);
  renderRoadmap(view);
  renderStreaks(view);
  renderWeekly(view);
  renderActivity(view);
  renderTimeline(view);
  renderRewards(view);
  renderSources();
}
