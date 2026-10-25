const CACHE_NAME='aws-student-rewards-v1';
const ASSETS=[
  './',
  './index.html',
  './manifest.webmanifest',
  './src/app.js',
  './src/icons/icon.svg',
  './src/styles/tokens.css',
  './src/styles/base.css',
  './src/styles/layout.css',
  './src/styles/components.css',
  './src/styles/overlays.css',
  './src/styles/overview.css',
  './src/styles/badges.css',
  './src/styles/feedback.css',
  './src/styles/responsive.css',
  './src/styles/fonts.css',
  './src/data/badges.js',
  './src/data/rewards.js',
  './src/data/sources.js',
  './src/domain/dates.js',
  './src/domain/status.js',
  './src/domain/activity.js',
  './src/domain/activityLog.js',
  './src/domain/badgeQuery.js',
  './src/domain/progress.js',
  './src/domain/quest.js',
  './src/domain/store.js',
  './src/domain/celebrate.js',
  './src/domain/calendar.js',
  './src/ui/escape.js',
  './src/ui/toast.js',
  './src/ui/dialog.js',
  './src/ui/drawer.js',
  './src/ui/router.js',
  './src/ui/celebrate.js',
  './src/ui/render.js',
  './src/ui/events.js',
  './src/ui/views/header.js',
  './src/ui/views/hero.js',
  './src/ui/views/quicklog.js',
  './src/ui/views/quest.js',
  './src/ui/views/streaks.js',
  './src/ui/views/weekly.js',
  './src/ui/views/rewards.js',
  './src/ui/views/overview.js',
  './src/ui/views/badges.js',
  './src/ui/views/activity.js',
  './src/ui/views/timeline.js',
  './src/ui/views/sources.js',
  './src/ui/views/settings.js'
];

self.addEventListener('install',(e)=>{
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache)=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',(e)=>{
  e.waitUntil(
    caches.keys().then((keys)=>
      Promise.all(keys.filter((k)=>k!==CACHE_NAME).map((k)=>caches.delete(k)))
    ).then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',(e)=>{
  if(e.request.method!=='GET')return;
  e.respondWith(
    caches.match(e.request).then((cached)=>{
      if(cached){
        fetch(e.request).then((resp)=>{
          if(resp&&resp.status===200){
            caches.open(CACHE_NAME).then((cache)=>cache.put(e.request,resp));
          }
        }).catch(()=>{});
        return cached;
      }
      return fetch(e.request).then((resp)=>{
        if(resp&&resp.status===200){
          const clone=resp.clone();
          caches.open(CACHE_NAME).then((cache)=>cache.put(e.request,clone));
        }
        return resp;
      });
    })
  );
});
