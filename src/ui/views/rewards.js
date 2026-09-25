import {REWARD_TIERS} from '../../data/rewards.js';
import {completedCount} from '../../domain/status.js';

export function renderRewards(view){
  const cc=completedCount(view);
  document.getElementById('rewards').innerHTML=REWARD_TIERS.map(([n,label])=>`<div class="reward-row ${cc>=n?'reached':''}"><span class="rn mono">${cc}/${n}</span><span class="rt">${label}</span>${cc>=n?'<span class="status-pill completed">unlocked</span>':''}</div>`).join('');
}
