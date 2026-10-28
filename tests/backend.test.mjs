import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createApplication} from '../backend/app.mjs';
import {configuration} from '../backend/config.mjs';
import {createStore} from '../backend/store.mjs';
import {providers,eligibleFile,redact,contextFiles} from '../backend/providers.mjs';

async function fixture(t){
 const dataDir=mkdtempSync(join(tmpdir(),'apex-test-'));
 const calls=[];let badQuiz=false,badPlan=false;
 const source='export function greet(name) { return `Hello ${name}`; }\nconst api_key = "private-secret";';
 const service={
  async ai(system,user){calls.push({system,user});return {text:system.startsWith("You are Apexelerate's builder-plan coach")?(badPlan?'Ignore the approved brief.':JSON.stringify({questions:['Who can access each record?'],checks:[{basis:'Do not add payments.',check:'Verify no payment processing was added.'}]})):user.startsWith('Create one')?JSON.stringify(badQuiz?{question:'Invalid'}:{question:'What does greet return?',options:['A greeting','A database row','A cookie'],answer:0,explanation:'src/app.js:1 returns a greeting.',source:'src/app.js'}):'Review src/app.js:1. This is a source-based explanation, not a runtime test.',model:'test-model',usage:{prompt_tokens:100,completion_tokens:20}};},
  async github(path){calls.push({path});if(path==='/user')return {login:'fixture-user'};if(path==='/repos/demo/mvp')return {full_name:'demo/mvp',default_branch:'main'};if(path.includes('/commits/'))return {sha:'commit123456',commit:{tree:{sha:'tree123'}}};if(path.includes('/git/trees/'))return {truncated:false,tree:[{type:'blob',path:'src/app.js',sha:'blob123',size:100},{type:'blob',path:'.env',sha:'secret',size:10}]};if(path.endsWith('/git/blobs/blob123'))return {encoding:'base64',content:Buffer.from(source).toString('base64')};throw Error('Unexpected GitHub request: '+path);},
  async fetcher(url,options){calls.push({exchange:JSON.parse(options.body)});return new Response(JSON.stringify({access_token:'fixture-github-token'}));}
 };
 const config={...configuration({}),dataDir,port:0,githubId:'fixture-client',githubSecret:'fixture-secret'};const app=createApplication({config,providers:service});
 await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${app.server.address().port}`;
 t.after(async()=>{await new Promise(r=>app.server.close(r));app.store.db.close();rmSync(dataDir,{recursive:true,force:true});});
 function client(){let cookie='',csrf='';return {async request(path,method='GET',data,headers={}){const response=await fetch(base+path,{method,redirect:'manual',headers:{Origin:config.origin,...(cookie?{Cookie:cookie}:{}),...(csrf?{'X-CSRF-Token':csrf}:{}),...(data?{'Content-Type':'application/json'}:{}),...headers},...(data?{body:JSON.stringify(data)}:{})});if(response.headers.get('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];const content=await response.text();let value;try{value=JSON.parse(content);}catch{value=content;}if(value?.csrf)csrf=value.csrf;return {status:response.status,value,headers:response.headers};},async register(email='one@example.com'){return this.request('/api/auth/register','POST',{email,password:'  long password  '});}};}
 return {app,client,calls,setBadQuiz:()=>badQuiz=true,setBadPlan:()=>badPlan=true};
}

test('prompt compiler requires authentication, validates input and makes no generation calls',async t=>{
 const f=await fixture(t),user=f.client();
 assert.equal((await user.request('/api/prompt/compile','POST',{source:'No payments.'})).status,403);
 await user.register('compiler@example.com');
 const r=await user.request('/api/prompt/compile','POST',{source:'No payments.',target:'reference-o200k'});
 assert.equal(r.status,200);assert.equal(r.value.text,'No payments.');assert.equal(r.value.roundTripVerified,true);assert.equal(f.calls.length,0);
 assert.equal((await user.request('/api/prompt/compile','POST',{source:' '})).status,400);
 assert.equal((await user.request('/api/prompt/compile','POST',{source:'a'.repeat(30001)})).status,400);
 assert.equal((await user.request('/api/prompt/compile','POST',{source:'brief',target:'other'})).status,400);
 assert.equal((await user.request('/api/prompt/compile','POST',{source:'brief',allowExperimental:'yes'})).status,400);
 const repeated='Only owners can cancel.\n'.repeat(50);
 assert.equal((await user.request('/api/prompt/compile','POST',{source:repeated})).value.format,'original');
 assert.equal((await user.request('/api/prompt/compile','POST',{source:repeated,allowExperimental:true})).value.format,'dictionary');
 assert.equal((await user.request('/api/prompt/compile','POST',{source:'brief'},{'X-CSRF-Token':'wrong'})).status,403);
});

test('invalid AI provider does not block account creation or manual project routes',async t=>{
 const dataDir=mkdtempSync(join(tmpdir(),'apex-no-ai-'));
 const config={...configuration({AI_PROVIDER:'"gemini"'}),dataDir,port:0};
 const app=createApplication({config});
 await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
 t.after(async()=>{await new Promise(r=>app.server.close(r));app.store.db.close();rmSync(dataDir,{recursive:true,force:true});});
 const base=`http://127.0.0.1:${app.server.address().port}`;
 const settings=await (await fetch(base+'/api/config')).json();
 assert.equal(settings.aiConfigured,false);assert.equal(settings.provider,null);
 const response=await fetch(base+'/api/auth/register',{method:'POST',headers:{Origin:config.origin,'Content-Type':'application/json'},body:JSON.stringify({email:'manual@example.com',password:'a long password'})});
 assert.equal(response.status,200);
 const account=await response.json();assert.equal(account.user.email,'manual@example.com');
 const cookie=response.headers.get('set-cookie').split(';')[0];
 const project=await fetch(base+'/api/projects/manual-project',{method:'PUT',headers:{Origin:config.origin,Cookie:cookie,'X-CSRF-Token':account.csrf,'Content-Type':'application/json'},body:JSON.stringify({type:'mvp',answers:['A manual idea','A clear outcome','People and roles','Small scope','Simple journey'],problemArea:'student',output:'A manual brief',tasks:[]})});
 assert.equal(project.status,200);
});

test('admin demo requires a server-approved existing account ID, and revocation affects active sessions',async t=>{
 const f=await fixture(t),guest=f.client(),admin=f.client(),normal=f.client();
 assert.equal((await guest.request('/api/admin/demo')).status,401);
 const signed=await admin.register('admin@example.com');
 assert.equal(signed.value.user.isAdmin,false);
 await normal.register('normal@example.com');
 assert.equal((await admin.request('/api/admin/demo')).status,403);
 f.app.config.adminUserIds=[signed.value.user.id];
 assert.equal((await admin.request('/api/auth/me')).value.user.isAdmin,true);
 const demo=await admin.request('/api/admin/demo');
 assert.equal(demo.status,200);assert.equal(demo.value.lessons.length,5);
 assert.ok(demo.value.sampleFiles['src/BookingForm.jsx']);
 assert.match(demo.headers.get('cache-control'),/no-store/);
 assert.equal((await normal.request('/api/admin/demo','GET',undefined,{'X-Admin':'true'})).status,403);
 assert.equal((await guest.request('/learning-data.js')).status,404);
 assert.equal((await guest.request('/backend/demo-data.mjs')).status,404);
 f.app.config.adminUserIds=[];
 assert.equal((await admin.request('/api/admin/demo')).status,403);
 assert.equal((await admin.request('/api/auth/me')).value.user.isAdmin,false);
});

test('accounts, cookies, CSRF, ownership and durable project storage',async t=>{
 const f=await fixture(t),a=f.client(),b=f.client();
 assert.equal((await a.request('/api/projects')).status,401);
 const auth=await a.register();assert.equal(auth.status,200);assert.match(auth.headers.get('set-cookie'),/HttpOnly; SameSite=Lax/);
 const p={type:'mvp',answers:['Idea','Goal','Users','Constraints','Flow'],output:'Approved brief',tasks:[{text:'Review',done:false}],created:1};
 assert.equal((await a.request('/api/projects/owned','PUT',p,{'X-CSRF-Token':'wrong'})).status,403);
 assert.equal((await a.request('/api/projects/owned','PUT',p,{Origin:'https://evil.example'})).status,403);
 assert.equal((await a.request('/api/projects/owned','PUT',p)).status,200);
 assert.equal((await a.request('/api/projects')).value[0].output,'Approved brief');
 await b.register('two@example.com');assert.equal((await b.request('/api/projects/owned')).status,404);
 assert.equal((await b.request('/api/projects')).value.length,0);
 const stored=f.app.store.db.prepare('SELECT password FROM users WHERE email=?').get('one@example.com').password;assert.ok(!stored.includes('long password'));
 await a.request('/api/auth/logout','POST',{});assert.equal((await a.request('/api/projects')).status,401);
 assert.equal((await a.request('/api/auth/login','POST',{email:'one@example.com',password:'long password'})).status,401);
 assert.equal((await a.request('/api/auth/login','POST',{email:'one@example.com',password:'  long password  '})).status,200);
 assert.equal((await a.request('/api/projects/owned')).value.id,'owned');
});

test('detailed brief mode and optional answers persist with validation',async t=>{
 const f=await fixture(t),a=f.client();await a.register('detailed@example.com');
 const p={type:'mvp',answers:['Idea','Goal','Users','Constraints','Flow'],briefDepth:'detailed',detailAnswers:{roles:'Customers see only their own bookings.',data:''},output:'Detailed approved brief',tasks:[]};
 assert.equal((await a.request('/api/projects/detail','PUT',p)).status,200);
 const saved=(await a.request('/api/projects/detail')).value;
 assert.equal(saved.briefDepth,'detailed');assert.equal(saved.detailAnswers.roles,p.detailAnswers.roles);
 assert.equal((await a.request('/api/projects/detail','PUT',{...p,detailAnswers:{unknown:'Surprise'}})).status,400);
 assert.equal((await a.request('/api/projects/detail','PUT',{...p,detailAnswers:{roles:'x'.repeat(5001)}})).status,400);
});

test('import, source analysis, tutoring, quiz grading and server-owned progress',async t=>{
 const f=await fixture(t),a=f.client(),b=f.client();await a.register();await b.register('two@example.com');
 const imported=await a.request('/api/repositories','POST',{repository:'demo/mvp'});assert.equal(imported.status,201);const id=imported.value.id;
 assert.equal(imported.value.files.length,1);assert.equal(imported.value.commit,'commit123456');assert.ok(!f.calls.some(c=>c.path?.endsWith('/secret')));
 const file=await a.request(`/api/repositories/${id}/file?path=src/app.js`);assert.match(file.value.content,/REDACTED/);assert.ok(!file.value.content.includes('private-secret'));
 assert.equal((await b.request(`/api/repositories/${id}`)).status,404);
 assert.equal((await a.request(`/api/repositories/${id}/file?path=.env`)).status,404);
 assert.equal((await a.request(`/api/repositories/${id}/analysis`,'POST',{level:'advanced',language:'Bahasa Melayu'})).status,200);
 assert.equal((await a.request(`/api/repositories/${id}/chat`,'POST',{question:'Explain greet',activity:'debug'})).status,200);
 assert.equal((await a.request(`/api/repositories/${id}/history`)).value.length,2);
 assert.ok(f.calls.some(c=>c.user?.includes('propose a minimal patch')));
 const quiz=await a.request(`/api/repositories/${id}/quiz`,'POST',{topic:'greet'});assert.equal(quiz.status,200);assert.equal(quiz.value.answer,undefined);assert.equal(quiz.value.explanation,undefined);
 assert.equal((await a.request(`/api/repositories/${id}/answer`,'POST',{id:quiz.value.id,answer:1})).value.correct,false);
 assert.equal((await a.request(`/api/repositories/${id}/answer`,'POST',{id:quiz.value.id,answer:0})).value.correct,true);
 await a.request('/api/progress','PUT',{tutor:{level:'advanced'},quizPasses:['fake']});
 assert.deepEqual((await a.request('/api/progress')).value.quizPasses,[quiz.value.id]);
 f.setBadQuiz();assert.equal((await a.request(`/api/repositories/${id}/quiz`,'POST',{})).status,502);
 assert.equal((await a.request(`/api/repositories/${id}/chat`,'POST',{question:'Test',level:'invalid'})).status,400);
});

test('live brief and prompt routes preserve user requirements',async t=>{
 const f=await fixture(t),a=f.client();await a.register();
 const p={type:'mvp',answers:Array(5).fill('A detailed user answer'),output:'Do not add payments.',tasks:[],created:1};await a.request('/api/projects/brief','PUT',p);
 assert.equal((await a.request('/api/ai/brief','POST',{answers:p.answers,action:'review'})).status,200);
 assert.equal((await a.request('/api/ai/brief','POST',{answers:p.answers,briefDepth:'detailed',detailAnswers:{roles:'Only owners see their records.'},action:'review'})).status,200);
 assert.ok(f.calls.some(c=>c.user?.includes('Only owners see their records.')));
 const proposed=await a.request('/api/ai/prompt','POST',{projectId:'brief',mode:'concise',phase:'build'});
 assert.equal(proposed.status,200);assert.match(proposed.value.text,/Do not add payments\./);assert.equal(proposed.value.preservation.approvedBriefVerbatim,true);assert.equal(proposed.value.questions.length,1);assert.equal(proposed.value.checks[0].basis,p.output);assert.equal(proposed.value.tokenCount.reference,'o200k_base; input text only');
 assert.ok(f.calls.some(c=>c.user?.includes('Do not add payments.')));
 f.setBadPlan();assert.equal((await a.request('/api/ai/prompt','POST',{projectId:'brief'})).status,502);
 assert.equal((await a.request('/api/ai/prompt','POST',{projectId:'other'})).status,404);
});

test('provider adapter keeps credentials server-side and rejects truncated responses',async()=>{
 const config={provider:'nvidia',nvidiaKey:'private-key',model:'chosen-model',nvidiaBase:'https://integrate.api.nvidia.com/v1'};let captured;
 const p=providers(config,async(url,options)=>{captured={url,options};return new Response(JSON.stringify({choices:[{message:{content:'Answer'},finish_reason:'stop'}],usage:{prompt_tokens:10}}));});
 assert.equal((await p.ai('system','user')).text,'Answer');assert.equal(captured.options.headers.Authorization,'Bearer private-key');assert.equal(JSON.parse(captured.options.body).model,'chosen-model');assert.match(captured.url,/\/chat\/completions$/);
 await assert.rejects(providers({},()=>{}).ai('',''),e=>e.status===503);
 await assert.rejects(providers(config,async()=>new Response(JSON.stringify({choices:[{message:{content:'Partial'},finish_reason:'length'}]}))).ai('',''),e=>e.status===502);
 await assert.rejects(providers(config,async()=>new Response('{}',{status:429})).ai('',''),e=>e.status===429);
});

test('source filtering, redaction and context budget',()=>{
 assert.equal(eligibleFile('.env'),false);assert.equal(eligibleFile('keys/private.pem'),false);assert.equal(eligibleFile('node_modules/a.js'),false);assert.equal(eligibleFile('src/a.ts',100),true);
 assert.equal(eligibleFile('big.js',30001),false);assert.ok(!redact('const password="hunter2222"').includes('hunter2222'));
 const files=Array.from({length:20},(_,i)=>({path:`${i}.js`,content:'x'.repeat(10000)}));const selected=contextFiles({files},'code');assert.ok(selected.length<=10);assert.ok(selected.reduce((n,f)=>n+f.content.length,0)<=65000);
});

test('pitch drafts persist by track, coaching stays read-only, and repository links enforce ownership',async t=>{
 const f=await fixture(t),a=f.client(),b=f.client();await a.register();await b.register('two@example.com');
 const p={type:'mvp',answers:Array(5).fill('User project context'),output:'Booking MVP; no payments.',tasks:[],pitch:{startup:{event:'VC meeting',criteria:'Customer validation',duration:5,slides:{title:{headline:'Book local coaches',answers:{identity:'CoachBook',summary:'Bookings for coaches'},reviewed:true}}},hackathon:{event:'Hack day',duration:3,slides:{title:{headline:'Hackathon demo',answers:{identity:'CoachBook'}}}}}};
 assert.equal((await a.request('/api/projects/pitch-project','PUT',p)).status,200);
 const loaded=(await a.request('/api/projects/pitch-project')).value;assert.equal(loaded.pitch.startup.slides.title.reviewed,true);assert.equal(loaded.pitch.hackathon.slides.title.headline,'Hackathon demo');
 const response=await a.request('/api/ai/pitch','POST',{projectId:'pitch-project',track:'startup',slideId:'title',question:'Is this clear?'});assert.equal(response.status,200);assert.equal((await a.request('/api/projects/pitch-project')).value.pitch.startup.slides.title.headline,'Book local coaches');
 assert.ok(f.calls.some(c=>c.system?.includes('not a deck generator')&&c.user?.includes('VC meeting')));
 assert.equal((await b.request('/api/ai/pitch','POST',{projectId:'pitch-project',slideId:'title'})).status,404);
 assert.equal((await a.request('/api/ai/pitch','POST',{projectId:'pitch-project',slideId:'market'})).status,400);
 assert.equal((await a.request('/api/ai/pitch','POST',{projectId:'pitch-project',slideId:'unknown'})).status,400);
 const snapshot=(await a.request('/api/repositories','POST',{repository:'demo/mvp'})).value;
 assert.equal((await b.request('/api/projects/stolen-link','PUT',{...p,repositoryId:snapshot.id})).status,404);
 assert.equal((await a.request('/api/projects/pitch-project','PUT',{...loaded,repositoryId:snapshot.id})).status,200);
 const review=await a.request('/api/ai/build-review','POST',{projectId:'pitch-project'});assert.equal(review.status,200);assert.equal(review.value.commit,'commit123456');assert.deepEqual(review.value.sources,['src/app.js']);assert.ok(f.calls.some(c=>c.user?.includes('Compare the user')&&c.user?.includes('Booking MVP; no payments.')));
 await a.request('/api/ai/pitch','POST',{projectId:'pitch-project',slideId:'title'});assert.ok(f.calls.some(c=>c.user?.includes('Linked code context')&&c.user?.includes('commit123456')));
 const reopened=createStore(f.app.config);try{const stored=JSON.parse(reopened.db.prepare('SELECT data FROM projects WHERE id=?').get('pitch-project').data);assert.equal(stored.pitch.startup.slides.title.headline,'Book local coaches');assert.equal(stored.repositoryId,snapshot.id);}finally{reopened.db.close();}
 assert.equal((await a.request('/api/projects/pitch-project','PUT',{...p,pitch:{startup:{slides:{title:{headline:'x',answers:{},reviewed:true}}}}})).status,400);
});

test('GitHub authorization binds state to session, consumes it once and encrypts durable tokens',async t=>{
 const f=await fixture(t),a=f.client(),b=f.client();await a.register();await b.register('two@example.com');
 const start=await a.request('/api/github/start');assert.equal(start.status,302);const url=new URL(start.headers.get('location'));assert.equal(url.origin,'https://github.com');assert.equal(url.searchParams.get('code_challenge_method'),'S256');assert.ok(url.searchParams.get('code_challenge'));assert.equal(url.searchParams.has('scope'),false);
 const callback='/api/github/callback?code=fake&state='+url.searchParams.get('state');assert.equal((await b.request(callback)).status,400);
 assert.equal((await a.request(callback)).status,302);assert.equal((await a.request(callback)).status,400);
 const row=f.app.store.db.prepare('SELECT token FROM github').get();assert.ok(!row.token.includes('fixture-github-token'));assert.equal(f.app.store.decrypt(row.token),'fixture-github-token');assert.ok(f.calls.some(c=>c.exchange?.code_verifier));
 const reopened=createStore(f.app.config);try{assert.equal(reopened.decrypt(reopened.db.prepare('SELECT token FROM github').get().token),'fixture-github-token');assert.equal(reopened.db.prepare('SELECT COUNT(*) AS n FROM users').get().n,2);}finally{reopened.db.close();}
 assert.equal((await a.request('/api/auth/me')).value.github.login,'fixture-user');await a.request('/api/github/disconnect','POST',{});assert.equal((await a.request('/api/auth/me')).value.github,null);
});

test('static server does not expose configuration, storage or backend sources',async t=>{
 const f=await fixture(t),a=f.client();for(const path of ['/.env','/data/token.key','/backend/store.mjs'])assert.equal((await a.request(path)).status,404);
 const home=await a.request('/');assert.equal(home.status,200);assert.match(home.value,/cloud.css/);assert.match(home.headers.get('content-security-policy'),/frame-ancestors 'none'/);
 const config=await a.request('/api/config');assert.equal(config.value.githubSecret,undefined);assert.equal(config.value.nvidiaKey,undefined);assert.equal(config.value.geminiKey,undefined);assert.equal(config.value.providerName,'Gemini');assert.equal(config.value.aiConfigured,false);
});

test('email reset link changes the password once, signs out old sessions and never reveals who has an account',async t=>{
 const dataDir=mkdtempSync(join(tmpdir(),'apex-reset-')),sent=[];
 const service={async ai(){throw new Error('unused');},async github(){throw new Error('unused');},async sendEmail(message){sent.push(message);return {id:'email-1'};}};
 const config={...configuration({}),dataDir,port:0,resendKey:'re_test',emailFrom:'Apexelerate <hello@example.com>'};
 const app=createApplication({config,providers:service});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${app.server.address().port}`;
 t.after(async()=>{await new Promise(r=>app.server.close(r));app.store.db.close();rmSync(dataDir,{recursive:true,force:true});});
 const client=()=>{let cookie='',csrf='';return {async request(path,method='GET',data){const r=await fetch(base+path,{method,headers:{Origin:config.origin,...(cookie?{Cookie:cookie}:{}),...(csrf?{'X-CSRF-Token':csrf}:{}),...(data?{'Content-Type':'application/json'}:{})},...(data?{body:JSON.stringify(data)}:{})});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];const value=await r.json().catch(()=>null);if(value?.csrf)csrf=value.csrf;return {status:r.status,value};}};};
 const owner=client(),stranger=client();
 assert.equal((await owner.request('/api/auth/register','POST',{email:'reset@example.com',password:'first password here'})).status,200);
 assert.equal((await stranger.request('/api/config')).value.emailConfigured,true);
 const unknown=await stranger.request('/api/auth/forgot','POST',{email:'nobody@example.com'});
 assert.equal(unknown.status,200);assert.equal(sent.length,0,'No email for an unknown address');
 const known=await stranger.request('/api/auth/forgot','POST',{email:'Reset@Example.com'});
 assert.deepEqual(known.value,unknown.value,'Same answer either way');
 assert.equal(sent.length,1);assert.equal(sent[0].to,'reset@example.com');
 const token=sent[0].text.match(/#reset\/([A-Za-z0-9_-]+)/)[1];
 assert.ok(sent[0].html.includes(`#reset/${token}`));
 const stored=app.store.db.prepare('SELECT token FROM password_resets').get().token;assert.notEqual(stored,token,'Only a hash is stored');
 assert.equal((await stranger.request('/api/auth/reset','POST',{token,password:'short'})).status,400);
 assert.equal((await stranger.request('/api/auth/reset','POST',{token:'wrong-token',password:'second password here'})).status,400);
 const reset=await stranger.request('/api/auth/reset','POST',{token,password:'second password here'});
 assert.equal(reset.status,200);assert.equal(reset.value.user.email,'reset@example.com');
 assert.equal((await owner.request('/api/auth/me')).value.user,null,'Old sessions are signed out');
 assert.equal((await stranger.request('/api/auth/reset','POST',{token,password:'third password here'})).status,400,'Link works only once');
 assert.equal((await client().request('/api/auth/login','POST',{email:'reset@example.com',password:'first password here'})).status,401);
 assert.equal((await client().request('/api/auth/login','POST',{email:'reset@example.com',password:'second password here'})).status,200);
 await stranger.request('/api/auth/forgot','POST',{email:'reset@example.com'});
 const expired=sent.at(-1).text.match(/#reset\/([A-Za-z0-9_-]+)/)[1];
 app.store.db.prepare('UPDATE password_resets SET expires=?').run(Date.now()-1);
 assert.equal((await stranger.request('/api/auth/reset','POST',{token:expired,password:'fourth password here'})).status,400,'Expired links fail');
});

test('forgot password explains plainly when email is not set up',async t=>{
 const f=await fixture(t),user=f.client();
 const r=await user.request('/api/auth/forgot','POST',{email:'one@example.com'});
 assert.equal(r.status,503);assert.match(r.value.error||JSON.stringify(r.value),/not switched on/);
});

test('uploaded project files become a private snapshot with the same filters as GitHub imports',async t=>{
 const f=await fixture(t),user=f.client();
 assert.equal((await user.request('/api/repositories/upload','POST',{name:'x',files:[{path:'a.js',content:'1'}]})).status,403);
 await user.register('upload@example.com');
 const result=await user.request('/api/repositories/upload','POST',{name:'Cake app',totalFiles:5,files:[
  {path:'src/app.js',content:'const api_key = "private-secret";\nexport const ok=1;'},
  {path:'.env',content:'SECRET=1'},
  {path:'node_modules/x/index.js',content:'x'},
  {path:'logo.png',content:'binary'},
  {path:'README.md',content:'# Cake app'}]});
 assert.equal(result.status,201);
 assert.equal(result.value.fullName,'Cake app');
 assert.equal(result.value.source,'upload');
 assert.deepEqual(result.value.files.map(x=>x.path).sort(),['README.md','src/app.js']);
 assert.equal(result.value.partial,true);
 const file=await user.request(`/api/repositories/${result.value.id}/file?path=src%2Fapp.js`);
 assert.ok(!file.value.content.includes('private-secret'),'Secrets are redacted');
 assert.equal((await user.request('/api/repositories/upload','POST',{name:'Bad',files:[{path:'../etc/passwd.js',content:'x'}]})).status,400);
 assert.equal((await user.request('/api/repositories/upload','POST',{name:'Empty',files:[{path:'.env',content:'x'}]})).status,400);
 assert.equal((await f.client().request(`/api/repositories/${result.value.id}`)).status,401);
 const list=await user.request('/api/repositories');assert.equal(list.value.length,1);
});
