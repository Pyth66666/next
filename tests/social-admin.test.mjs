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

async function fixture(t,{verified=true}={}){
 const dataDir=mkdtempSync(join(tmpdir(),'apex-social-'));
 const service={
  async ai(){return {text:'ok',model:'test-model',usage:null};},
  async github(path){if(path==='/user')return {id:4242,login:'octo'};if(path==='/user/emails')return [{email:'Octo@Example.com',primary:true,verified}];throw Error('Unexpected GitHub request: '+path);},
  async fetcher(url){
   if(url.includes('oauth2.googleapis.com/token')||url.includes('github.com/login/oauth/access_token'))return new Response(JSON.stringify({access_token:'provider-token'}));
   if(url.includes('openidconnect.googleapis.com'))return new Response(JSON.stringify({sub:'g-1',email:'person@example.com',email_verified:verified}));
   throw Error('Unexpected fetch: '+url);
  }
 };
 const config={...configuration({}),dataDir,port:0,githubId:'gh-client',githubSecret:'gh-secret',googleId:'g-client',googleSecret:'g-secret',adminEmails:['boss@example.com']};
 const app=createApplication({config,providers:service});
 await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${app.server.address().port}`;
 t.after(async()=>{await new Promise(r=>app.server.close(r));app.store.db.close();rmSync(dataDir,{recursive:true,force:true});});
 function client(){let cookie='',csrf='';return {async request(path,method='GET',data){const r=await fetch(base+path,{method,redirect:'manual',headers:{Origin:config.origin,...(cookie?{Cookie:cookie}:{}),...(csrf?{'X-CSRF-Token':csrf}:{}),...(data?{'Content-Type':'application/json'}:{})},...(data?{body:JSON.stringify(data)}:{})});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];const text=await r.text();let value;try{value=JSON.parse(text);}catch{value=text;}if(value?.csrf)csrf=value.csrf;return {status:r.status,value,location:r.headers.get('location')};}};}
 // Runs the provider round trip: start -> (provider) -> callback.
 async function signIn(c,provider,next=''){const start=await c.request(`/api/auth/${provider}/start${next}`);assert.equal(start.status,302);const state=new URL(start.location).searchParams.get('state');return c.request(`/api/auth/${provider}/callback?code=abc&state=${state}`);}
 return {client,signIn,app};
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
 const b=await boss.request('/api/auth/register','POST',{email:'boss@example.com',password:'long password here'});assert.equal(b.value.user.isAdmin,true);
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
 await boss.request('/api/auth/register','POST',{email:'boss@example.com',password:'long password here'});
 assert.equal((await user.request('/api/plan')).value.plan,'pending');
 assert.equal((await user.request(`/api/admin/users/${u.value.user.id}/plan`,'POST',{plan:'pro'})).status,403);
 assert.equal((await boss.request(`/api/admin/users/${u.value.user.id}/plan`,'POST',{plan:'gold'})).status,400);
 assert.equal((await boss.request(`/api/admin/users/${u.value.user.id}/plan`,'POST',{plan:'pro'})).value.plan,'pro');
 const s=(await user.request('/api/plan')).value;assert.equal(s.plan,'pro');assert.equal(s.canFull,true);assert.equal(s.limit,30);assert.equal(s.used,0);
 const row=(await boss.request('/api/admin/users')).value.find(x=>x.email==='learner@example.com');assert.equal(row.plan,'pro');assert.equal(row.tokensThisMonth,0);
});
