import {getState,getViewState} from '../domain/store.js';
import {renderHeader} from './views/header.js';
import {renderHero} from './views/hero.js';
import {renderQuest} from './views/quest.js';
import {renderRecentActivity,renderRoadmapPreview,renderStatusStrip} from './views/overview.js';
import {renderBadges} from './views/badges.js';
import {renderStreaks} from './views/streaks.js';
import {renderWeekly} from './views/weekly.js';
import {renderActivity} from './views/activity.js';
import {renderTimeline} from './views/timeline.js';
import {renderRewards} from './views/rewards.js';
import {renderSources} from './views/sources.js';
import {renderSettings} from './views/settings.js';

export function render(){
  const s=getState();
  const view=getViewState();
  renderHeader(s);
  renderHero(view);
  renderQuest(view);
  renderStatusStrip(view);
  renderStreaks(view);
  renderWeekly(view);
  renderRoadmapPreview(view);
  renderRewards(view);
  renderRecentActivity(view);
  renderBadges(view);
  renderActivity(view);
  renderTimeline(view);
  renderSources();
  renderSettings();
}
