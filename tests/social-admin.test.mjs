import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createApplication} from '../backend/app.mjs';
import {configuration} from '../backend/config.mjs';
import {buildCodeTour,tourText,parseLooseJson} from '../backend/code-tour.mjs';

test('code tour JSON survives one stray closing brace from the model',()=>{
 assert.deepEqual(parseLooseJson('```json\n{"framework":{"name":"R"},"summary":"s"},"pieces":[]}\n```'),{framework:{name:'R'},summary:'s',pieces:[]});
 assert.equal(parseLooseJson('not json'),null);
});

async function fixture(t,{verified=true,defaultPlan}={}){
 const dataDir=mkdtempSync(join(tmpdir(),'apex-social-'));
 const service={
  async ai(system,prompt){if(!prompt.startsWith('Teach a'))return {text:'ok',model:'test-model',usage:null};await new Promise(r=>setTimeout(r,150));const file=/FILE (\S+)/.exec(prompt)[1];return {text:JSON.stringify({framework_name:'JS',framework_plain:'',summary:'s',pieces:[{file,start:1,end:1,title:'T',purpose:'',lines:[{line:1,explain:'Line one.'}]}]}),model:'test-model',usage:{prompt_tokens:10,completion_tokens:5}};},
  async github(path){if(path==='/user')return {id:4242,login:'octo'};if(path==='/user/emails')return [{email:'Octo@Example.com',primary:true,verified}];throw Error('Unexpected GitHub request: '+path);},
  async fetcher(url){
   if(url.includes('oauth2.googleapis.com/token')||url.includes('github.com/login/oauth/access_token'))return new Response(JSON.stringify({access_token:'provider-token'}));
   if(url.includes('openidconnect.googleapis.com'))return new Response(JSON.stringify({sub:'g-1',email:'person@example.com',email_verified:verified}));
   throw Error('Unexpected fetch: '+url);
  }
 };
 const config={...configuration({}),dataDir,port:0,githubId:'gh-client',githubSecret:'gh-secret',googleId:'g-client',googleSecret:'g-secret',adminUserIds:[],adminEmails:[],...(defaultPlan?{defaultPlan}:{})};
 const app=createApplication({config,providers:service});
 await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${app.server.address().port}`;
 t.after(async()=>{await new Promise(r=>app.server.close(r));app.store.db.close();rmSync(dataDir,{recursive:true,force:true});});
 function client(){let cookie='',csrf='';return {async request(path,method='GET',data){const r=await fetch(base+path,{method,redirect:'manual',headers:{Origin:config.origin,...(cookie?{Cookie:cookie}:{}),...(csrf?{'X-CSRF-Token':csrf}:{}),...(data?{'Content-Type':'application/json'}:{})},...(data?{body:JSON.stringify(data)}:{})});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];const text=await r.text();let value;try{value=JSON.parse(text);}catch{value=text;}if(value?.csrf)csrf=value.csrf;return {status:r.status,value,location:r.headers.get('location')};}};}
 // Runs the provider round trip: start -> (provider) -> callback.
 async function signIn(c,provider,next=''){const start=await c.request(`/api/auth/${provider}/start${next}`);assert.equal(start.status,302);const state=new URL(start.location).searchParams.get('state');return c.request(`/api/auth/${provider}/callback?code=abc&state=${state}`);}
 return {client,signIn,app,config,async makeBoss(c){const r=await c.request('/api/auth/register','POST',{email:'boss@example.com',password:'long password here'});config.adminUserIds.push(r.value.user.id);return r;}};
}

test('config lists the sign-in providers that are switched on',async t=>{
 const f=await fixture(t);
 assert.deepEqual((await f.client().request('/api/config')).value.loginProviders,['google','github']);
});

test('Google sign-in creates an account, then signs the same person back in',async t=>{
 const f=await fixture(t),c=f.client();
 const start=await c.request('/api/auth/google/start');const auth=new URL(start.location);
 assert.equal(auth.host,'accounts.google.com');assert.equal(auth.searchParams.get('code_challenge_method'),'S256');assert.match(auth.searchParams.get('redirect_uri'),/\/api\/auth\/google\/callback$/);
 const done=await f.signIn(c,'google','?next=%23repositories');assert.equal(done.status,302);assert.equal(done.location,'/#repositories');
 const me=(await c.request('/api/auth/me')).value;assert.equal(me.user.email,'person@example.com');
 const again=f.client();await f.signIn(again,'google');assert.equal((await again.request('/api/auth/me')).value.user.id,me.user.id);
});

test('GitHub sign-in links to an existing email account and connects GitHub',async t=>{
 const f=await fixture(t),c=f.client();
 const reg=await c.request('/api/auth/register','POST',{email:'octo@example.com',password:'long password here'});assert.equal(reg.status,200);
 const g=f.client();await f.signIn(g,'github');const me=(await g.request('/api/auth/me')).value;
 assert.equal(me.user.id,reg.value.user.id);assert.equal(me.github.login,'octo');
});

test('sign-in rejects unverified emails, unknown states and unsafe return places',async t=>{
 const f=await fixture(t,{verified:false}),c=f.client();
 assert.equal((await f.signIn(c,'google')).location,'/?login_error=no_email#account');
 assert.equal((await c.request('/api/auth/google/callback?code=abc&state=nope')).location,'/?login_error=expired#account');
 assert.equal((await c.request('/api/auth/me')).value.user,null);
});

test('sign-in ignores return places that are not on this site',async t=>{
 const f=await fixture(t),g=f.client();
 assert.equal((await f.signIn(g,'github','?next=https://evil.example')).location,'/#dashboard');
});

test('only admins see the users list and a user\'s activity',async t=>{
 const f=await fixture(t),user=f.client(),boss=f.client();
 const u=await user.request('/api/auth/register','POST',{email:'learner@example.com',password:'long password here'});
 assert.equal((await user.request('/api/admin/users')).status,403);
 await f.makeBoss(boss);assert.equal((await boss.request('/api/auth/me')).value.user.isAdmin,true);
 const list=(await boss.request('/api/admin/users')).value;const row=list.find(x=>x.email==='learner@example.com');
 assert.deepEqual(row.signIn,['email']);assert.equal(row.projects,0);assert.equal(row.questions,0);
 const one=(await boss.request('/api/admin/users/'+u.value.user.id)).value;assert.equal(one.email,'learner@example.com');assert.deepEqual(one.apps,[]);
 assert.ok(!JSON.stringify(list).includes('password'));
 assert.equal((await boss.request('/api/admin/users/missing-id')).status,404);
});

test('code tour copies real lines and ignores pieces the model made up',()=>{
 const files=[{path:'src/app.js',content:'import x from "y";\nfunction add(a,b){\n  return a+b;\n}'}];
 const tour=buildCodeTour({framework:{name:'Plain JavaScript',plain:'No framework.'},summary:'Adds numbers.',pieces:[
  {file:'src/app.js',start:2,end:99,title:'Adding',purpose:'Adds two numbers.',lines:[{line:2,explain:'Starts a function called add.'},{line:3,explain:'Gives back the total.'}]},
  {file:'src/missing.js',start:1,end:2,lines:[{line:1,explain:'x'}]},
  {file:'src/app.js',start:50,end:60,lines:[{line:50,explain:'x'}]}
 ]},files);
 assert.equal(tour.pieces.length,1);
 assert.deepEqual(tour.pieces[0].lines.map(l=>l.code),['function add(a,b){','  return a+b;','}']);
 assert.equal(tour.pieces[0].lines[2].explain,'');
 assert.match(tourText(tour),/Built with: Plain JavaScript/);
 assert.equal(buildCodeTour({pieces:[]},files),null);assert.equal(buildCodeTour('text',files),null);
});

test('admin approves plans; new accounts wait for approval',async t=>{
 const f=await fixture(t),user=f.client(),boss=f.client();
 const u=await user.request('/api/auth/register','POST',{email:'learner@example.com',password:'long password here'});
 await f.makeBoss(boss);
 assert.equal((await user.request('/api/plan')).value.plan,'pending');
 assert.equal((await user.request(`/api/admin/users/${u.value.user.id}/plan`,'POST',{plan:'pro'})).status,403);
 assert.equal((await boss.request(`/api/admin/users/${u.value.user.id}/plan`,'POST',{plan:'gold'})).status,400);
 assert.equal((await boss.request(`/api/admin/users/${u.value.user.id}/plan`,'POST',{plan:'pro'})).value.plan,'pro');
 const s=(await user.request('/api/plan')).value;assert.equal(s.plan,'pro');assert.equal(s.canFull,true);assert.equal(s.limit,30);assert.equal(s.used,0);
 const row=(await boss.request('/api/admin/users')).value.find(x=>x.email==='learner@example.com');assert.equal(row.plan,'pro');assert.equal(row.tokensThisMonth,0);
});

// ---- Attacks: each of these must fail ----
async function approvedLearner(f,plan='basic'){
 const c=f.client(),boss=f.client();
 const u=await c.request('/api/auth/register','POST',{email:'learner@example.com',password:'long password here'});
 await f.makeBoss(boss);await boss.request(`/api/admin/users/${u.value.user.id}/plan`,'POST',{plan});
 const up=await c.request('/api/repositories/upload','POST',{name:'Demo',files:[{path:'src/app.js',content:'export const a=1;'}]});
 return {c,id:up.value.id,uid:u.value.user.id};
}

test('parallel scans cannot get round the monthly limit',async t=>{
 const f=await fixture(t),{c,id}=await approvedLearner(f);
 const results=await Promise.all(Array.from({length:6},()=>c.request(`/api/repositories/${id}/analysis`,'POST',{})));
 const codes=results.map(r=>r.status).sort();
 assert.equal(codes.filter(x=>x===200).length,1);assert.ok(codes.filter(x=>x!==200).every(x=>x===409));
 assert.equal((await c.request('/api/plan')).value.used,1);
});

test('the monthly limit holds, and a basic account cannot run a full scan',async t=>{
 const f=await fixture(t),{c,id,uid}=await approvedLearner(f);
 assert.equal((await c.request(`/api/repositories/${id}/analysis`,'POST',{scan:'full'})).status,403);
 const db=f.app.store.db;for(let i=0;i<10;i++)db.prepare('INSERT INTO ai_usage VALUES(?,?,?,?,?,?,?)').run('u'+i,uid,'scan-normal',1,0,0,Date.now());
 const r=await c.request(`/api/repositories/${id}/analysis`,'POST',{});assert.equal(r.status,429);
 assert.equal((await c.request(`/api/repositories/${id}/analysis`,'POST',{})).status,429);
});

test('accounts waiting for approval cannot use any AI feature',async t=>{
 const f=await fixture(t),c=f.client();
 await c.request('/api/auth/register','POST',{email:'waiting@example.com',password:'long password here'});
 const up=await c.request('/api/repositories/upload','POST',{name:'Demo',files:[{path:'src/app.js',content:'export const a=1;'}]});
 for(const [path,data] of [[`/api/repositories/${up.value.id}/analysis`,{}],[`/api/repositories/${up.value.id}/explain`,{path:'src/app.js'}],[`/api/repositories/${up.value.id}/chat`,{question:'hi'}],['/api/ai/brief',{answers:['a','b','c','d','e']}]])
  assert.equal((await c.request(path,'POST',data)).status,403,path);
 assert.equal(f.app.store.db.prepare('SELECT COUNT(*) AS n FROM ai_usage').get().n,0);
});

test('signing up with an admin-looking email does not make you admin',async t=>{
 const f=await fixture(t),boss=f.client(),fake=f.client();await f.makeBoss(boss);
 await fake.request('/api/auth/register','POST',{email:'admin@example.com',password:'long password here'});
 assert.equal((await fake.request('/api/auth/me')).value.user.isAdmin,false);
 assert.equal((await fake.request('/api/admin/users')).status,403);
});

test('password guessing on one account is cut off',async t=>{
 const f=await fixture(t),c=f.client();await c.request('/api/auth/register','POST',{email:'victim@example.com',password:'long password here'});
 const codes=[];for(let i=0;i<11;i++)codes.push((await f.client().request('/api/auth/login','POST',{email:'victim@example.com',password:'wrong password '+i})).status);
 assert.deepEqual(codes.slice(0,10),Array(10).fill(401));assert.equal(codes[10],429);
});

test('a sign-in link started in another browser cannot log you in',async t=>{
 const f=await fixture(t),attacker=f.client(),victim=f.client();
 const start=await attacker.request('/api/auth/google/start');const state=new URL(start.location).searchParams.get('state');
 const r=await victim.request(`/api/auth/google/callback?code=abc&state=${state}`);
 assert.equal(r.location,'/?login_error=expired#account');assert.equal((await victim.request('/api/auth/me')).value.user,null);
});

test('DEFAULT_PLAN lets everyone use the AI without approval, and an admin can still block someone',async t=>{
 const f=await fixture(t,{defaultPlan:'basic'}),c=f.client(),boss=f.client();
 const u=await c.request('/api/auth/register','POST',{email:'new@example.com',password:'long password here'});
 const s=(await c.request('/api/plan')).value;assert.equal(s.plan,'basic');assert.equal(s.limit,10);
 await f.makeBoss(boss);await boss.request('/api/admin/users/'+u.value.user.id+'/plan','POST',{plan:'pending'});
 assert.equal((await c.request('/api/plan')).value.plan,'pending');
 assert.equal((await c.request('/api/ai/brief','POST',{answers:['a','b','c','d','e']})).status,403);
});

test('ADMIN_EMAILS only matches an existing account; nobody can sign up with an admin email',async t=>{
 const f=await fixture(t),owner=f.client(),thief=f.client();
 await owner.request('/api/auth/register','POST',{email:'owner@example.com',password:'long password here'});
 f.config.adminEmails.push('owner@example.com','not-yet@example.com');
 assert.equal((await owner.request('/api/auth/me')).value.user.isAdmin,true);
 assert.equal((await thief.request('/api/auth/register','POST',{email:'Not-Yet@example.com',password:'long password here'})).status,409);
 assert.equal((await thief.request('/api/auth/me')).value.user,null);
});
