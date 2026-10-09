// Delegated listeners survive route changes, which replace the header markup.
export function installNavigation(){
 function close(restoreFocus=false){
  const toggle=document.querySelector('[data-nav-toggle]');
  document.querySelector('.nav')?.classList.remove('menu-open');
  toggle?.setAttribute('aria-expanded','false');
  if(restoreFocus)toggle?.focus();
 }
 document.addEventListener('click',event=>{
  const toggle=event.target.closest('[data-nav-toggle]');
  if(toggle){
   const open=toggle.getAttribute('aria-expanded')!=='true';
   toggle.setAttribute('aria-expanded',String(open));
   toggle.closest('.nav').classList.toggle('menu-open',open);
  }else if(!event.target.closest('.nav')||event.target.closest('.nav nav a,.nav nav button'))close();
 });
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&document.querySelector('.nav.menu-open'))close(true);});
 document.addEventListener('focusin',event=>{if(!event.target.closest('.nav'))close();});
 window.addEventListener('hashchange',()=>close());
}
