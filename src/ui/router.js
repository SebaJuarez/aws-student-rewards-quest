// Lightweight hash router for the six in-app views. Deliberately not a routing
// framework: one hash segment (`#/badges`) plus optional query params for
// view-local state (`#/badges?phase=Foundation`). All DOM work lives in
// applyRoute(); module code stays importable without a browser.

export const VIEWS=['overview','badges','activity','timeline','sources','settings'];
export const DEFAULT_VIEW='overview';

export function parseHash(hash){
  const raw=String(hash==null?'':hash).replace(/^#/,'');
  const clean=raw.startsWith('/')?raw.slice(1):raw;
  const [name,query]=clean.split('?');
  const view=VIEWS.includes(name)?name:DEFAULT_VIEW;
  let params;
  try{params=new URLSearchParams(query||'')}catch(e){params=new URLSearchParams()}
  return {view,params};
}

export function viewHref(view,query){
  let q='';
  if(query){
    if(typeof query==='string'){
      q=query?(query.startsWith('?')?query:`?${query}`):'';
    }else if(query instanceof URLSearchParams){
      const s=query.toString();
      q=s?`?${s}`:'';
    }else if(typeof query==='object'){
      const params=new URLSearchParams();
      for(const [k,v] of Object.entries(query)){
        if(v!=null&&v!=='')params.set(k,v);
      }
      const s=params.toString();
      q=s?`?${s}`:'';
    }
  }
  return `#/${VIEWS.includes(view)?view:DEFAULT_VIEW}${q}`;
}

let route={view:DEFAULT_VIEW,params:new URLSearchParams()};
let listener=null;
let lastView=null;

export function currentRoute(){return route}

// Parse the initial hash and report every hash change through onChange(route).
// The initial route is returned, not delivered - the caller renders once.
export function initRouter(onChange){
  listener=onChange;
  route=parseHash(typeof location!=='undefined'?location.hash:'');
  if(typeof window!=='undefined'){
    window.addEventListener('hashchange',()=>{
      const next=parseHash(location.hash);
      route=next;
      if(listener)listener(route);
    });
  }
  return route;
}

// Show only the active view, mark its nav link, scroll to the top when the view
// actually changed, and keep the active link visible inside the horizontal nav
// scroller (mobile). Called after every route change; state re-renders never touch
// visibility, so they do not need this.
export function applyRoute(){
  if(typeof document==='undefined')return;
  const viewChanged=lastView!==route.view;
  lastView=route.view;
  document.querySelectorAll('[data-view]').forEach(el=>{
    el.hidden=el.dataset.view!==route.view;
  });
  document.querySelectorAll('[data-nav]').forEach(a=>{
    const on=a.dataset.nav===route.view;
    a.classList.toggle('active',on);
    if(on)a.setAttribute('aria-current','page');
    else a.removeAttribute('aria-current');
  });
  if(viewChanged&&typeof window!=='undefined'&&window.scrollTo)window.scrollTo(0,0);
  if(viewChanged){
    const a=document.querySelector('[data-nav].active');
    const nav=a&&a.closest('.nav');
    if(nav&&nav.scrollWidth>nav.clientWidth+1){
      const lr=a.getBoundingClientRect();
      const nr=nav.getBoundingClientRect();
      if(lr.left<nr.left||lr.right>nr.right){
        nav.scrollLeft=nav.scrollLeft+(lr.left-nr.left)-(nav.clientWidth-lr.width)/2;
      }
    }
  }
}
