import {WL} from '../../data/badges.js';
import {formatDate,todayStr} from '../../domain/dates.js';
import {
  ACTIVITY_KEYS,activitySummary,heatmapModel,personalRecords
} from '../../domain/activityLog.js';
import {dayNumber} from '../../domain/progress.js';
import {buildQuickLogPills} from './quicklog.js';

const SHORT={signin:'Sign-in',like:'Like',comment:'Comment',wishVote:'Wish',articlePublish:'Article'};
const WEEKDAY_LABELS=['Mon','','Wed','','Fri','',''];

let selectedDay=null;

const label=(key)=>SHORT[key]||WL[key]||key;
const chip=(k,v)=>`<div class="chip"><div class="k">${k}</div><div class="v mono">${v}</div></div>`;
const listDays=(keys)=>keys.map(label).join(', ');

function journeyDay(view,date){
  if(!view||!view.startedAt||date<view.startedAt)return null;
  return dayNumber(view,date);
}

function cellHTML(cell,view){
  if(!cell||cell.outside)return `<span class="heat-cell out" aria-hidden="true"></span>`;
  const day=journeyDay(view,cell.date);
  const sel=cell.date===selectedDay;
  const cls=['heat-cell'];
  if(cell.active)cls.push(cell.count>=3?'lvl2':'lvl1');
  if(cell.milestone)cls.push('mile');
  if(cell.lost.length)cls.push('lost');
  if(cell.risk)cls.push('risk');
  if(cell.today)cls.push('today');
  if(sel)cls.push('sel');
  const glyph=cell.lost.length?'x':(cell.risk?'!':'');
  const parts=[formatDate(cell.date)];
  if(day)parts.push(`journey day ${day}`);
  parts.push(cell.active?listDays(cell.keys):'no activity');
  if(cell.milestone)parts.push(cell.milestone);
  if(cell.lost.length)parts.push(`${listDays(cell.lost)} streak lost`);
  if(cell.risk)parts.push('streak at risk');
  return `<button type="button" class="${cls.join(' ')}" data-heat="${cell.date}" data-day="${day===null?'':day}" data-keys="${cell.keys.join(',')}"${cell.milestone?` data-milestone="${cell.milestone}"`:''}${cell.lost.length?` data-lost="${cell.lost.join(',')}"`:''}${cell.risk?' data-risk="1"':''} tabindex="${sel?'0':'-1'}" aria-pressed="${sel?'true':'false'}" aria-label="${parts.join(', ')}">${glyph}</button>`;
}

function detailHTML(o){
  const day=Number(o.day)>0?` · Day ${Number(o.day)}`:'';
  return `<div class="hd-date mono">${formatDate(o.date)}${day}</div>
  <ul class="hd-list">${ACTIVITY_KEYS.map(key=>{
    const on=o.keys.includes(key);
    return `<li class="${on?'on':''}"><i aria-hidden="true">${on?'&#10003;':'&#9675;'}</i>${label(key)}</li>`;
  }).join('')}</ul>
  ${o.milestone?`<div class="hd-note">milestone - ${o.milestone}</div>`:''}
  ${o.lost.length?`<div class="hd-note lost">streak lost - ${listDays(o.lost)}</div>`:''}
  ${o.risk?`<div class="hd-note risk">streak at risk - log today to keep it</div>`:''}`;
}

export function selectHeatDay(cell){
  if(!cell||!cell.dataset.heat)return;
  selectedDay=cell.dataset.heat;
  const wrap=document.getElementById('activity');
  if(!wrap)return;
  wrap.querySelectorAll('[data-heat]').forEach((c)=>{
    const on=c.dataset.heat===selectedDay;
    c.setAttribute('aria-pressed',on?'true':'false');
    c.setAttribute('tabindex',on?'0':'-1');
    c.classList.toggle('sel',on);
  });
  const detail=document.getElementById('heatDetail');
  if(!detail)return;
  detail.innerHTML=detailHTML({
    date:selectedDay,
    day:cell.dataset.day,
    keys:(cell.dataset.keys||'').split(',').filter(Boolean),
    milestone:cell.dataset.milestone||null,
    lost:(cell.dataset.lost||'').split(',').filter(Boolean),
    risk:cell.dataset.risk==='1'
  });
}

export function renderActivity(view){
  const today=todayStr();
  const sum=activitySummary(view,today);
  const heat=heatmapModel(view,today);
  const rec=personalRecords(view);

  if(!selectedDay||!heat.byDate[selectedDay])selectedDay=today;
  const selected=heat.byDate[selectedDay];
  const selDetail=detailHTML({
    date:selectedDay,
    day:journeyDay(view,selectedDay),
    keys:selected?selected.keys:[],
    milestone:selected?selected.milestone:null,
    lost:selected?selected.lost:[],
    risk:selected?selected.risk:false
  });

  const stats=`<div class="chips">
    ${chip('Today',`${sum.today.keys.length} / ${ACTIVITY_KEYS.length}`)}
    ${chip('Last 7 days',sum.last7Total)}
    ${chip('Activities logged',sum.total)}
    ${chip('Active days',sum.activeDays)}
  </div>`;

  const pills=buildQuickLogPills(view,today);

  const todayBlock=`<div class="act-today">
    <div class="act-today-head"><span class="mono">${formatDate(today)}</span><span class="mono">${sum.today.keys.length} of ${ACTIVITY_KEYS.length} activities today</span></div>
    <div class="apills">${pills}</div>
  </div>`;

  const head=`<div class="act-hrow"><span class="act-date">Day</span>${ACTIVITY_KEYS.map((k)=>`<span>${SHORT[k]}</span>`).join('')}</div>`;
  const rows=[...sum.last7].reverse().map((d)=>`<div class="act-row${d.date===today?' today':''}">
    <span class="act-date mono">${formatDate(d.date)}</span>
    ${ACTIVITY_KEYS.map((key)=>{
      const on=d.keys.includes(key);
      return `<span class="mk${on?' on':''}"><span aria-hidden="true">${on?'&#10003;':'&#9675;'}</span><span class="sr-only">${label(key)} ${on?'logged':'not logged'} on ${formatDate(d.date)}</span></span>`;
    }).join('')}
  </div>`).join('');

  const labels=`<div class="heat-col labels" aria-hidden="true"><span class="heat-mon"></span><div class="heat-cells">${WEEKDAY_LABELS.map((w)=>`<span>${w}</span>`).join('')}</div></div>`;
  const columns=heat.columns.map((col)=>`<div class="heat-col"><span class="heat-mon">${col.label}</span><div class="heat-cells">${col.cells.map((cell)=>cellHTML(cell,view)).join('')}</div></div>`).join('');
  const legend=`<div class="heat-legend">
    <span><i class="sw empty"></i>no activity</span>
    <span><i class="sw lvl1"></i>1-2 activities</span>
    <span><i class="sw lvl2"></i>3+ activities</span>
    <span><i class="sw mile"></i>milestone day</span>
    <span><i class="sw lost">x</i>streak lost</span>
    <span><i class="sw risk">!</i>streak at risk</span>
  </div>`;
  const heatBlock=`<div class="heat-wrap">
    <div class="heat-scroll">
      <div class="heat" role="group" aria-label="Last 90 days of activity (use Arrow keys to navigate)">${labels}${columns}</div>
    </div>
    <div class="heat-detail" id="heatDetail" aria-live="polite">${selDetail}</div>
    ${legend}
  </div>`;

  const recordsBlock=`<div class="rec-grid">
    <div class="rec-card"><div class="rec-k">Best Sign-in Streak</div><div class="rec-v mono">${rec.longest.signin}d</div></div>
    <div class="rec-card"><div class="rec-k">Best Like Streak</div><div class="rec-v mono">${rec.longest.like}d</div></div>
    <div class="rec-card"><div class="rec-k">Best Comment Streak</div><div class="rec-v mono">${rec.longest.comment}d</div></div>
    <div class="rec-card"><div class="rec-k">Best Wish Streak</div><div class="rec-v mono">${rec.longest.wishVote}w</div></div>
    <div class="rec-card"><div class="rec-k">Best Article Streak</div><div class="rec-v mono">${rec.longest.articlePublish}w</div></div>
    <div class="rec-card"><div class="rec-k">Best Week</div><div class="rec-v mono">${rec.bestWeek?`${rec.bestWeek.week} (${rec.bestWeek.count} acts)`:'—'}</div></div>
  </div>`;

  const totals=`<div class="apills">${ACTIVITY_KEYS.map((k)=>`<span class="apill"><i class="n mono">${sum.totals[k]}</i>${label(k)}</span>`).join('')}</div>`;

  let recentHTML='';
  if(!sum.recent.length){
    recentHTML=`<div class="quest-empty">No activity recorded yet - log today from the buttons above; nothing is backfilled.</div>`;
  }else{
    const primaryRecent=sum.recent.slice(0,7);
    const extraRecent=sum.recent.slice(7);
    const renderList=(items)=>`<ul class="act-recent">${items.map((d)=>`<li><span class="mono">${formatDate(d.date)}</span><span class="act-tags">${d.keys.map((k)=>`<span class="act-tag">${label(k)}</span>`).join('')}</span></li>`).join('')}</ul>`;
    
    recentHTML=renderList(primaryRecent);
    if(extraRecent.length){
      recentHTML+=`<details class="act-more" data-key="act-more-history">
        <summary>Show older activity (${extraRecent.length} more)</summary>
        ${renderList(extraRecent)}
      </details>`;
    }
  }

  document.getElementById('activity').innerHTML=`${stats}
    <h3 class="sub-h">Today</h3>${todayBlock}
    <h3 class="sub-h">Daily Streaks <span class="h2-note">— 90-day targets</span></h3>
    <div class="streak-grid" id="streaks"></div>
    <h3 class="sub-h">Weekly Streaks <span class="h2-note">— ISO calendar weeks</span></h3>
    <div class="streak-grid" id="weekly"></div>
    <h3 class="sub-h">Personal Records <span class="h2-note">— all-time bests</span></h3>${recordsBlock}
    <h3 class="sub-h">Last 7 days</h3>
    <div class="act-grid">${head}${rows}</div>
    <h3 class="sub-h">Last 90 days</h3>${heatBlock}
    <h3 class="sub-h">Totals</h3>${totals}
    <h3 class="sub-h">Recent activity</h3>${recentHTML}`;
}
