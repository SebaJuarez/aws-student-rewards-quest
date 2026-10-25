import {addDays,todayStr,weekEndDate,weekKeyOf} from './dates.js';
import {timelineModel} from './progress.js';

function escapeICS(str){
  if(!str)return '';
  return String(str)
    .replace(/\\/g,'\\\\')
    .replace(/;/g,'\\;')
    .replace(/,/g,'\\,')
    .replace(/\r?\n/g,'\\n');
}

function toCompactDate(dateStr){
  return (dateStr||'').replace(/-/g,'');
}

export function generateICS(state,options={}){
  const today=options.today||todayStr();
  const time=(options.dailyTime||'20:00').replace(':','')+'00';
  const nowStamp=toCompactDate(today)+'T120000Z';
  const {milestones}=timelineModel(state,today);

  const lines=[
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AWS Student Rewards Quest//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:AWS Student Rewards Quest'
  ];

  // 1. Daily habit recurring event
  const startDayCompact=toCompactDate(today);
  lines.push(
    'BEGIN:VEVENT',
    `UID:daily-habit-${today}@aws-student-rewards-quest`,
    `DTSTAMP:${nowStamp}`,
    `DTSTART:${startDayCompact}T${time}`,
    'RRULE:FREQ=DAILY;COUNT=90',
    'SUMMARY:AWS Student Rewards — Daily Habit',
    'DESCRIPTION:Log your daily Sign-in\\, Like\\, and Comment streaks on AWS Builder Center.',
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    'DESCRIPTION:AWS Student Rewards: Daily habit reminder',
    'END:VALARM',
    'END:VEVENT'
  );

  // 2. Weekly deadlines (upcoming 4 Sundays)
  const seenSundays=new Set();
  for(let i=0;i<4;i++){
    const d=addDays(today,i*7);
    const wk=weekKeyOf(d);
    const sunday=weekEndDate(wk);
    if(!sunday||seenSundays.has(sunday))continue;
    seenSundays.add(sunday);
    const sunCompact=toCompactDate(sunday);
    lines.push(
      'BEGIN:VEVENT',
      `UID:weekly-deadline-${wk}@aws-student-rewards-quest`,
      `DTSTAMP:${nowStamp}`,
      `DTSTART;VALUE=DATE:${sunCompact}`,
      'SUMMARY:AWS Student Rewards — Weekly Window Closes Today',
      'DESCRIPTION:Remember to submit your weekly Wish vote and Article publish before the week ends.',
      'END:VEVENT'
    );
  }

  // 3. Journey milestones
  milestones.forEach(m=>{
    if(!m.date)return;
    const mCompact=toCompactDate(m.date);
    const title=m.note?`AWS Student Rewards: Day ${m.day} Milestone — ${m.note}`:`AWS Student Rewards: Day ${m.day} Milestone`;
    lines.push(
      'BEGIN:VEVENT',
      `UID:milestone-day-${m.day}@aws-student-rewards-quest`,
      `DTSTAMP:${nowStamp}`,
      `DTSTART;VALUE=DATE:${mCompact}`,
      `SUMMARY:${escapeICS(title)}`,
      `DESCRIPTION:${escapeICS(m.note||`Milestone Day ${m.day}`)}`,
      'END:VEVENT'
    );
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n')+'\r\n';
}
