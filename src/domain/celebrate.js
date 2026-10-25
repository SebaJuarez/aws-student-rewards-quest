import {BADGES} from '../data/badges.js';
import {REWARD_TIERS} from '../data/rewards.js';
import {statusOf,completedCount} from './status.js';
import {todayStr} from './dates.js';

export function cloneState(s){
  return s?JSON.parse(JSON.stringify(s)):null;
}

export function diffAchievements(beforeState,afterState,today=todayStr()){
  const badges=[];
  const tiers=[];
  if(!afterState)return {badges,tiers};

  for(const b of BADGES){
    const wasDone=beforeState?statusOf(b,beforeState,today)==='completed':false;
    const isDone=statusOf(b,afterState,today)==='completed';
    if(!wasDone&&isDone){
      badges.push(b);
    }
  }

  const beforeCount=beforeState?completedCount(beforeState,today):0;
  const afterCount=completedCount(afterState,today);

  for(const tier of REWARD_TIERS){
    const [target]=tier;
    if(beforeCount<target&&afterCount>=target){
      tiers.push(tier);
    }
  }

  return {badges,tiers};
}
