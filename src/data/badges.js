const SR={signin:'Sign in to Builder Center on {N} consecutive days.',like:'Like at least one community post on {N} consecutive days.',comment:'Leave a meaningful, on-topic comment on {N} consecutive days.'};
export const SL={signin:'Sign-in',like:'Like',comment:'Comment'};

const streakBadge=(n,name,phase,key,target)=>({id:'streak-'+key+'-'+target,n,name,phase,type:'streak',key,target,req:SR[key].replace('{N}',target)});

export const BADGES=[
 {id:'knowledge-seeker',n:1,name:'Knowledge Seeker',phase:'Foundation',type:'quick',req:'Sign in and browse Builder Center articles as part of onboarding.',dur:'~2 min'},
 {id:'hello-world',n:2,name:'Hello, World!',phase:'Foundation',type:'quick',req:'Set up and complete your Builder Center profile.',dur:'~5 min'},
 {id:'photo-finisher',n:3,name:'Photo Finisher',phase:'Foundation',type:'quick',req:'Add a profile photo to your account.',dur:'~1 min'},
 {id:'discussion-debut',n:4,name:'Discussion Debut',phase:'Foundation',type:'quick',req:'Post your first comment on a community article.',dur:'~5 min'},
 {id:'first-wish',n:5,name:'First Wish',phase:'Foundation',type:'quick',req:'Submit your first product Wish (feature request).',dur:'~5 min'},
 {id:'first-article',n:6,name:'First Article',phase:'Foundation',type:'quick',req:'Publish your first article on Builder Center.',dur:'~30 min'},
 streakBadge(7,'7-Day Sign-In Streak','7-Day Streaks','signin',7),
 streakBadge(8,'7-Day Like Streak','7-Day Streaks','like',7),
 streakBadge(9,'7-Day Comment Streak','7-Day Streaks','comment',7),
 {id:'weekly-wish-vote',n:10,name:'4-Week Wish Vote Streak',phase:'4-Week Consistency',type:'weekly',key:'wishVote',target:4,req:'Vote on a community Wish every week for 4 straight weeks.'},
 {id:'weekly-article',n:11,name:'4-Week Article Publishing Streak',phase:'4-Week Consistency',type:'weekly',key:'articlePublish',target:4,req:'Publish at least one article every week for 4 straight weeks.'},
 streakBadge(12,'30-Day Sign-In Streak','30-Day Streaks','signin',30),
 streakBadge(13,'30-Day Like Streak','30-Day Streaks','like',30),
 streakBadge(14,'30-Day Comment Streak','30-Day Streaks','comment',30),
 {id:'conversation-starter',n:15,name:'Conversation Starter',phase:'Community Engagement',type:'community',req:'Spark replies from other builders on your posts and articles.'},
 {id:'meaningful-contributor',n:16,name:'Meaningful Contributor',phase:'Community Engagement',type:'community',req:'Give high-value, detailed answers in comment threads.'},
 {id:'valued-creator',n:17,name:'Valued Creator',phase:'Community Engagement',type:'community',req:'Publish content that earns strong likes and comments.'},
 {id:'idea-influencer',n:18,name:'Idea Influencer',phase:'Community Engagement',type:'community',req:'Create popular Wishes and drive discussion around them.'},
 streakBadge(19,'90-Day Sign-In Streak','90-Day Endgame','signin',90),
 streakBadge(20,'90-Day Like Streak','90-Day Endgame','like',90),
 streakBadge(21,'90-Day Comment Streak','90-Day Endgame','comment',90),
];

export const PHASES=['Foundation','7-Day Streaks','4-Week Consistency','30-Day Streaks','Community Engagement','90-Day Endgame'];
