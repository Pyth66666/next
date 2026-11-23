// Admin: everything users have searched and made (#admin/activity), newest first, with
// filters and a CSV download of the same filtered list.
const when=t=>t?new Date(t).toLocaleString(undefined,{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'—';
const GROUPS=[['','Everything'],['ideas','Idea searches'],['learn','Learn my app'],['projects','Projects & pitches']];

export function adminActivityPage({app,header,esc,api,nav}){
 const state={group:'',q:'',user:''};let timer=null,seq=0;
 const query=()=>new URLSearchParams(Object.entries(state).filter(([,v])=>v)).toString();

 app.innerHTML=`${header(true)}<main class="account-page wrap admin-activity">
  <div class="eyebrow">ADMIN</div><h1>User activity</h1>
  <p>What every user has searched and made: idea checks and brainstorms, apps added, files explained, tutor questions, projects and pitches. Newest first.</p>
  <div class="activity-tools">
   <div class="activity-groups" role="group" aria-label="Show">${GROUPS.map(([id,l])=>`<button type="button" data-activity-group="${id}" aria-pressed="${id===''}" class="${id===''?'on':''}">${l}</button>`).join('')}</div>
   <label><span class="sr-only">Search text</span><input id="activity-q" type="search" placeholder="Search ideas, questions, briefs…"></label>
   <label><span class="sr-only">Filter by user email</span><input id="activity-user" type="search" placeholder="User email"></label>
   <a class="button dark" id="activity-csv" href="/api/admin/activity.csv" download>Download CSV</a>
  </div>
  <p class="activity-count" role="status"></p>
  <ol id="activity-list" class="activity-list"><li class="activity-empty">Loading…</li></ol>
  <p><a class="text-link" href="#admin/users">← All users</a></p>
 </main>`;
 nav();

 const list=app.querySelector('#activity-list'),count=app.querySelector('.activity-count'),csv=app.querySelector('#activity-csv');
 async function load(){
  const mine=++seq,qs=query();
  csv.href='/api/admin/activity.csv'+(qs?'?'+qs:'');
  try{
   const items=await api('/api/admin/activity'+(qs?'?'+qs:''));
   if(mine!==seq||location.hash!=='#admin/activity')return;
   count.textContent=items.length?`${items.length}${items.length===500?'+ (showing the newest 500 — the CSV has all)':''} item${items.length===1?'':'s'}`:'';
   list.innerHTML=items.length?items.map(i=>`<li class="activity-item"><details><summary><span class="activity-kind activity-${esc(i.kind)}">${esc(i.label)}</span><span class="activity-title">${esc(i.title)}</span><span class="activity-meta">${esc(i.email)} · ${when(i.at)}</span></summary>${i.detail?`<pre>${esc(i.detail)}</pre>`:'<p class="activity-empty">No more detail.</p>'}</details></li>`).join(''):'<li class="activity-empty">Nothing matches yet. Idea searches are saved from now on; older ones were never stored.</li>';
  }catch(e){if(mine===seq)list.innerHTML=`<li class="activity-empty">${esc(e.message)}</li>`;}
 }

 app.querySelector('.activity-tools').addEventListener('click',e=>{
  const b=e.target.closest('[data-activity-group]');if(!b)return;
  state.group=b.dataset.activityGroup;
  app.querySelectorAll('[data-activity-group]').forEach(x=>{const on=x===b;x.classList.toggle('on',on);x.setAttribute('aria-pressed',String(on));});
  load();
 });
 app.querySelector('.activity-tools').addEventListener('input',e=>{
  if(e.target.id==='activity-q')state.q=e.target.value;else if(e.target.id==='activity-user')state.user=e.target.value;else return;
  clearTimeout(timer);timer=setTimeout(load,300);
 });
 load();
}
