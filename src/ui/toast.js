let timer=null;

export function hideToast(){
  const t=document.getElementById('toast');
  if(t)t.classList.remove('show');
  if(timer){clearTimeout(timer);timer=null;}
}

export function toast(msg,options={}){
  const t=document.getElementById('toast');
  if(!t)return;
  clearTimeout(timer);

  t.textContent='';
  const span=document.createElement('span');
  span.className='toast-msg';
  span.textContent=msg;
  t.appendChild(span);

  if(options?.action?.label&&typeof options.action.onClick==='function'){
    const btn=document.createElement('button');
    btn.className='toast-action';
    btn.type='button';
    btn.textContent=options.action.label;
    btn.onclick=()=>{
      hideToast();
      options.action.onClick();
    };
    t.appendChild(btn);
  }

  t.classList.add('show');
  const dur=options?.duration??(options?.action?6000:2200);
  timer=setTimeout(()=>{
    t.classList.remove('show');
  },dur);
}
