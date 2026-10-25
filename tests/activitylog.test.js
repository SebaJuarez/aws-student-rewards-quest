import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ACTIVITY_KEYS,activeDayCount,activeDaysInRange,activitySummary,clearActivity,countActivities,
  dayKeys,daysWith,heatmapModel,hasActivity,logHasWeek,normalizeLog,
  rebuildStreaks,rebuildWeekly,writeActivity
} from '../src/domain/activityLog.js';
import {timelineModel} from '../src/domain/progress.js';
import {addDays,todayStr,weekdayIndex} from '../src/domain/dates.js';

const TODAY=todayStr();

function day(date,...keys){
  const out={};
  keys.forEach(k=>{out[k]=true});
  return {[date]:out};
}

test('activity keys are the five things a user can do',()=>{
  assert.deepEqual(ACTIVITY_KEYS,['signin','like','comment','wishVote','articlePublish']);
});

test('normalizeLog keeps only real activities on real days',()=>{
  const log=normalizeLog({
    '2026-09-25':{signin:true,like:false,comment:'yes',unknown:true},
    '2026-09-24':{like:true},
    '2026-09-23':{like:false,unknown:true}
  });
  assert.deepEqual(log,{'2026-09-25':{signin:true,comment:true},'2026-09-24':{like:true}});
  assert.equal('2026-09-23' in log,false,'empty days are not stored');
});

test('normalizeLog rejects broken structures instead of guessing',()=>{
  assert.deepEqual(normalizeLog(undefined),{});
  assert.deepEqual(normalizeLog(null),{});
  assert.throws(()=>normalizeLog('nope'),/activityLog/);
  assert.throws(()=>normalizeLog(['2026-09-25']),/activityLog/);
  assert.throws(()=>normalizeLog({'someday':{signin:true}}),/invalid date/);
  assert.throws(()=>normalizeLog({'2026-09-25':'signin'}),/activityLog\.2026-09-25/);
});

test('writeActivity is idempotent and keeps activities in a stable order',()=>{
  let log=day('2026-09-25','comment');
  const first=writeActivity(log,'2026-09-25','comment');
  assert.deepEqual(first,log,'logging the same day twice changes nothing');

  log=writeActivity(log,'2026-09-25','signin');
  log=writeActivity(log,'2026-09-25','wishVote');
  assert.deepEqual(Object.keys(log['2026-09-25']),['signin','comment','wishVote']);

  const reordered=normalizeLog({'2026-09-25':{wishVote:true,comment:true,signin:true}});
  assert.deepEqual(reordered,log,'write order and validation agree on the shape');

  assert.equal(writeActivity(log,'nope','signin'),log,'invalid dates are refused');
  assert.equal(writeActivity(log,'2026-09-25','nope'),log,'unknown activities are refused');
});

test('clearActivity removes one activity and drops days that become empty',()=>{
  let log={};
  log=writeActivity(log,'2026-09-25','signin');
  log=writeActivity(log,'2026-09-25','like');
  log=writeActivity(log,'2026-09-24','signin');
  const cleared=clearActivity(log,'signin');
  assert.deepEqual(cleared,{'2026-09-25':{like:true}});
  assert.deepEqual(clearActivity(cleared,'like'),{});
});

test('a day can be queried by date and by activity',()=>{
  const log={'2026-09-25':{signin:true,like:true},'2026-09-24':{signin:true}};
  assert.deepEqual(dayKeys(log,'2026-09-25'),['signin','like']);
  assert.deepEqual(dayKeys(log,'2026-09-20'),[]);
  assert.equal(hasActivity(log,'2026-09-25','signin'),true);
  assert.equal(hasActivity(log,'2026-09-25','comment'),false);
  assert.deepEqual(daysWith(log,'signin'),['2026-09-24','2026-09-25']);
  assert.equal(countActivities(log),3);
  assert.equal(activeDayCount(log),2);
  assert.equal(logHasWeek(log,'signin','2026-W39'),true);
  assert.equal(logHasWeek(log,'comment','2026-W39'),false);
});

test('rebuildStreaks reconstructs a run, a gap restart and the record',()=>{
  const run={};
  for(let i=0;i<4;i++)Object.assign(run,day(addDays('2026-09-25',-i),'signin'));
  const rebuilt=rebuildStreaks(run,{signin:{current:0,longest:0,startedAt:null,last:null}});
  assert.equal(rebuilt.signin.current,4);
  assert.equal(rebuilt.signin.startedAt,'2026-09-22');
  assert.equal(rebuilt.signin.last,'2026-09-25');

  const gapped={...run,...day('2026-09-30','signin')};
  const afterGap=rebuildStreaks(gapped,{signin:{current:4,longest:4,startedAt:'2026-09-22',last:'2026-09-25'}});
  assert.equal(afterGap.signin.current,1);
  assert.equal(afterGap.signin.longest,4,'longest never goes down');

  const empty=rebuildStreaks({}, {signin:{current:9,longest:9,startedAt:'2026-06-01',last:'2026-06-09'}});
  assert.equal(empty.signin.current,0,'no day in the log means no run');
  assert.equal(empty.signin.last,'2026-06-09','the last-logged record survives with no days');
  assert.equal(empty.signin.startedAt,null);
  assert.equal(empty.signin.longest,9);
});

test('rebuildStreaks ignores a stored counter that the log does not support',()=>{
  const rebuilt=rebuildStreaks(day(TODAY,'like'),{like:{current:40,longest:40,startedAt:'2026-06-01',last:TODAY}});
  assert.equal(rebuilt.like.current,1);
  assert.equal(rebuilt.like.longest,40);
});

test('rebuildWeekly reconstructs weeks from days and keeps the legacy baseline',()=>{
  const log={};
  Object.assign(log,day('2026-09-25','wishVote'));
  Object.assign(log,day('2026-09-26','wishVote'));
  Object.assign(log,day('2026-09-30','wishVote'));

  const rebuilt=rebuildWeekly(log,{wishVote:{weeks:['2026-W37'],longest:1}});
  assert.deepEqual(rebuilt.wishVote.weeks,['2026-W37','2026-W39','2026-W40'],'two days in one week count once and old weeks are kept');
  assert.equal(rebuilt.wishVote.longest,2,'W37 is isolated, the record is the W39-W40 run');

  const noBaseline=rebuildWeekly(log,{wishVote:{weeks:[],longest:0}});
  assert.deepEqual(noBaseline.wishVote.weeks,['2026-W39','2026-W40']);
  assert.equal(noBaseline.wishVote.longest,2);
});

test('activitySummary answers today, the last week, recent and totals',()=>{
  let log={};
  Object.assign(log,day(addDays(TODAY,-8),'signin'));
  Object.assign(log,day(addDays(TODAY,-2),'signin','like'));
  Object.assign(log,day(TODAY,'signin','wishVote'));
  const summary=activitySummary({activityLog:log},TODAY);

  assert.deepEqual(summary.today.keys,['signin','wishVote']);
  assert.equal(summary.last7.length,7);
  assert.equal(summary.last7[6].date,TODAY);
  assert.equal(summary.last7.some(d=>d.date===addDays(TODAY,-8)),false,'the 7-day window is 7 days');
  assert.equal(summary.last7Total,4,'2 activities today + 2 two days ago');
  assert.deepEqual(summary.recent.map(d=>d.date),[TODAY,addDays(TODAY,-2),addDays(TODAY,-8)]);
  assert.equal(summary.totals.signin,3);
  assert.equal(summary.totals.comment,0);
  assert.equal(summary.total,5);
  assert.equal(summary.activeDays,3);
});

test('timelineModel is the single source for start, day number and milestones',()=>{
  const s={startedAt:addDays(TODAY,-6)};
  const model=timelineModel(s,TODAY);
  assert.equal(model.start,s.startedAt);
  assert.equal(model.day,7);
  assert.deepEqual(model.milestones.map(m=>m.label),['Day 1','Day 7','Day 30','Day 90']);
  assert.equal(model.milestones[0].date,s.startedAt);
  assert.equal(model.milestones[0].reached,true);
  assert.equal(model.milestones[1].date,TODAY,'Day 7 is exactly 6 days after the start');
  assert.equal(model.milestones[1].reached,true);
  assert.equal(model.milestones[2].reached,false);
  assert.equal(model.milestones[3].reached,false);
  assert.equal(model.milestones[0].now,true,'the first week of a run is the "now" step');

  const fresh=timelineModel({startedAt:TODAY},TODAY);
  assert.equal(fresh.day,1);
});

test('heatmapModel lays out exactly 90 days in Mon-Sun week columns',()=>{
  const model=heatmapModel({activityLog:{}},TODAY);
  const cells=model.columns.flatMap(c=>c.cells);
  assert.equal(cells.filter(c=>!c.outside).length,90);
  assert.ok(model.columns.length===13||model.columns.length===14,`unexpected column count ${model.columns.length}`);
  model.columns.forEach(col=>{
    assert.equal(col.cells.length,7);
    assert.equal(weekdayIndex(col.cells[0].date),0,'every column starts on a Monday');
  });
  const inWindow=cells.filter(c=>!c.outside);
  assert.equal(inWindow[0].date,model.start,'the window opens exactly 89 days before today');
  assert.equal(inWindow[inWindow.length-1].date,TODAY,'the most recent in-window day is today');
  assert.equal(inWindow[inWindow.length-1].today,true);
  assert.ok(inWindow.every(c=>c.date>=model.start&&c.date<=TODAY));
});

test('heatmap cells report activity, milestones, lost streaks and risk',()=>{
  let log={};
  for(let i=0;i<7;i++)Object.assign(log,day(addDays(TODAY,-10-i),'signin'));
  const streaks={signin:{current:7,longest:7,startedAt:addDays(TODAY,-16),last:addDays(TODAY,-10)}};
  const model=heatmapModel({activityLog:log,startedAt:addDays(TODAY,-6),streaks},TODAY);

  const active=model.byDate[addDays(TODAY,-10)];
  assert.equal(active.active,true);
  assert.equal(active.count,1);
  assert.deepEqual(active.keys,['signin']);

  const lost=model.byDate[addDays(TODAY,-9)];
  assert.deepEqual(lost.lost,['signin'],'the day after a 7-day run ends is a lost day');

  assert.deepEqual(model.byDate[addDays(TODAY,-10)].lost,[],'the last day of the run is not a loss');
  assert.equal(model.byDate[TODAY].milestone,'Day 7');
  assert.equal(model.byDate[addDays(TODAY,-6)].milestone,'Day 1');
  assert.equal(model.byDate[TODAY].risk,false,'nothing to lose if the run already ended');
});

test('today is flagged as risk only while a streak is still alive but unlogged',()=>{
  const streaks={signin:{current:5,longest:5,startedAt:addDays(TODAY,-5),last:addDays(TODAY,-1)}};
  const model=heatmapModel({activityLog:{},streaks},TODAY);
  assert.equal(model.byDate[TODAY].risk,true);

  const logged={signin:{current:5,longest:5,startedAt:addDays(TODAY,-4),last:TODAY}};
  const done=heatmapModel({activityLog:day(TODAY,'signin'),streaks:logged},TODAY);
  assert.equal(done.byDate[TODAY].risk,false);

  const dead={signin:{current:5,longest:5,startedAt:addDays(TODAY,-20),last:addDays(TODAY,-20)}};
  assert.equal(heatmapModel({activityLog:{},streaks:dead},TODAY).byDate[TODAY].risk,false);
});

test('a short run does not paint a lost day',()=>{
  let log={};
  for(let i=0;i<6;i++)Object.assign(log,day(addDays(TODAY,-5-i),'comment'));
  const model=heatmapModel({activityLog:log},TODAY);
  assert.deepEqual(model.byDate[addDays(TODAY,-4)].lost,[],'losing a 6-day run is not marked as a lost streak');
});

test('a run whose deadline is today is risk, never a lost day',()=>{
  let log={};
  for(let i=0;i<7;i++)Object.assign(log,day(addDays(TODAY,-1-i),'signin'));
  const streaks={signin:{current:7,longest:7,startedAt:addDays(TODAY,-7),last:addDays(TODAY,-1)}};
  const model=heatmapModel({activityLog:log,streaks},TODAY);
  assert.deepEqual(model.byDate[TODAY].lost,[],'today is still the deadline, the run has not ended');
  assert.equal(model.byDate[TODAY].risk,true,'the unlogged run is at risk today');
  assert.deepEqual(model.byDate[addDays(TODAY,-1)].lost,[],'the last logged day is not a loss');
});

test('milestone days come from the same timeline the timeline section uses',()=>{
  const s={startedAt:addDays(TODAY,-29)};
  const fromTimeline=timelineModel(s,TODAY).milestones.map(m=>m.date);
  const model=heatmapModel({...s,activityLog:{}},TODAY);
  fromTimeline.forEach(date=>{
    const cell=model.byDate[date];
    if(cell)assert.ok(cell.milestone,`${date} should be marked as a milestone`);
  });
  assert.equal(model.byDate[addDays(TODAY,-29)].milestone,'Day 1');
  assert.equal(model.byDate[addDays(TODAY,-23)].milestone,'Day 7');
  assert.equal(model.byDate[TODAY].milestone,'Day 30');
});

test('activeDaysInRange counts days with any activity inside an inclusive range',()=>{
  const log={
    '2026-09-20':{signin:true},
    '2026-09-21':{like:true,comment:true},
    '2026-09-23':{wishVote:true},
    '2026-09-30':{signin:true}
  };
  assert.equal(activeDaysInRange(log,'2026-09-18','2026-09-25'),3);
  assert.equal(activeDaysInRange(log,'2026-09-21','2026-09-21'),1,'inclusive on both ends');
  assert.equal(activeDaysInRange(log,'2026-09-24','2026-09-29'),0,'days without entries never count');
  assert.equal(activeDaysInRange(log,'2026-09-30','2026-09-18'),0,'reversed ranges are refused');
  assert.equal(activeDaysInRange(null,'2026-09-18','2026-09-25'),0);
  assert.equal(activeDaysInRange({},null,'2026-09-25'),0);
});


test('personalRecords extracts best streaks and best week', async () => {
  const {personalRecords} = await import('../src/domain/activityLog.js');
  const state = {
    streaks: {
      signin: { longest: 35 },
      like: { longest: 12 },
      comment: { longest: 7 }
    },
    weekly: {
      wishVote: { longest: 4 },
      articlePublish: { longest: 2 }
    },
    activityLog: {
      '2026-09-20': { signin: true, like: true },
      '2026-09-21': { signin: true },
      '2026-09-22': { signin: true, like: true, comment: true }
    }
  };
  const res = personalRecords(state);
  assert.equal(res.longest.signin, 35);
  assert.equal(res.longest.like, 12);
  assert.equal(res.longest.comment, 7);
  assert.equal(res.longest.wishVote, 4);
  assert.equal(res.longest.articlePublish, 2);
  assert.equal(res.totalActiveDays, 3);
  assert.equal(res.totalActivities, 6);
  assert.ok(res.bestWeek);
  assert.equal(res.bestWeek.count, 4);

  const empty = personalRecords(null);
  assert.equal(empty.longest.signin, 0);
  assert.equal(empty.bestWeek, null);
  assert.equal(empty.totalActiveDays, 0);
});
