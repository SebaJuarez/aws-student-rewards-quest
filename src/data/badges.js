const SR={signin:'Sign in to Builder Center on {N} consecutive days.',like:'Like at least one community post on {N} consecutive days.',comment:'Leave a meaningful, on-topic comment on {N} consecutive days.'};
export const SL={signin:'Sign-in',like:'Like',comment:'Comment'};
export const WL={wishVote:'Wish vote',articlePublish:'Article publishing'};

// What AWS itself states about a badge family (Builder Center FAQ, source s8).
// null = AWS has not published anything badge-specific -> "Verification needed".
const OFFICIAL_STREAK={
 signin:"AWS lists maintaining activity streaks among the program's badge actions (Builder Center FAQ). Exact per-badge wording: Verification needed.",
 like:"AWS lists maintaining activity streaks among the program's badge actions (Builder Center FAQ). Exact per-badge wording: Verification needed.",
 comment:"AWS lists commenting and activity streaks among the program's badge actions (Builder Center FAQ). Exact per-badge wording: Verification needed."
};

const streakBadge=(n,name,phase,key,target)=>{
 const parts={
  signin:[['s9',`threshold: visit daily for ${target} consecutive days while signed in`],['s6',`step: log in daily for ${target} days`]],
  like:[['s9',`threshold: like content every day for ${target} days`],['s6',`step: like community content daily for ${target} days`]],
  comment:[['s9',`threshold: comment every day for ${target} days`],['s2',`habit: leave a meaningful comment daily for ${target} days`]]
 }[key];
 return {id:'streak-'+key+'-'+target,n,name,phase,type:'streak',key,target,req:SR[key].replace('{N}',target),official:OFFICIAL_STREAK[key],sources:parts.map(([id,part])=>({id,part}))};
};

export const BADGES=[
 {id:'knowledge-seeker',n:1,name:'Knowledge Seeker',phase:'Foundation',type:'quick',req:'Read 10 different articles on Builder Center.',dur:'~2 min',
  sources:[{id:'s9',part:'threshold: read 10 different articles'},{id:'s3',part:'threshold: read 10 articles'}]},
 {id:'hello-world',n:2,name:'Hello, World!',phase:'Foundation',type:'quick',req:'Complete the About section of your Builder Center profile.',dur:'~5 min',
  official:'Completing the About section of your profile earns this badge — confirmed by the official Builder Center FAQ.',
  sources:[{id:'s9',part:"wording: complete your profile's About section"},{id:'s6',part:'step: complete your profile settings'},{id:'s2',part:'step: complete your profile'}]},
 {id:'photo-finisher',n:3,name:'Photo Finisher',phase:'Foundation',type:'quick',req:'Add a profile photo to your Builder Center profile.',dur:'~1 min',
  official:'Uploading a profile photo earns this badge — confirmed by the official Builder Center FAQ.',
  sources:[{id:'s9',part:'threshold: upload a profile photo'},{id:'s6',part:'step: upload a profile picture'}]},
 {id:'discussion-debut',n:4,name:'Discussion Debut',phase:'Foundation',type:'quick',req:'Debut in the community with your first comment or discussion post.',dur:'~5 min',
  sources:[{id:'s6',part:'step: post in a Space that interests you'},{id:'s3',part:'step: leave your first comment'},{id:'s2',part:'step: participate in your first discussion'}]},
 {id:'first-wish',n:5,name:'First Wish',phase:'Foundation',type:'quick',req:'Submit your first Wish (feature request) to the Wishlist.',dur:'~5 min',
  sources:[{id:'s9',part:'threshold: publish your first AWS Wishlist item'},{id:'s6',part:'step: submit a feature idea in the Wishlist'}]},
 {id:'first-article',n:6,name:'First Article',phase:'Foundation',type:'quick',req:'Publish your first article on Builder Center.',dur:'~30 min',
  official:"AWS lists publishing an article among the program's badge actions (Builder Center FAQ). Exact per-badge wording: Verification needed.",
  sources:[{id:'s9',part:'threshold: publish your first article'},{id:'s6',part:'step: publish something you learned'}]},
 streakBadge(7,'7-Day Sign-In Streak','7-Day Streaks','signin',7),
 streakBadge(8,'7-Day Like Streak','7-Day Streaks','like',7),
 streakBadge(9,'7-Day Comment Streak','7-Day Streaks','comment',7),
 {id:'weekly-wish-vote',n:10,name:'4-Week Wish Vote Streak',phase:'4-Week Consistency',type:'weekly',key:'wishVote',target:4,req:'Vote on a community Wish every week for 4 straight weeks.',
  sources:[{id:'s9',part:'threshold: vote once per week for 4 consecutive weeks'},{id:'s6',part:'cadence: vote on a Wishlist idea each week'}]},
 {id:'weekly-article',n:11,name:'4-Week Article Publishing Streak',phase:'4-Week Consistency',type:'weekly',key:'articlePublish',target:4,req:'Publish at least one article every week for 4 straight weeks.',
  sources:[{id:'s9',part:'threshold: publish an article every week for 4 consecutive weeks'},{id:'s6',part:'cadence: publish one article per week'}]},
 streakBadge(12,'30-Day Sign-In Streak','30-Day Streaks','signin',30),
 streakBadge(13,'30-Day Like Streak','30-Day Streaks','like',30),
 streakBadge(14,'30-Day Comment Streak','30-Day Streaks','comment',30),
 {id:'conversation-starter',n:15,name:'Conversation Starter',phase:'Community Engagement',type:'community',req:'Get replies on 10 of your comments.',
  sources:[{id:'s9',part:'threshold: replies on 10 of your comments'},{id:'s3',part:'threshold: replies on 10 comments'}]},
 {id:'meaningful-contributor',n:16,name:'Meaningful Contributor',phase:'Community Engagement',type:'community',req:'Get 10 likes on each of 5 different comments.',
  sources:[{id:'s9',part:'threshold: 10 likes on 5 different comments'},{id:'s3',part:'threshold: 10 likes on 5 different comments'}]},
 {id:'valued-creator',n:17,name:'Valued Creator',phase:'Community Engagement',type:'community',req:'Get 10 likes on each of 5 different articles.',
  sources:[{id:'s9',part:'threshold: 10 likes on 5 different articles'},{id:'s3',part:'threshold: 10 likes on 5 different articles'}]},
 {id:'idea-influencer',n:18,name:'Idea Influencer',phase:'Community Engagement',type:'community',req:'Get 10 votes on your Wishes.',
  sources:[{id:'s9',part:'threshold: 10 votes on your wishes'},{id:'s3',part:'threshold: 10 votes on your Wishes'}]},
 streakBadge(19,'90-Day Sign-In Streak','90-Day Endgame','signin',90),
 streakBadge(20,'90-Day Like Streak','90-Day Endgame','like',90),
 streakBadge(21,'90-Day Comment Streak','90-Day Endgame','comment',90),
];

export const PHASES=['Foundation','7-Day Streaks','4-Week Consistency','30-Day Streaks','Community Engagement','90-Day Endgame'];
