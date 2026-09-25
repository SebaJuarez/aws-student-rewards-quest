export const todayStr=()=>new Date().toISOString().slice(0,10);
export const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
export const fmt=(d)=>d.toLocaleDateString('en-US',{month:'short',day:'numeric'});
