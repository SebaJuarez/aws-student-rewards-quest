import {BADGES, PHASES} from '../../data/badges.js';
import {isLocked, progressOf, statusOf} from '../../domain/status.js';
import {estimateMinutes, nextActionForBadge} from '../../domain/quest.js';
import {streakView, weekView} from '../../domain/activity.js';
import {todayStr} from '../../domain/dates.js';
import {esc} from '../escape.js';
import {viewHref} from '../router.js';
import {filterBadges, sortBadges, progressPctOf, SORT_OPTIONS} from '../../domain/badgeQuery.js';

const STATUS_FILTERS = [
  {id: 'all', label: 'All'},
  {id: 'available', label: 'Available'},
  {id: 'in_progress', label: 'Active'},
  {id: 'completed', label: 'Completed'},
  {id: 'locked', label: 'Locked'}
];

const PILL = {
  completed: {cls: 'completed', g: '✓', label: 'Completed'},
  active: {cls: 'active', g: '▶', label: 'Active'},
  at_risk: {cls: 'at_risk', g: '⚠', label: 'At risk'},
  available: {cls: 'available', g: '○', label: 'Available'},
  not_started: {cls: 'not_started', g: '·', label: 'Not started'},
  locked: {cls: 'locked', g: '⊘', label: 'Locked'}
};

let statusFilter = 'all';
let phaseFilter = 'all';
let searchQuery = '';
let sortOrder = 'num';

export function syncBadgesRoute(route) {
  if (!route || route.view !== 'badges') return;
  const st = route.params.get('status');
  const ph = route.params.get('phase');
  const q = route.params.get('q');
  const s = route.params.get('sort');

  statusFilter = STATUS_FILTERS.some(f => f.id === st) ? st : 'all';
  phaseFilter = PHASES.includes(ph) ? ph : 'all';
  searchQuery = typeof q === 'string' ? q : '';
  sortOrder = SORT_OPTIONS.some(o => o.id === s) ? s : 'num';
}

export function setStatusFilter(v) {
  if (STATUS_FILTERS.some(f => f.id === v)) statusFilter = v;
}

export function setPhaseFilter(v) {
  phaseFilter = PHASES.includes(v) ? v : 'all';
}

export function setSearchQuery(q) {
  searchQuery = typeof q === 'string' ? q : '';
}

export function setSortOrder(s) {
  if (SORT_OPTIONS.some(o => o.id === s)) sortOrder = s;
}

export function clearBadgesFilters() {
  statusFilter = 'all';
  phaseFilter = 'all';
  searchQuery = '';
  sortOrder = 'num';
  updateBadgesUrl();
}

export function updateBadgesUrl() {
  if (typeof window === 'undefined' || !window.history || !window.history.replaceState) return;
  const params = new URLSearchParams();
  if (phaseFilter && phaseFilter !== 'all') params.set('phase', phaseFilter);
  if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
  if (searchQuery && searchQuery.trim()) params.set('q', searchQuery.trim());
  if (sortOrder && sortOrder !== 'num') params.set('sort', sortOrder);
  const hash = viewHref('badges', params);
  window.history.replaceState(null, '', hash);
}

function atRiskBadge(b, view, today) {
  if (view.overrides && view.overrides[b.id]) return false;
  if (b.type === 'streak') return streakView(view.streaks ? view.streaks[b.key] : null, today).atRisk;
  if (b.type === 'weekly') return weekView(view.weekly ? view.weekly[b.key] : null, today).atRisk;
  return false;
}

function pillFor(m, view, today) {
  if (m.locked) return PILL.locked;
  const o = view.overrides && view.overrides[m.b.id];
  if (o) return PILL[o] || PILL.not_started;
  if (m.st === 'completed') return PILL.completed;
  if (atRiskBadge(m.b, view, today)) return PILL.at_risk;
  if (m.st === 'active') return PILL.active;
  return PILL.available;
}

function effortFor(b) {
  if (b.type === 'quick') return b.dur || '—';
  if (b.type === 'streak') return `~${estimateMinutes(b)} min/day`;
  if (b.type === 'weekly') return `~${estimateMinutes(b)} min/week`;
  return '—';
}

function renderNextAction(m, isCommunity) {
  const disabled = isCommunity ? ' disabled title="Demo state is read-only — switch to Personal Mode to log"' : '';
  if (m.b.type === 'streak' && (m.next === 'Log today' || m.next === 'Start today' || m.next === 'Restart today')) {
    return `<button type="button" class="btn-row-action" data-log="${m.b.key}"${disabled}>${esc(m.next)}</button>`;
  }
  if (m.b.type === 'weekly' && (m.next === 'Log this week' || m.next === 'Restart this week')) {
    return `<button type="button" class="btn-row-action" data-logweek="${m.b.key}"${disabled}>${esc(m.next)}</button>`;
  }
  return `<span class="bnext-txt">${esc(m.next)}</span>`;
}

function rowHTML(m, view, today) {
  const p = pillFor(m, view, today);
  const isCommunity = Boolean(view && view.mode === 'community');
  const hasNote = Boolean(view && view.notes && view.notes[m.b.id] && view.notes[m.b.id].trim());
  const noteIndicator = hasNote
    ? `<span class="note-ind" title="Has personal note"><span aria-hidden="true">✎</span><span class="sr-only">has note</span></span>`
    : '';
  const pct = progressPctOf(m.b, view, today);

  return `<div class="badge-row ${m.st}${p.cls === 'at_risk' ? ' at_risk' : ''}" data-open="${m.b.id}" role="button" tabindex="0">
    <span class="num">${String(m.b.n).padStart(2, '0')}</span>
    <span class="name"><span class="badge-name-txt">${esc(m.b.name)}</span>${noteIndicator}</span>
    <span class="bmeta">
      <span class="bphase">${esc(m.b.phase)}</span>
      <span class="status-pill ${p.cls}"><i aria-hidden="true">${p.g}</i>${p.label}</span>
      <span class="bprog">
        <span class="bprog-txt mono">${m.progress}</span>
        <span class="mini-bar" aria-hidden="true"><span class="mini-bar-fill ${m.st}" style="width:${pct}%"></span></span>
      </span>
      <span class="bnext">${renderNextAction(m, isCommunity)}</span>
      <span class="btime mono">${effortFor(m.b)}</span>
    </span>
  </div>`;
}

function emptyHTML() {
  const hasFilters = statusFilter !== 'all' || phaseFilter !== 'all' || Boolean(searchQuery && searchQuery.trim());
  const clearBtn = hasFilters
    ? `<div class="empty-action"><button type="button" class="btn clear-filters-btn" id="btnClearFilters">Clear filters</button></div>`
    : '';

  if (searchQuery && searchQuery.trim()) {
    return `<div class="list-empty">
      <b>No badges found matching "${esc(searchQuery.trim())}"</b>${phaseFilter !== 'all' ? ` in ${esc(phaseFilter)}` : ''}${statusFilter !== 'all' ? ` with status "${statusFilter}"` : ''}.
      ${clearBtn}
    </div>`;
  }
  if (statusFilter === 'locked') {
    return `<div class="list-empty">
      <b>Nothing is locked.</b> A later streak milestone (30 / 90 days) only shows as locked while its smaller milestone in the same family is still unearned — earn the 7-day badge to open the rest. Weekly, quick and community badges are never locked. This is a tracker convention, not an AWS prerequisite.
      ${clearBtn}
    </div>`;
  }
  if (statusFilter === 'completed') {
    return `<div class="list-empty">
      <b>No completed badges${phaseFilter !== 'all' ? ` in ${esc(phaseFilter)}` : ''} yet.</b> Complete quick badges from their detail drawer, or log streak days from Overview.
      ${clearBtn}
    </div>`;
  }
  return `<div class="list-empty">
    No badges match this filter${phaseFilter !== 'all' ? ` in ${esc(phaseFilter)}` : ''}.
    ${clearBtn}
  </div>`;
}

export function renderBadges(view) {
  const today = todayStr();

  // Status counts reflect the current phase & search query scope
  const baseForCounts = filterBadges(BADGES, view, {
    status: 'all',
    phase: phaseFilter,
    q: searchQuery
  }, today);

  const counts = {};
  STATUS_FILTERS.forEach(f => {
    counts[f.id] = filterBadges(baseForCounts, view, {status: f.id}, today).length;
  });

  const filtered = filterBadges(BADGES, view, {
    status: statusFilter,
    phase: phaseFilter,
    q: searchQuery
  }, today);

  const sorted = sortBadges(filtered, view, sortOrder, today);

  const rows = sorted.map(b => ({
    b,
    st: statusOf(b, view, today),
    locked: isLocked(b, view, today),
    progress: progressOf(b, view, today),
    next: nextActionForBadge(b, view, today)
  }));

  document.getElementById('badgeFilters').innerHTML = `
    <div class="badges-toolbar">
      <div class="badges-toolbar-row">
        <div class="search-wrap">
          <span class="search-icon" aria-hidden="true">⌕</span>
          <input type="search" id="badgeSearch" class="search-input" placeholder="Search badges (name, #, phase, req)..." aria-label="Search badges by name, number, phase, or requirement" value="${esc(searchQuery)}" autocomplete="off" spellcheck="false">
          ${searchQuery ? `<button type="button" class="search-clear-btn" id="btnSearchClear" aria-label="Clear search">✕</button>` : ''}
        </div>
        <div class="badges-selects">
          <label class="toolbar-sel">Phase <select id="phaseSelect" aria-label="Filter by phase">
            <option value="all"${phaseFilter === 'all' ? ' selected' : ''}>All phases</option>
            ${PHASES.map(p => `<option value="${p}"${phaseFilter === p ? ' selected' : ''}>${p}</option>`).join('')}
          </select></label>
          <label class="toolbar-sel">Sort <select id="sortSelect" aria-label="Sort badges">
            ${SORT_OPTIONS.map(o => `<option value="${o.id}"${sortOrder === o.id ? ' selected' : ''}>${o.label}</option>`).join('')}
          </select></label>
        </div>
      </div>
      <div class="seg" role="group" aria-label="Filter badges by status">
        ${STATUS_FILTERS.map(f => `<button type="button" class="seg-btn${statusFilter === f.id ? ' on' : ''}" data-filter="${f.id}" aria-pressed="${statusFilter === f.id}">${f.label}<i>${counts[f.id]}</i></button>`).join('')}
      </div>
    </div>`;

  const head = `<div class="badge-hrow" aria-hidden="true">
    <span>#</span><span>Badge</span><span>Phase</span><span>Status</span><span>Progress</span><span>Next action</span><span>Effort</span>
  </div>`;

  document.getElementById('badgeList').innerHTML = head + (rows.length ? rows.map(m => rowHTML(m, view, today)).join('') : emptyHTML());
}
