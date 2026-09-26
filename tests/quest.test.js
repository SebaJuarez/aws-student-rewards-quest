import test from 'node:test';
import assert from 'node:assert/strict';

import {BADGES} from '../src/data/badges.js';
import {defaultState} from '../src/domain/store.js';
import {MAX_ACTIONS,PRIORITY,getAtRiskItems,getNextBestActions} from '../src/domain/quest.js';
import {rewardProgress} from '../src/domain/progress.js';
import {addDays} from '../src/domain/dates.js';

const TODAY='2026-09-25';   // Friday, ISO week 2026-W39
const SUNDAY='2026-09-27';  // closes the current window

function stateWith(parts={}){
  const s=defaultState();
  if(parts.completed!==undefined)s.completed=parts.completed;
  if(parts.overrides!==undefined)s.overrides=parts.overrides;
  if(parts.streaks)s.streaks={...s.streaks,...parts.streaks};
  if(parts.weekly)s.weekly={...s.weekly,...parts.weekly};
  return s;
}

function alive(current,last=TODAY){
  return {current,longest:current,startedAt:addDays(last,-(current-1)),last};
}
function atRisk(current){
  return {current,longest:current,startedAt:addDays(TODAY,-current),last:addDays(TODAY,-1)};
}
function oneTimeCompleted(){
  const map={};
  BADGES.filter(b=>b.type==='quick'||b.type==='community').forEach(b=>{map[b.id]=true});
  return map;
}
const find=(acts,id)=>acts.find(a=>a.id===id);

test('priority tiers are a fixed contract',()=>{
  assert.equal(PRIORITY.DAILY_AT_RISK,100);
  assert.equal(PRIORITY.LONG_START,90);
  assert.equal(PRIORITY.WEEKLY_WINDOW,80);
  assert.equal(PRIORITY.QUICK_WIN,70);
  assert.equal(PRIORITY.ENGAGEMENT,60);
  assert.equal(MAX_ACTIONS,5);
});

test('a daily streak at risk is the top action and an at-risk item',()=>{
  const s=stateWith({completed:{},streaks:{comment:atRisk(14)}});
  const acts=getNextBestActions(s,TODAY);
  const risk=find(acts,'risk-comment');
  assert.ok(risk,'risk-comment action missing');
  assert.equal(acts[0].id,'risk-comment','at-risk outranks everything else');
  assert.equal(risk.priority,PRIORITY.DAILY_AT_RISK);
  assert.equal(risk.type,'risk');
  assert.equal(risk.deadline,TODAY);
  assert.equal(risk.risk,'high');
  assert.equal(risk.estimatedMinutes,2);
  assert.match(risk.title,/log today's comment/i);
  assert.match(risk.description,/before the day ends/i);
  assert.equal(risk.status,'Day 14 of 90 - not logged today');
  assert.equal(risk.requirement,BADGES.find(b=>b.id==='streak-comment-30').req,'the next AWS milestone, not an invented one');
  assert.deepEqual(risk.relatedBadges,['streak-comment-7','streak-comment-30','streak-comment-90']);

  const items=getAtRiskItems(s,TODAY);
  const item=items.find(i=>i.id==='risk-comment');
  assert.ok(item,'risk-comment at-risk item missing');
  assert.equal(item.kind,'streak');
  assert.equal(item.label,'Comment streak');
  assert.equal(item.value,'14 days');
  assert.equal(item.deadline,TODAY);
  assert.match(item.copy,/before the day ends/i);
});

test('nothing is at risk when nothing can be lost',()=>{
  const fresh=defaultState();
  assert.deepEqual(getAtRiskItems(fresh,TODAY),[]);
  assert.equal(getNextBestActions(fresh,TODAY).some(a=>a.type==='risk'),false);

  const expired=stateWith({completed:{},streaks:{signin:{current:0,longest:12,startedAt:null,last:addDays(TODAY,-5)}}});
  assert.deepEqual(getAtRiskItems(expired,TODAY),[],'a lapsed run has already been lost, it is not "at risk"');
  assert.ok(find(getNextBestActions(expired,TODAY),'start-signin'),'but it still gets a start action');

  const logged=stateWith({completed:{},streaks:{comment:alive(14)},weekly:{wishVote:{weeks:['2026-W37','2026-W38','2026-W39'],longest:3},articlePublish:{weeks:['2026-W39'],longest:1}}});
  assert.deepEqual(getAtRiskItems(logged,TODAY),[],'logged today and this week -> no open exposure');
});

test('an unstarted family gets the long-runway start at priority 90',()=>{
  const s=defaultState();
  const start=find(getNextBestActions(s,TODAY),'start-comment');
  assert.ok(start);
  assert.equal(start.priority,PRIORITY.LONG_START);
  assert.equal(start.title,'Start the 90-day comment streak today');
  assert.equal(start.description,'Starting today gives you the longest possible runway.');
  assert.equal(start.deadline,null,'a start is an opportunity, not a deadline');
  assert.equal(start.risk,null);
  assert.equal(start.status,'Not started yet');

  const lapsed=stateWith({completed:{},streaks:{signin:{current:0,longest:12,startedAt:null,last:addDays(TODAY,-5)}}});
  const lapsedStart=find(getNextBestActions(lapsed,TODAY),'start-signin');
  assert.equal(lapsedStart.status,'Lapsed 5 days ago - best run 12 days');

  const live=stateWith({streaks:{signin:alive(5)}});
  assert.equal(getNextBestActions(live,TODAY).some(a=>a.id==='start-signin'),false,'a live run is not a start');
});

test('weekly window: deadline is the coming Sunday, copy stays honest',()=>{
  const s=stateWith({completed:{},weekly:{wishVote:{weeks:['2026-W37','2026-W38'],longest:2}}});
  const acts=getNextBestActions(s,TODAY);
  const w=find(acts,'weekly-wishVote');
  assert.ok(w);
  assert.equal(w.priority,PRIORITY.WEEKLY_WINDOW);
  assert.equal(w.deadline,SUNDAY);
  assert.equal(w.risk,'medium');
  assert.deepEqual(w.progress,{current:2,target:4,label:'Week 2 / 4'});
  assert.match(w.status,/Week 2 \/ 4/);
  assert.match(w.status,/window closes Sep 27/);
  assert.equal(w.requirement,BADGES.find(b=>b.id==='weekly-wish-vote').req);
  assert.doesNotMatch(`${w.title} ${w.description} ${w.status}`,/weeks left|week left/i);

  const item=getAtRiskItems(s,TODAY).find(i=>i.id==='weekly-wishVote');
  assert.ok(item);
  assert.equal(item.kind,'week');
  assert.equal(item.value,'2 weeks');
  assert.equal(item.deadline,SUNDAY);
  assert.match(item.copy,/Sep 27/);

  const single=stateWith({completed:{},weekly:{wishVote:{weeks:['2026-W38'],longest:1}}});
  assert.equal(getAtRiskItems(single,TODAY).find(i=>i.id==='weekly-wishVote').value,'1 week','singular when the run is one week old');
  assert.equal(getAtRiskItems(stateWith({completed:{},streaks:{comment:atRisk(1)}}),TODAY).find(i=>i.id==='risk-comment').value,'1 day');

  const pending=stateWith({completed:{},weekly:{wishVote:{weeks:[],longest:0}}});
  const wPending=find(getNextBestActions(pending,TODAY),'weekly-wishVote');
  assert.ok(wPending,'a pending window still deserves an action');
  assert.equal(wPending.deadline,SUNDAY);
  assert.equal(wPending.risk,null,'not started is not a risk');
  assert.deepEqual(wPending.progress,{current:0,target:4,label:'0 / 4 weeks'});
  assert.equal(getAtRiskItems(pending,TODAY).find(i=>i.id==='weekly-wishVote'),undefined);

  const doneWeek=stateWith({completed:{},weekly:{wishVote:{weeks:['2026-W37','2026-W38','2026-W39'],longest:3}}});
  assert.equal(getNextBestActions(doneWeek,TODAY).some(a=>a.id==='weekly-wishVote'),false,'this week is already logged');
});

test('quick wins carry estimate, personal status and the AWS requirement',()=>{
  const s=stateWith({completed:{},streaks:{signin:alive(3),like:alive(3),comment:alive(3)},weekly:{wishVote:{weeks:['2026-W39'],longest:1},articlePublish:{weeks:['2026-W39'],longest:1}}});
  const acts=getNextBestActions(s,TODAY);
  const quick=find(acts,'quick-knowledge-seeker');
  assert.ok(quick);
  assert.equal(quick.priority,PRIORITY.QUICK_WIN);
  assert.equal(quick.type,'quick_win');
  assert.equal(quick.estimatedMinutes,2);
  assert.equal(quick.status,'Not completed yet');
  assert.equal(quick.requirement,BADGES.find(b=>b.id==='knowledge-seeker').req);
  assert.equal(quick.deadline,null);
  assert.equal(quick.risk,null);

  const fast=find(acts,'quick-photo-finisher');
  assert.ok(fast);
  assert.equal(fast.estimatedMinutes,1);

  const done=stateWith({completed:{'knowledge-seeker':true}});
  assert.equal(getNextBestActions(done,TODAY).some(a=>a.id==='quick-knowledge-seeker'),false);
});

test('community goals rank last and have no fixed estimate',()=>{
  const quicksOnly={};
  BADGES.filter(b=>b.type==='quick').forEach(b=>{quicksOnly[b.id]=true});
  const s=stateWith({completed:quicksOnly,streaks:{signin:alive(3),like:alive(3),comment:alive(3)},weekly:{wishVote:{weeks:['2026-W39'],longest:1},articlePublish:{weeks:['2026-W39'],longest:1}}});
  const acts=getNextBestActions(s,TODAY);
  assert.equal(acts.length,4,'only the four community goals remain');
  const eng=find(acts,'engage-conversation-starter');
  assert.ok(eng);
  assert.equal(eng.priority,PRIORITY.ENGAGEMENT);
  assert.equal(eng.type,'engagement');
  assert.equal(eng.estimatedMinutes,null);
  assert.equal(eng.deadline,null);
  assert.equal(eng.risk,null);
  assert.equal(eng.status,'Not completed yet');
  assert.equal(eng.requirement,BADGES.find(b=>b.id==='conversation-starter').req);
});

test('ranking is deterministic, non-increasing and capped at 5',()=>{
  const s=stateWith({
    completed:{},
    streaks:{signin:alive(30),comment:atRisk(14)},
    weekly:{wishVote:{weeks:['2026-W37','2026-W38'],longest:2},articlePublish:{weeks:['2026-W39'],longest:1}}
  });
  const acts=getNextBestActions(s,TODAY);
  assert.equal(acts.length,MAX_ACTIONS);
  const pri=acts.map(a=>a.priority);
  for(let i=1;i<pri.length;i++){
    assert.ok(pri[i]<=pri[i-1],`priorities must not rise: ${JSON.stringify(pri)}`);
  }
  assert.deepEqual(pri,[100,90,80,70,70]);
  assert.deepEqual(acts.map(a=>a.id),['risk-comment','start-like','weekly-wishVote','quick-knowledge-seeker','quick-hello-world']);
  assert.deepEqual(getNextBestActions(s,TODAY).map(a=>a.id),acts.map(a=>a.id),'same state, same order');

  const fresh=getNextBestActions(defaultState(),TODAY);
  assert.ok(fresh.length>=3&&fresh.length<=MAX_ACTIONS,'a fresh account shows 3-5 actions');
  assert.deepEqual(new Set(fresh.map(a=>a.id)).size,fresh.length,'no duplicated ids');
  assert.deepEqual(new Set(getAtRiskItems(s,TODAY).map(i=>i.id)).size,getAtRiskItems(s,TODAY).length);
});

test('every action exposes the full model (WHAT / WHY / TIME / AFFECTS)',()=>{
  const s=stateWith({completed:{},streaks:{comment:atRisk(14)},weekly:{wishVote:{weeks:['2026-W37','2026-W38'],longest:2}}});
  const acts=getNextBestActions(s,TODAY);
  assert.ok(acts.length>0);
  for(const a of acts){
    for(const key of ['id','title','description','priority','type','relatedBadges','estimatedMinutes','deadline','risk','reason','status','requirement','basis']){
      assert.ok(key in a,`${a.id} is missing ${key}`);
    }
    assert.ok(a.title.length>0,`${a.id} needs a WHAT`);
    assert.ok(a.description.length>0,`${a.id} needs a WHY`);
    assert.ok(a.estimatedMinutes===null||(Number.isInteger(a.estimatedMinutes)&&a.estimatedMinutes>0),`${a.id} TIME`);
    assert.ok(a.deadline===null||/^\d{4}-\d{2}-\d{2}$/.test(a.deadline),`${a.id} deadline`);
    assert.ok(a.relatedBadges.length>0,`${a.id} needs AFFECTS`);
    for(const id of a.relatedBadges){
      assert.ok(BADGES.some(b=>b.id===id),`${a.id} names unknown badge ${id}`);
    }
    assert.equal(a.basis,'recommended');
  }
});

test('recommendations never speak as AWS requirements',()=>{
  const banned=/(aws requires|required by aws|\byou must\b|\bmandatory\b|officially required)/i;
  const states=[
    defaultState(),
    stateWith({completed:{},streaks:{comment:atRisk(14)}}),
    stateWith({completed:{},weekly:{wishVote:{weeks:['2026-W37','2026-W38'],longest:2}}}),
    stateWith({completed:{},streaks:{signin:{current:0,longest:12,startedAt:null,last:addDays(TODAY,-5)}}})
  ];
  for(const s of states){
    for(const a of getNextBestActions(s,TODAY)){
      assert.ok(!banned.test(a.title),`${a.id} title speaks as a mandate`);
      assert.ok(!banned.test(a.description),`${a.id} description speaks as a mandate`);
      assert.ok(!banned.test(a.status),`${a.id} status speaks as a mandate`);
      assert.ok(!banned.test(a.requirement||''),`${a.id} requirement must be an AWS paraphrase`);
    }
    for(const r of getAtRiskItems(s,TODAY)){
      assert.ok(!banned.test(r.copy),`${r.id} copy speaks as a mandate`);
    }
  }
});

test('fully earned and fully logged -> empty quest, empty risk list',()=>{
  const weeks=['2026-W36','2026-W37','2026-W38','2026-W39'];
  const s=stateWith({
    completed:oneTimeCompleted(),
    streaks:{signin:alive(90),like:alive(90),comment:alive(90)},
    weekly:{wishVote:{weeks,longest:4},articlePublish:{weeks,longest:4}}
  });
  assert.deepEqual(getNextBestActions(s,TODAY),[]);
  assert.deepEqual(getAtRiskItems(s,TODAY),[]);
  const rp=rewardProgress(s,TODAY);
  assert.deepEqual(rp.actionsNeeded,[]);
  assert.equal(rp.completed,21);
  assert.equal(rp.remaining,0);
  assert.equal(rp.remainingToNext,0);
  assert.equal(rp.next.label,'All 21 complete');
  assert.equal(rp.milestoneDate,null,'no badge is left to project');
});

test('rewardProgress reports the next reward, gap and honest milestone dates',()=>{
  const s=stateWith({completed:{},streaks:{comment:alive(6)}});
  const rp=rewardProgress(s,TODAY);
  assert.equal(rp.completed,0);
  assert.equal(rp.total,21);
  assert.equal(rp.remaining,21);
  assert.equal(rp.remainingToNext,7);
  assert.equal(rp.next.n,7);
  assert.equal(rp.next.label,'7 badges → $10 credits');
  assert.equal(rp.milestoneDate,addDays(TODAY,1),'day 7 of the comment run is tomorrow');
  assert.equal(rp.milestoneBadge,'streak-comment-7');
  assert.equal(rp.milestoneName,'7-Day Comment Streak');
  assert.ok(rp.actionsNeeded.length>0&&rp.actionsNeeded.length<=MAX_ACTIONS);

  const atRiskState=stateWith({completed:{},streaks:{comment:atRisk(6)}});
  const rpRisk=rewardProgress(atRiskState,TODAY);
  assert.equal(rpRisk.milestoneDate,null,'a run not logged today cannot be projected');
  assert.equal(rpRisk.milestoneBadge,null);

  const sW=stateWith({completed:{},weekly:{wishVote:{weeks:['2026-W37','2026-W38','2026-W39'],longest:3}}});
  const rpW=rewardProgress(sW,TODAY);
  assert.equal(rpW.milestoneBadge,'weekly-wish-vote');
  assert.equal(rpW.milestoneDate,'2026-10-04','4/4 lands on the Sunday of week 2026-W40');
  assert.equal(rpW.milestoneName,'4-Week Wish Vote Streak');

  const pinned=stateWith({completed:{},overrides:{'streak-comment-7':'completed'},streaks:{comment:alive(6)}});
  const rpPinned=rewardProgress(pinned,TODAY);
  assert.notEqual(rpPinned.milestoneBadge,'streak-comment-7','a pinned badge is never projected');
  assert.equal(rpPinned.milestoneDate,addDays(TODAY,24),'the projection moves to the next unearned badge (day 30)');

  const heldBack=stateWith({completed:{},overrides:{'streak-comment-7':'not_started'},streaks:{comment:alive(6)}});
  assert.notEqual(rewardProgress(heldBack,TODAY).milestoneBadge,'streak-comment-7','even a not_started pin holds the badge back');
});
