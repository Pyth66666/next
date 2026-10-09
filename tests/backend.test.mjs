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
 const calls=[];let badQuiz=false;
 const source='export function greet(name) { return `Hello ${name}`; }\nconst api_key = "private-secret";';
 const service={
  async ai(system,user){calls.push({system,user});return {text:user.startsWith('Create one')?JSON.stringify(badQuiz?{question:'Invalid'}:{question:'What does greet return?',options:['A greeting','A database row','A cookie'],answer:0,explanation:'src/app.js:1 returns a greeting.',source:'src/app.js'}):'Review src/app.js:1. This is a source-based explanation, not a runtime test.',model:'test-model',usage:{prompt_tokens:100,completion_tokens:20}};},
  async github(path){calls.push({path});if(path==='/user')return {login:'fixture-user'};if(path==='/repos/demo/mvp')return {full_name:'demo/mvp',default_branch:'main'};if(path.includes('/commits/'))return {sha:'commit123456',commit:{tree:{sha:'tree123'}}};if(path.includes('/git/trees/'))return {truncated:false,tree:[{type:'blob',path:'src/app.js',sha:'blob123',size:100},{type:'blob',path:'.env',sha:'secret',size:10}]};if(path.endsWith('/git/blobs/blob123'))return {encoding:'base64',content:Buffer.from(source).toString('base64')};throw Error('Unexpected GitHub request: '+path);},
  async fetcher(url,options){calls.push({exchange:JSON.parse(options.body)});return new Response(JSON.stringify({access_token:'fixture-github-token'}));}
 };
 const config={...configuration({}),dataDir,port:0,githubId:'fixture-client',githubSecret:'fixture-secret'};const app=createApplication({config,providers:service});
 await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${app.server.address().port}`;
 t.after(async()=>{await new Promise(r=>app.server.close(r));app.store.db.close();rmSync(dataDir,{recursive:true,force:true});});
 function client(){let cookie='',csrf='';return {async request(path,method='GET',data,headers={}){const response=await fetch(base+path,{method,redirect:'manual',headers:{Origin:config.origin,...(cookie?{Cookie:cookie}:{}),...(csrf?{'X-CSRF-Token':csrf}:{}),...(data?{'Content-Type':'application/json'}:{}),...headers},...(data?{body:JSON.stringify(data)}:{})});if(response.headers.get('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];const content=await response.text();let value;try{value=JSON.parse(content);}catch{value=content;}if(value?.csrf)csrf=value.csrf;return {status:response.status,value,headers:response.headers};},async register(email='one@example.com'){return this.request('/api/auth/register','POST',{email,password:'  long password  '});}};}
 return {app,client,calls,setBadQuiz:()=>badQuiz=true};
}

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
 assert.equal((await a.request('/api/ai/prompt','POST',{projectId:'brief',mode:'concise',phase:'build'})).status,200);
 assert.ok(f.calls.some(c=>c.user?.includes('Do not add payments.')));
 assert.equal((await a.request('/api/ai/prompt','POST',{projectId:'other'})).status,404);
});

test('provider adapter keeps credentials server-side and rejects truncated responses',async()=>{
 const config={nvidiaKey:'private-key',model:'chosen-model',nvidiaBase:'https://integrate.api.nvidia.com/v1'};let captured;
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
 const config=await a.request('/api/config');assert.equal(config.value.githubSecret,undefined);assert.equal(config.value.nvidiaKey,undefined);
});
