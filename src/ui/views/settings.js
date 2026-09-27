import {storageInfo} from '../../domain/store.js';

function fmtBytes(n){
  if(n<1024)return `${n} B`;
  return `${(n/1024).toFixed(1)} KB`;
}

export function renderSettings(s){
  const info=storageInfo();
  document.getElementById('storageInfo').innerHTML=`
    <div>key: ${info.key}</div>
    <div>saved: ${fmtBytes(info.bytes)} · state version: v${info.version}</div>
    <div>legacy backups: ${info.legacy.length?info.legacy.join(', '):'none'}</div>
    <div>local browser storage only — data never leaves this device</div>`;
  const ro=s&&s.mode==='community';
  const hint=ro?'Switch to Personal Mode to change your data':'';
  ['btnReset','btnImport'].forEach(id=>{
    const el=document.getElementById(id);
    if(!el)return;
    el.disabled=!!ro;
    el.title=hint;
  });
}
