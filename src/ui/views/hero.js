import {completedCount} from '../../domain/status.js';
import {levelFor,nextMilestone,dayNumber} from '../../domain/progress.js';

function ringSVG(pct){
  const r=42,c=2*Math.PI*r,off=c-(pct/100)*c;
  return `<circle cx="50" cy="50" r="${r}" fill="none" stroke="#232b36" stroke-width="8"/>
  <circle cx="50" cy="50" r="${r}" fill="none" stroke="#ff9900" stroke-width="8" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${off}" transform="rotate(-90 50 50)"/>
  <text x="50" y="46" text-anchor="middle" font-size="20" font-weight="600">${Math.round(pct)}%</text>
  <text x="50" y="62" text-anchor="middle" font-size="9" fill="#8f9aa6">complete</text>`;
}

export function renderHero(view){
  const cc=completedCount(view), pct=cc/21*100;
  document.getElementById('ringSvg').innerHTML=ringSVG(pct);
  document.getElementById('barInner').style.width=pct+'%';
  document.getElementById('progressLabel').textContent=`${cc} / 21 badges`;
  document.getElementById('progressPct').textContent=Math.round(pct)+'%';
  document.getElementById('chipLevel').textContent=levelFor(cc);
  document.getElementById('chipMilestone').textContent=nextMilestone(cc).label;
  document.getElementById('chipDay').textContent=`Day ${dayNumber(view)}`;
}
