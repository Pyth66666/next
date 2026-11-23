// Admin: list of users with their plan, usage and progress, and one user's activity.
const when=t=>t?new Date(t).toLocaleString(undefined,{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'—';
const signIn=list=>list.map(p=>p==='github'?'GitHub':p==='google'?'Google':'Email').join(', ');
const num=n=>Number(n||0).toLocaleString();
const PLAN_LABELS={pending:'Waiting',basic:'Basic',pro:'Pro'};

// Plan dropdown; changing it saves straight away.
const planSelect=(id,plan,esc)=>`<select class="admin-plan" data-admin-plan="${esc(id)}" aria-label="Plan">${Object.entries(PLAN_LABELS).map(([v,l])=>`<option value="${v}"${v===plan?' selected':''}>${l}</option>`).join('')}</select>`;

function bindPlans(root,api){
 root.addEventListener('change',async e=>{
  const sel=e.target.closest('[data-admin-plan]');if(!sel)return;
  sel.disabled=true;
  try{await api(`/api/admin/users/${encodeURIComponent(sel.dataset.adminPlan)}/plan`,'POST',{plan:sel.value});sel.dataset.saved='1';}
  catch(err){alert(err.message);}
  finally{sel.disabled=false;}
 });
}

export async function adminUsersPage({app,header,esc,api,nav}){
 app.innerHTML=`${header(true)}<main class="account-page wrap admin-users"><div class="eyebrow">ADMIN</div><h1>Users</h1><p><a class="button light" href="#admin/activity">See everyone’s activity →</a></p><div id="admin-users">Loading…</div></main>`;nav();
 const box=app.querySelector('#admin-users');
 try{
  const users=await api('/api/admin/users');if(location.hash!=='#admin/users')return;
  const waiting=users.filter(u=>u.plan==='pending').length;
  box.innerHTML=users.length?`<p>${users.length} ${users.length===1?'user':'users'}${waiting?` · <strong>${waiting} waiting for approval</strong>`:''}</p><div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Email</th><th>Plan</th><th>Scans this month</th><th>Tokens this month</th><th>Signed in with</th><th>Last active</th><th>Ideas</th><th>Apps</th><th>Questions</th></tr></thead><tbody>${users.map(u=>`<tr><td><a href="#admin/users/${esc(u.id)}">${esc(u.email)}</a></td><td>${planSelect(u.id,u.plan,esc)}</td><td>${u.scansThisMonth}</td><td>${num(u.tokensThisMonth)}</td><td>${signIn(u.signIn)}</td><td>${when(u.lastActive)}</td><td>${u.projects}</td><td>${u.apps}</td><td>${u.questions}</td></tr>`).join('')}</tbody></table></div>`:'<p>No users yet.</p>';
  bindPlans(box,api);
 }catch(e){box.textContent=e.message;}
}

export async function adminUserPage({app,header,esc,api,nav,id}){
 app.innerHTML=`${header(true)}<main class="account-page wrap admin-users"><a class="text-link" href="#admin/users">← All users</a><div id="admin-user">Loading…</div></main>`;nav();
 const box=app.querySelector('#admin-user');
 try{
  const u=await api('/api/admin/users/'+encodeURIComponent(id));if(location.hash!=='#admin/users/'+id)return;
  box.innerHTML=`<h1>${esc(u.email)}</h1><p>Signed in with ${signIn(u.signIn)} · joined ${when(u.created)} · ${u.quizzesPassed} quizzes passed</p>
<div class="admin-usage"><label>Plan ${planSelect(u.id,u.plan,esc)}</label><span><strong>${u.scansThisMonth}</strong> scans this month</span><span><strong>${num(u.tokensThisMonth)}</strong> tokens this month</span><span><strong>${num(u.tokensAllTime)}</strong> tokens in total</span></div>
<h2>Ideas (${u.projects.length})</h2>${u.projects.length?`<ul class="admin-list">${u.projects.map(p=>`<li><strong>${esc(p.name)}</strong><span>${p.questionsAnswered}/5 questions answered${p.briefReady?' · brief ready':''}${p.pitch?' · pitch started':''} · ${when(p.created)}</span></li>`).join('')}</ul>`:'<p>None yet.</p>'}
<h2>Apps (${u.apps.length})</h2>${u.apps.length?`<ul class="admin-list">${u.apps.map(a=>`<li><strong>${esc(a.name)}</strong><span>${a.source==='upload'?'Uploaded':'GitHub'} · ${a.files} files · ${a.explained?'lesson made '+when(a.explainedAt):'no lesson yet'}</span></li>`).join('')}</ul>`:'<p>None yet.</p>'}
<h2>Recent questions (${u.questions.length})</h2>${u.questions.length?`<ul class="admin-list">${u.questions.map(q=>`<li><strong>${esc(q.question)}</strong><span>${esc(q.app)} · ${when(q.at)}</span></li>`).join('')}</ul>`:'<p>None yet.</p>'}`;
  bindPlans(box,api);
 }catch(e){box.textContent=e.message;}
}
