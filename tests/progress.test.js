import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultState} from '../src/domain/store.js';
import {isFirstRun,rewardProgress} from '../src/domain/progress.js';
import {addDays} from '../src/domain/dates.js';

const TODAY = '2026-09-26';

function alive(current, daysAgo = 0) {
  return {
    current,
    longest: current,
    startedAt: addDays(TODAY, -current + 1 - daysAgo),
    last: addDays(TODAY, -daysAgo)
  };
}

test('isFirstRun returns true for empty/default state', () => {
  const s = defaultState();
  assert.equal(isFirstRun(s), true);
  assert.equal(isFirstRun(null), true);
  assert.equal(isFirstRun({}), true);
});

test('isFirstRun returns false when any badge is completed', () => {
  const s = defaultState();
  s.completed['hello-world'] = true;
  assert.equal(isFirstRun(s), false);
});

test('isFirstRun returns false when any override is set', () => {
  const s = defaultState();
  s.overrides['knowledge-seeker'] = 'active';
  assert.equal(isFirstRun(s), false);
});

test('isFirstRun returns false when activityLog contains entries', () => {
  const s = defaultState();
  s.activityLog[TODAY] = { signin: true };
  assert.equal(isFirstRun(s), false);
});

test('rewardProgress returns projectedBadges, targetBadges and projectedRewardDate', () => {
  const s = defaultState();
  s.streaks.signin = alive(6); // 1 day away from 7-day signin
  s.streaks.like = alive(5);   // 2 days away from 7-day like
  s.streaks.comment = alive(4);// 3 days away from 7-day comment

  const rp = rewardProgress(s, TODAY);
  assert.ok(Array.isArray(rp.projectedBadges));
  assert.ok(rp.projectedBadges.length >= 3);
  assert.equal(rp.projectedBadges[0].badge, 'streak-signin-7');
  assert.equal(rp.projectedBadges[0].date, addDays(TODAY, 1));
  assert.equal(rp.projectedBadges[1].badge, 'streak-like-7');
  assert.equal(rp.projectedBadges[1].date, addDays(TODAY, 2));
  assert.equal(rp.projectedBadges[2].badge, 'streak-comment-7');
  assert.equal(rp.projectedBadges[2].date, addDays(TODAY, 3));

  // Next reward tier is 7 (remainingToNext: 7)
  assert.equal(rp.remainingToNext, 7);
  // targetBadges slices up to 7 candidates
  assert.ok(rp.targetBadges.length <= 7);

  // If we have 6 completed real badges and need 1 more for tier 7:
  const nearTier = defaultState();
  nearTier.completed = {
    'knowledge-seeker': true,
    'hello-world': true,
    'photo-finisher': true,
    'discussion-debut': true,
    'first-wish': true,
    'first-article': true
  };
  nearTier.streaks.signin = alive(6); // unlocks streak-signin-7 tomorrow
  const rpNear = rewardProgress(nearTier, TODAY);
  assert.equal(rpNear.completed, 6);
  assert.equal(rpNear.remainingToNext, 1);
  assert.equal(rpNear.targetBadges.length, 1);
  assert.equal(rpNear.targetBadges[0].badge, 'streak-signin-7');
  assert.equal(rpNear.projectedRewardDate, addDays(TODAY, 1));
});
