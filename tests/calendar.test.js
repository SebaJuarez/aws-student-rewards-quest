import test from 'node:test';
import assert from 'node:assert/strict';
import {generateICS} from '../src/domain/calendar.js';

test('generateICS produces valid iCalendar format with headers and footers', () => {
  const ics = generateICS(null, { today: '2026-10-24' });
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n'));
  assert.ok(ics.includes('VERSION:2.0\r\n'));
  assert.ok(ics.includes('PRODID:-//AWS Student Rewards Quest//EN\r\n'));
  assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
});

test('generateICS creates daily habit event with recurrence and alarm', () => {
  const ics = generateICS(null, { today: '2026-10-24', dailyTime: '19:30' });
  assert.ok(ics.includes('SUMMARY:AWS Student Rewards — Daily Habit'));
  assert.ok(ics.includes('DTSTART:20261024T193000'));
  assert.ok(ics.includes('RRULE:FREQ=DAILY;COUNT=90'));
  assert.ok(ics.includes('BEGIN:VALARM'));
  assert.ok(ics.includes('TRIGGER:-PT15M'));
});

test('generateICS includes weekly Sunday deadlines and milestones', () => {
  const state = {
    startedAt: '2026-10-24',
    streaks: { signin: { current: 1 } }
  };
  const ics = generateICS(state, { today: '2026-10-24' });
  assert.ok(ics.includes('SUMMARY:AWS Student Rewards — Weekly Window Closes Today'));
  assert.ok(ics.includes('Day 1 Milestone'));
  assert.ok(ics.includes('Day 7 Milestone'));
  assert.ok(ics.includes('VALUE=DATE:20261024'));
});
