import {completedCount} from '../../domain/status.js';
import {levelFor,nextMilestone,dayNumber} from '../../domain/progress.js';

const R=42, C=2*Math.PI*R;

function ensureRing(svg){
  if(svg.dataset.ready)return;
  svg.innerHTML=`<circle class="ring-track" cx="50" cy="50" r="${R}" fill="none" stroke="#232b36" stroke-width="7"/>
  <circle class="ring-fill" cx="50" cy="50" r="${R}" fill="none" stroke="#ff9900" stroke-width="7" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C}" transform="rotate(-90 50 50)"/>
  <text x="50" y="56" text-anchor="middle" font-size="24" font-weight="600"></text>`;
  svg.dataset.ready='1';
}

export function renderHero(view){
  const cc=completedCount(view), pct=cc/21*100;
  const svg=document.getElementById('ringSvg');
  ensureRing(svg);
  const fill=svg.querySelector('.ring-fill');
  fill.style.strokeDashoffset=C-(pct/100)*C;
  fill.classList.toggle('done',cc>=21);
  svg.querySelector('text').textContent=Math.round(pct)+'%';
  const bar=document.getElementById('barInner');
  bar.style.width=pct+'%';
  bar.classList.toggle('done',cc>=21);
  document.getElementById('progressLabel').textContent=`${cc} / 21 badges`;
  document.getElementById('progressPct').textContent=Math.round(pct)+'%';
  const level=levelFor(cc);
  const day=`Day ${dayNumber(view)}`;
  document.getElementById('chipLevel').textContent=level;
  document.getElementById('chipMilestone').textContent=nextMilestone(cc).label;
  document.getElementById('chipDay').textContent=day;
  const compactEl=document.getElementById('heroCompactMeta');
  if(compactEl) compactEl.textContent=`${cc}/21 · ${day} · ${level}`;
}
