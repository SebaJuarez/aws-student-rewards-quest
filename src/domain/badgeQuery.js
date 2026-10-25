import {statusOf, isLocked} from './status.js';
import {estimateMinutes} from './quest.js';
import {streakView, weekView} from './activity.js';
import {todayStr} from './dates.js';

export const SORT_OPTIONS = Object.freeze([
  {id: 'num', label: 'Official #'},
  {id: 'progress', label: 'Progress % desc'},
  {id: 'effort', label: 'Effort asc'},
  {id: 'status', label: 'Status'}
]);

export function progressPctOf(b, state, today = todayStr()) {
  if (!state) return 0;
  if (statusOf(b, state, today) === 'completed') return 100;
  if (b.type === 'streak') {
    const v = streakView(state.streaks ? state.streaks[b.key] : null, today);
    if (!v.current || !b.target) return 0;
    return Math.min(100, Math.round((Math.min(v.current, b.target) / b.target) * 100));
  }
  if (b.type === 'weekly') {
    const v = weekView(state.weekly ? state.weekly[b.key] : null, today);
    if (!v.current || !b.target) return 0;
    return Math.min(100, Math.round((Math.min(v.current, b.target) / b.target) * 100));
  }
  return statusOf(b, state, today) === 'active' ? 50 : 0;
}

function matchesQuery(b, q) {
  if (!q) return true;
  const term = String(q).trim().toLowerCase();
  if (!term) return true;

  const cleanTerm = term.startsWith('#') ? term.slice(1).trim() : term;
  const numStr = String(b.n);
  const padStr = numStr.padStart(2, '0');
  if (cleanTerm === numStr || cleanTerm === padStr) return true;

  if (b.name && b.name.toLowerCase().includes(term)) return true;
  if (b.phase && b.phase.toLowerCase().includes(term)) return true;
  if (b.req && b.req.toLowerCase().includes(term)) return true;
  if (b.official && b.official.toLowerCase().includes(term)) return true;
  if (b.id && b.id.toLowerCase().includes(term)) return true;

  return false;
}

export function filterBadges(badges, state, {status = 'all', phase = 'all', q = ''} = {}, today = todayStr()) {
  if (!Array.isArray(badges)) return [];
  return badges.filter(b => {
    if (phase && phase !== 'all' && b.phase !== phase) return false;

    if (status && status !== 'all') {
      const st = statusOf(b, state, today);
      const locked = isLocked(b, state, today);
      if (status === 'completed' && st !== 'completed') return false;
      if (status === 'in_progress' && st !== 'active') return false;
      if (status === 'available' && (st !== 'not_started' || locked)) return false;
      if (status === 'locked' && !locked) return false;
    }

    if (q && !matchesQuery(b, q)) return false;

    return true;
  });
}

export function sortBadges(badges, state, sortKey = 'num', today = todayStr()) {
  if (!Array.isArray(badges)) return [];
  const list = [...badges];
  switch (sortKey) {
    case 'progress':
      list.sort((a, b) => {
        const pa = progressPctOf(a, state, today);
        const pb = progressPctOf(b, state, today);
        if (pb !== pa) return pb - pa;
        return a.n - b.n;
      });
      break;
    case 'effort':
      list.sort((a, b) => {
        const ea = estimateMinutes(a);
        const eb = estimateMinutes(b);
        const va = ea !== null && ea !== undefined ? ea : Infinity;
        const vb = eb !== null && eb !== undefined ? eb : Infinity;
        if (va !== vb) return va - vb;
        return a.n - b.n;
      });
      break;
    case 'status': {
      const rankOf = (b) => {
        const st = statusOf(b, state, today);
        if (st === 'completed') return 4;
        if (isLocked(b, state, today)) return 3;
        if (st === 'active') return 1;
        return 2;
      };
      list.sort((a, b) => {
        const ra = rankOf(a);
        const rb = rankOf(b);
        if (ra !== rb) return ra - rb;
        return a.n - b.n;
      });
      break;
    }
    case 'num':
    case 'official':
    default:
      list.sort((a, b) => a.n - b.n);
      break;
  }
  return list;
}
