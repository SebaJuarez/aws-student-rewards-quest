const DATE_RE=/^\d{4}-\d{2}-\d{2}$/;
const WEEK_RE=/^(\d{4})-W(\d{1,2})$/;
const DAY_MS=86400000;
const pad=(n,w)=>String(n).padStart(w,'0');

export function todayStr(){
  const d=new Date();
  return `${pad(d.getFullYear(),4)}-${pad(d.getMonth()+1,2)}-${pad(d.getDate(),2)}`;
}

export function dateStr(d){
  if(!(d instanceof Date)||Number.isNaN(d.getTime()))return null;
  return `${pad(d.getFullYear(),4)}-${pad(d.getMonth()+1,2)}-${pad(d.getDate(),2)}`;
}

export function parseLocalDate(s){
  if(typeof s!=='string'||!DATE_RE.test(s))return null;
  const y=Number(s.slice(0,4)),m=Number(s.slice(5,7)),day=Number(s.slice(8,10));
  if(m<1||m>12||day<1||day>31)return null;
  const d=new Date(y,m-1,day,0,0,0,0);
  if(d.getFullYear()!==y||d.getMonth()!==m-1||d.getDate()!==day)return null;
  return d;
}

export const isValidDateStr=(s)=>parseLocalDate(s)!==null;

function dayMs(s){
  const d=parseLocalDate(s);
  if(!d)return null;
  return Date.UTC(d.getFullYear(),d.getMonth(),d.getDate());
}

function msToDayStr(ms){
  const d=new Date(ms);
  return `${pad(d.getUTCFullYear(),4)}-${pad(d.getUTCMonth()+1,2)}-${pad(d.getUTCDate(),2)}`;
}

export function addDays(s,n){
  const ms=dayMs(s);
  if(ms===null||!Number.isFinite(n))return null;
  return msToDayStr(ms+Math.trunc(n)*DAY_MS);
}

export function daysBetween(a,b){
  const x=dayMs(a),y=dayMs(b);
  if(x===null||y===null)return null;
  return Math.round((y-x)/DAY_MS);
}

export function formatDate(s){
  const d=typeof s==='string'?parseLocalDate(s):(s instanceof Date?s:null);
  if(!d)return '';
  return d.toLocaleDateString('en-US',{month:'short',day:'numeric'});
}

export function formatMonth(s){
  const d=typeof s==='string'?parseLocalDate(s):(s instanceof Date?s:null);
  if(!d)return '';
  return d.toLocaleDateString('en-US',{month:'short'});
}

export function weekdayIndex(s){
  const ms=dayMs(s);
  if(ms===null)return null;
  return (new Date(ms).getUTCDay()+6)%7;
}

function isoParts(s){
  const ms=dayMs(s);
  if(ms===null)return null;
  const dow=(new Date(ms).getUTCDay()+6)%7;
  return {thu:ms+(3-dow)*DAY_MS};
}

function firstThursdayUTC(year){
  const jan4=Date.UTC(year,0,4);
  const dow=(new Date(jan4).getUTCDay()+6)%7;
  return jan4+(3-dow)*DAY_MS;
}

export function weekKeyOf(s){
  const parts=isoParts(s);
  if(!parts)return null;
  const d=new Date(parts.thu);
  const year=d.getUTCFullYear();
  const week=1+Math.round((parts.thu-firstThursdayUTC(year))/(7*DAY_MS));
  if(week<1||week>53)return null;
  return `${year}-W${pad(week,2)}`;
}

function weekThursday(w){
  const m=typeof w==='string'?WEEK_RE.exec(w):null;
  if(!m)return null;
  const year=Number(m[1]),week=Number(m[2]);
  if(week<1||week>53)return null;
  const ms=firstThursdayUTC(year)+(week-1)*7*DAY_MS;
  const d=new Date(ms);
  return `${pad(d.getUTCFullYear(),4)}-${pad(d.getUTCMonth()+1,2)}-${pad(d.getUTCDate(),2)}`;
}

export function normWeekKey(w){
  if(typeof w!=='string')return null;
  const m=WEEK_RE.exec(w.trim());
  if(!m)return null;
  const year=Number(m[1]),week=Number(m[2]);
  if(week<1||week>53)return null;
  const key=`${year}-W${pad(week,2)}`;
  return weekKeyOf(weekThursday(key))===key?key:null;
}

export const isWeekKey=(w)=>normWeekKey(w)!==null;

export function addWeeks(w,n){
  const thu=weekThursday(normWeekKey(w));
  if(thu===null||!Number.isFinite(n))return null;
  return weekKeyOf(addDays(thu,Math.trunc(n)*7));
}

export function weekDiff(a,b){
  const ta=weekThursday(normWeekKey(a)),tb=weekThursday(normWeekKey(b));
  if(ta===null||tb===null)return null;
  return daysBetween(ta,tb)/7;
}

// Sunday (ISO week end) of a "YYYY-Www" key — used for weekly-window deadlines.
export function weekEndDate(w){
  const thu=weekThursday(normWeekKey(w));
  return thu===null?null:addDays(thu,3);
}
