import test from 'node:test';
import assert from 'node:assert/strict';
import {BADGES, PHASES} from '../src/data/badges.js';
import {defaultState} from '../src/domain/store.js';
import {filterBadges, sortBadges, progressPctOf, SORT_OPTIONS} from '../src/domain/badgeQuery.js';

test('SORT_OPTIONS exposes the expected 4 sort options', () => {
  const ids = SORT_OPTIONS.map(o => o.id);
  assert.deepEqual(ids, ['num', 'progress', 'effort', 'status']);
});

test('progressPctOf computes 0% for clean state, 100% for completed, and proportional for runs', () => {
  const s = defaultState();
  const bPhoto = BADGES.find(b => b.id === 'photo-finisher'); // quick
  const bSignin7 = BADGES.find(b => b.id === 'streak-signin-7'); // streak target 7
  const bWish4 = BADGES.find(b => b.id === 'weekly-wish-vote'); // weekly target 4

  assert.equal(progressPctOf(bPhoto, s, '2026-10-24'), 0);
  assert.equal(progressPctOf(bSignin7, s, '2026-10-24'), 0);
  assert.equal(progressPctOf(bWish4, s, '2026-10-24'), 0);

  // Quick completed
  s.completed['photo-finisher'] = true;
  assert.equal(progressPctOf(bPhoto, s, '2026-10-24'), 100);

  // Streak active
  s.streaks.signin = {
    current: 4,
    longest: 4,
    startedAt: '2026-10-21',
    last: '2026-10-24'
  };
  // 4 of 7 = 57%
  assert.equal(progressPctOf(bSignin7, s, '2026-10-24'), 57);

  // Streak target reached
  s.streaks.signin.current = 7;
  assert.equal(progressPctOf(bSignin7, s, '2026-10-24'), 100);

  // Weekly active
  s.weekly.wishVote = {
    weeks: ['2026-W41', '2026-W42', '2026-W43'],
    longest: 3
  };
  // 3 of 4 = 75%
  assert.equal(progressPctOf(bWish4, s, '2026-10-24'), 75);
});

test('filterBadges by status filters available, active, completed, locked', () => {
  const s = defaultState();
  const today = '2026-10-24';

  // default state: 0/21 completed
  const all = filterBadges(BADGES, s, {status: 'all'}, today);
  assert.equal(all.length, 21);

  const completed = filterBadges(BADGES, s, {status: 'completed'}, today);
  assert.equal(completed.length, 0);

  // By default, 30-day and 90-day streak badges are locked until 7-day is completed
  const locked = filterBadges(BADGES, s, {status: 'locked'}, today);
  assert.ok(locked.length > 0, 'some streak milestones should be locked initially');

  const available = filterBadges(BADGES, s, {status: 'available'}, today);
  assert.equal(available.length + locked.length, 21);

  // Complete a badge and verify
  s.completed['hello-world'] = true;
  const completedNow = filterBadges(BADGES, s, {status: 'completed'}, today);
  assert.equal(completedNow.length, 1);
  assert.equal(completedNow[0].id, 'hello-world');
});

test('filterBadges by phase filters to matching phase', () => {
  const s = defaultState();
  const today = '2026-10-24';

  for (const phase of PHASES) {
    const list = filterBadges(BADGES, s, {phase}, today);
    assert.ok(list.length > 0, `phase ${phase} should have badges`);
    assert.ok(list.every(b => b.phase === phase), `all badges must belong to ${phase}`);
  }

  const all = filterBadges(BADGES, s, {phase: 'all'}, today);
  assert.equal(all.length, 21);
});

test('filterBadges text search matches badge name, number, phase, and requirement', () => {
  const s = defaultState();
  const today = '2026-10-24';

  // Badge name
  const nameSearch = filterBadges(BADGES, s, {q: 'photo'}, today);
  assert.ok(nameSearch.some(b => b.id === 'photo-finisher'));

  // Exact number
  const numSearch1 = filterBadges(BADGES, s, {q: '01'}, today);
  assert.ok(numSearch1.some(b => b.n === 1));

  const numSearch2 = filterBadges(BADGES, s, {q: '#01'}, today);
  assert.ok(numSearch2.some(b => b.n === 1));

  const numSearch3 = filterBadges(BADGES, s, {q: '21'}, today);
  assert.ok(numSearch3.some(b => b.n === 21));

  // Phase search
  const phaseSearch = filterBadges(BADGES, s, {q: 'Foundation'}, today);
  assert.ok(phaseSearch.length >= 4);

  // Requirement text search
  const reqSearch = filterBadges(BADGES, s, {q: 'About'}, today);
  assert.ok(reqSearch.some(b => b.id === 'hello-world'));

  // Case insensitivity & trimming
  const trimSearch = filterBadges(BADGES, s, {q: '   HELLO   '}, today);
  assert.ok(trimSearch.some(b => b.id === 'hello-world'));

  // Non-matching query returns empty
  const noMatch = filterBadges(BADGES, s, {q: 'xyz-no-such-thing-exists'}, today);
  assert.equal(noMatch.length, 0);
});

test('filterBadges combines status, phase, and text search simultaneously', () => {
  const s = defaultState();
  const today = '2026-10-24';

  s.completed['hello-world'] = true;
  s.completed['photo-finisher'] = true;

  const result = filterBadges(BADGES, s, {
    status: 'completed',
    phase: 'Foundation',
    q: 'photo'
  }, today);

  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'photo-finisher');
});

test('sortBadges sorts by official number (default), progress % desc, effort asc, and status', () => {
  const s = defaultState();
  const today = '2026-10-24';

  // 1. Official #
  const byNum = sortBadges(BADGES, s, 'num', today);
  for (let i = 0; i < byNum.length - 1; i++) {
    assert.ok(byNum[i].n < byNum[i + 1].n, 'should be strictly ascending by badge number');
  }

  // 2. Progress desc
  s.completed['hello-world'] = true;
  s.streaks.signin = {
    current: 4,
    longest: 4,
    startedAt: '2026-10-21',
    last: '2026-10-24'
  };
  const byProg = sortBadges(BADGES, s, 'progress', today);
  assert.equal(byProg[0].id, 'hello-world', 'completed 100% badge should be first');
  // Next should have positive progress
  const pct0 = progressPctOf(byProg[0], s, today);
  const pct1 = progressPctOf(byProg[1], s, today);
  assert.ok(pct0 >= pct1);

  // 3. Effort asc
  const byEffort = sortBadges(BADGES, s, 'effort', today);
  assert.ok(byEffort.length === 21);
  // Quick/streak badges with 1-2 min should appear before 30-min article publish or community badges
  const firstEffort = byEffort[0];
  const lastEffort = byEffort[byEffort.length - 1];
  assert.ok(firstEffort.n !== lastEffort.n);

  // 4. Status
  // Hello world completed -> rank 4 (at end)
  // Signin streak active -> rank 1 (at start)
  const byStatus = sortBadges(BADGES, s, 'status', today);
  const activeBadge = byStatus[0];
  assert.equal(activeBadge.key, 'signin');
  const lastBadge = byStatus[byStatus.length - 1];
  assert.equal(lastBadge.id, 'hello-world');
});

test('sortBadges and filterBadges do not mutate input array', () => {
  const s = defaultState();
  const copy = [...BADGES];
  filterBadges(BADGES, s, {status: 'completed'});
  sortBadges(BADGES, s, 'progress');
  assert.deepEqual(BADGES.map(b => b.id), copy.map(b => b.id));
});
