import {getNextBestActions} from '../../domain/quest.js';

export function renderQuest(view){
  const acts=getNextBestActions(view);
  document.getElementById('questCard').innerHTML = acts.length? acts.map(a=>`
    <div class="quest-item">
      <div class="qmark ${a.risk?'risk':a.go?'go':''}">${a.risk?'!':a.go?'▶':''}</div>
      <div><div class="txt">${a.txt}</div><div class="why">Contributes to: ${a.why.join(', ')}</div></div>
    </div>`).join('') : `<div class="quest-empty">Nothing urgent — browse the roadmap for your next move.</div>`;
}
