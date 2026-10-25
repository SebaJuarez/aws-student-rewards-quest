export function confirmDialog({title='Confirm',body='',confirmLabel='Confirm',danger=false}={}){
  const dlg=document.getElementById('confirmDialog');
  if(!dlg||typeof dlg.showModal!=='function'){
    return Promise.resolve(window.confirm(body||title));
  }

  const titleEl=document.getElementById('dialogTitle');
  const bodyEl=document.getElementById('dialogBody');
  const confirmBtn=document.getElementById('dialogConfirm');
  const cancelBtn=document.getElementById('dialogCancel');
  const closeBtn=document.getElementById('dialogClose');

  if(titleEl)titleEl.textContent=title;
  if(bodyEl)bodyEl.textContent=body;
  if(confirmBtn){
    confirmBtn.textContent=confirmLabel;
    confirmBtn.className=danger?'btn danger':'btn primary';
  }

  return new Promise((resolve)=>{
    let settled=false;

    const cleanup=()=>{
      dlg.removeEventListener('close',onClose);
      dlg.removeEventListener('cancel',onCancel);
      if(cancelBtn)cancelBtn.removeEventListener('click',onCancelClick);
      if(closeBtn)closeBtn.removeEventListener('click',onCancelClick);
      dlg.removeEventListener('click',onBackdropClick);
    };

    const finish=(val)=>{
      if(settled)return;
      settled=true;
      cleanup();
      if(dlg.open)dlg.close();
      resolve(val);
    };

    const onClose=()=>{
      finish(dlg.returnValue==='confirm');
    };

    const onCancel=(e)=>{
      e.preventDefault();
      finish(false);
    };

    const onCancelClick=()=>{
      finish(false);
    };

    const onBackdropClick=(e)=>{
      if(e.target===dlg){
        finish(false);
      }
    };

    dlg.returnValue='';
    dlg.addEventListener('close',onClose);
    dlg.addEventListener('cancel',onCancel);
    if(cancelBtn)cancelBtn.addEventListener('click',onCancelClick);
    if(closeBtn)closeBtn.addEventListener('click',onCancelClick);
    dlg.addEventListener('click',onBackdropClick);

    const form=dlg.querySelector('form');
    if(form){
      form.onsubmit=(e)=>{
        e.preventDefault();
        dlg.returnValue='confirm';
        finish(true);
      };
    }

    dlg.showModal();
    if(cancelBtn)cancelBtn.focus();
  });
}
