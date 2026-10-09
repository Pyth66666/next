import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createApplication} from '../backend/app.mjs';
import {configuration} from '../backend/config.mjs';

test('website completes account, server save, real source tutor and quiz journey',async()=>{
 const dataDir=mkdtempSync(join(tmpdir(),'apex-ui-'));
 const service={async ai(system,user){return {text:user.startsWith('Create one')?JSON.stringify({question:'What does hello return?',options:['A greeting','An error','A cookie'],answer:0,explanation:'src/app.js:1 returns hello.',source:'src/app.js'}):'src/app.js:1 returns a greeting.',model:'fixture-model',usage:{prompt_tokens:25,completion_tokens:10}};},async github(path){if(path==='/repos/demo/mvp')return {full_name:'demo/mvp',default_branch:'main'};if(path.includes('/commits/'))return {sha:'abc123456789',commit:{tree:{sha:'tree'}}};if(path.includes('/git/trees/'))return {tree:[{type:'blob',path:'src/app.js',sha:'blob',size:30}],truncated:false};if(path.endsWith('/blobs/blob'))return {encoding:'base64',content:Buffer.from('export const hello = "hello";').toString('base64')};throw Error(path);}};
 const config={...configuration({}),dataDir,port:0,nvidiaKey:'test',model:'fixture-model'};
 const {server,store}=createApplication({config,providers:service});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 const dom=new JSDOM('<div id="app"></div><div id="toast"></div>',{url:config.origin});const {window}=dom;
 const names=['window','document','location','localStorage','navigator','requestAnimationFrame','fetch','FormData','Event'];const previous=new Map(names.map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));const nativeFetch=globalThis.fetch;let cookie='';
 for(const k of ['window','document','location','localStorage','navigator','FormData','Event'])Object.defineProperty(globalThis,k,{value:k==='window'?window:window[k],configurable:true,writable:true});
 globalThis.requestAnimationFrame=fn=>fn();window.scrollTo=()=>{};window.HTMLElement.prototype.scrollIntoView=()=>{};window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};window.HTMLDialogElement.prototype.close=function(){this.dispatchEvent(new window.Event('close'));};
 globalThis.fetch=window.fetch=async(path,options={})=>{const r=await nativeFetch(base+path,{...options,headers:{...options.headers,Origin:config.origin,...(cookie?{Cookie:cookie}:{})}});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return r;};
 const errors=[];window.addEventListener('error',e=>errors.push(e.error));
 const until=async fn=>{const end=Date.now()+5000;while(!fn()){if(Date.now()>end)throw Error('Timed out waiting for UI');await new Promise(r=>setTimeout(r,15));}};
 const click=s=>{const el=document.querySelector(s);assert.ok(el,s);el.click();};const fill=(s,v)=>{const el=document.querySelector(s);assert.ok(el,s);el.value=v;el.dispatchEvent(new window.Event('input',{bubbles:true}));};const submit=s=>document.querySelector(s).dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));
 try{
  await import('../public/app.js');await until(()=>document.querySelector('[data-account-link]'));
  location.hash='account';await until(()=>document.querySelector('#account-form'));
  fill('[name=email]','builder@example.com');fill('[name=password]','a strong password');submit('#account-form');await until(()=>document.querySelector('#studio-projects'));
  click('[data-action=new]');await until(()=>document.querySelector('#answer'));
  for(const v of ['A coaching booking app','Book a session easily','Customers and coaches','Two weeks no payments','Browse coaches and book a slot']){fill('#answer',v);click('[data-action=next]');}
  await until(()=>store.db.prepare('SELECT data FROM projects').all().some(r=>JSON.parse(r.data).output));
  click('[data-learn=pack]');assert.ok(document.querySelector('[data-nvidia-prompt]'));click('[data-nvidia-prompt]');await until(()=>document.querySelector('.pack-dialog textarea').value.includes('src/app.js:1'));click('.pack-dialog .close');
  const projectId=JSON.parse(store.db.prepare('SELECT data FROM projects').get().data).id;
  location.hash=`pitch/${projectId}/startup/title`;await until(()=>document.querySelector('#pitch-headline'));
  fill('#pitch-headline','Book a coach in minutes');fill('[data-pitch-answer=identity]','CoachBook');fill('[data-pitch-answer=summary]','Simple bookings for local coaches');click('[data-pitch=review]');
  await until(()=>JSON.parse(store.db.prepare('SELECT data FROM projects').get().data).pitch?.startup?.slides.title.reviewed);
  click('[data-pitch=coach]');await until(()=>document.querySelector('#pitch-ai-feedback pre'));assert.equal(document.querySelector('#pitch-headline').value,'Book a coach in minutes');
  location.hash=`pitch/${projectId}/hackathon/title`;await until(()=>document.querySelector('#pitch-headline')?.value==='');fill('#pitch-headline','Our hackathon demo');
  await until(()=>JSON.parse(store.db.prepare('SELECT data FROM projects').get().data).pitch?.hackathon?.slides.title.headline==='Our hackathon demo');
  location.hash='repositories';await until(()=>document.querySelector('#repository-form'));fill('#repository-name','demo/mvp');submit('#repository-form');await until(()=>document.querySelector('#real-input'));
  assert.match(document.querySelector('h1').textContent,/demo\/mvp/);click('[data-cloud=analyze]');await until(()=>document.querySelector('#analysis-output').textContent.includes('src/app.js:1'));
  fill('#real-input','Explain hello');submit('#real-question');await until(()=>document.querySelector('.chat-answer'));assert.match(document.querySelector('.chat-answer').textContent,/greeting/);
  const activity=document.querySelector('#real-activity');activity.value='quiz';activity.dispatchEvent(new window.Event('change',{bubbles:true}));fill('#real-input','hello');submit('#real-question');await until(()=>document.querySelector('[data-real-answer]'));click('[data-real-answer="0"]');await until(()=>document.querySelector('#real-quiz-feedback').textContent.includes('Correct'));
  click('[data-real-file]');await until(()=>document.querySelector('.file-source'));assert.match(document.querySelector('.file-source').textContent,/hello/);click('.pack-dialog .close');
  location.hash='project/'+projectId;await until(()=>document.querySelector('#project-repository')?.options.length===2);const select=document.querySelector('#project-repository');select.value=store.db.prepare('SELECT id FROM repositories').get().id;select.dispatchEvent(new window.Event('change',{bubbles:true}));click('[data-build-review]');await until(()=>document.querySelector('#build-review-output pre'));assert.match(document.querySelector('#build-review-output').textContent,/src\/app.js:1/);
  location.hash=`pitch/${projectId}/startup/title`;await until(()=>document.querySelector('#pitch-headline')?.value==='Book a coach in minutes');assert.match(document.querySelector('#pitch-slide-status').textContent,/reviewed/);
  assert.equal(store.db.prepare('SELECT role FROM conversations').all().length,2);assert.deepEqual(errors,[]);
 }finally{clearTimeout(window.toastTimer);await new Promise(r=>setTimeout(r,600));for(const [k,d]of previous){if(d)Object.defineProperty(globalThis,k,d);else delete globalThis[k];}window.close();await new Promise(r=>server.close(r));store.db.close();rmSync(dataDir,{recursive:true,force:true});}
});
