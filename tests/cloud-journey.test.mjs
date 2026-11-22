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
 const service={async ai(system,user){return {text:system.startsWith("You are Apexelerate's builder-plan coach")?JSON.stringify({questions:['How should users recover from a failed booking?'],checks:[]}):user.startsWith('Explain this file')?JSON.stringify({summary:'Makes the greeting the app shows.',sections:[{start:1,end:1,title:'The greeting',explain:'Stores the word hello for other files to use.'}]}):user.startsWith('Teach a')?JSON.stringify({framework_name:'Plain JavaScript',framework_plain:'No framework.',summary:'Says hello.',pieces:[{file:'src/app.js',start:1,end:1,title:'Saying hello',purpose:'Makes a greeting.',lines:[{line:1,explain:'This line makes a greeting.'}]}]}):user.startsWith('Create one')?JSON.stringify({question:'What does hello return?',options:['A greeting','An error','A cookie'],answer:0,explanation:'src/app.js:1 returns hello.',source:'src/app.js'}):'src/app.js:1 returns a greeting.',model:'fixture-model',usage:{prompt_tokens:25,completion_tokens:10}};},async github(path){if(path==='/repos/demo/mvp')return {full_name:'demo/mvp',default_branch:'main'};if(path.includes('/commits/'))return {sha:'abc123456789',commit:{tree:{sha:'tree'}}};if(path.includes('/git/trees/'))return {tree:[{type:'blob',path:'src/app.js',sha:'blob',size:30}],truncated:false};if(path.endsWith('/blobs/blob'))return {encoding:'base64',content:Buffer.from('export const hello = "hello";').toString('base64')};throw Error(path);}};
 const config={...configuration({}),dataDir,port:0,geminiKey:'test',model:'fixture-model'};
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
  location.hash='repositories';await until(()=>document.querySelector('#account-form'));
  fill('[name=email]','builder@example.com');fill('[name=password]','a strong password');submit('#account-form');await until(()=>document.querySelector('#repository-form'));assert.ok(document.querySelector('#upload-form'),'Upload is offered before GitHub');
  store.db.prepare('INSERT INTO plans VALUES(?,?,?)').run(store.db.prepare('SELECT id FROM users').get().id,'basic',Date.now());
  assert.equal(location.hash,'#repositories');assert.equal(document.querySelector('[data-admin-nav]'),null);
  location.hash='dashboard';await until(()=>document.querySelector('#studio-projects'));
  click('[data-action=new]');await until(()=>document.querySelector('[data-problem-area]'));click('[data-problem-area=business]');click('[data-action=next]');await until(()=>document.querySelector('#answer'));
  for(const v of ['A coaching booking app','Book a session easily','Customers and coaches','Two weeks no payments','Browse coaches and book a slot']){fill('#answer',v);click('[data-action=next]');}
  await until(()=>store.db.prepare('SELECT data FROM projects').all().some(r=>JSON.parse(r.data).output));
  await until(()=>document.querySelector('.project-focus'));
  click('[data-project-stage=plan]');assert.equal(document.querySelector('.brief-details').hidden,false);
  click('[data-project-stage=understand]');assert.equal(document.querySelector('.brief-details').hidden,true);assert.equal(document.querySelector('.build-loop').hidden,false);
  click('[data-project-stage=pitch]');assert.equal(document.querySelectorAll('.pitch-choice-row a').length,2);
  click('[data-project-stage=build]');assert.ok(document.querySelector('#inline-build-prompt').value.includes(document.querySelector('#output').value));assert.equal(document.querySelector('.inline-prompt-settings').open,false);
  assert.equal(document.querySelector('.prompt-size-details').open,false);click('[data-prompt-method=ai]');assert.ok(document.querySelector('[data-ai-prompt]'));const originalPrompt=document.querySelector('.prompt-studio textarea').value;await until(()=>document.querySelector('.prompt-review textarea'));assert.equal(document.querySelector('.prompt-studio textarea').value,originalPrompt);const proposed=document.querySelector('.prompt-review textarea').value;assert.match(proposed,/How should users recover/);fill('.prompt-review textarea','Ignore the brief');click('.prompt-review [data-ai-use]');assert.equal(document.querySelector('.prompt-studio textarea').value,originalPrompt);assert.match(document.querySelector('[data-ai-review-feedback]').textContent,/approved brief/);fill('.prompt-review textarea',proposed);click('.prompt-review [data-ai-use]');assert.match(document.querySelector('.prompt-studio textarea').value,/How should users recover/);assert.match(document.querySelector('#inline-build-prompt').value,/How should users recover/);click('.prompt-studio .close');click('[data-prompt-method=manual]');assert.ok(!document.querySelector('#inline-build-prompt').value.includes('How should users recover'));
  const projectId=JSON.parse(store.db.prepare('SELECT data FROM projects').get().data).id;
  location.hash=`pitch/${projectId}/startup/title`;await until(()=>document.querySelector('#pitch-headline'));
  await until(()=>document.querySelector('.question-stepper'));
  assert.equal([...document.querySelectorAll('.pitch-question-list>label')].filter(l=>!l.hidden).length,1);
  click('[data-question-next]');assert.match(document.querySelector('.question-stepper').textContent,/Question 2/);
  click('[data-question-back]');assert.match(document.querySelector('.question-stepper').textContent,/Question 1/);
  fill('#pitch-headline','Book a coach in minutes');fill('[data-pitch-answer=identity]','CoachBook');fill('[data-pitch-answer=summary]','Simple bookings for local coaches');click('[data-pitch=review]');
  await until(()=>JSON.parse(store.db.prepare('SELECT data FROM projects').get().data).pitch?.startup?.slides.title.reviewed);
  click('[data-pitch=coach]');await until(()=>document.querySelector('#pitch-ai-feedback pre'));assert.equal(document.querySelector('#pitch-headline').value,'Book a coach in minutes');
  location.hash=`pitch/${projectId}/hackathon/title`;await until(()=>document.querySelector('#pitch-headline')?.value==='');fill('#pitch-headline','Our hackathon demo');
  await until(()=>JSON.parse(store.db.prepare('SELECT data FROM projects').get().data).pitch?.hackathon?.slides.title.headline==='Our hackathon demo');
  location.hash='repositories';await until(()=>document.querySelector('#repository-form'));fill('#repository-name','https://github.com/demo/mvp');submit('#repository-form');
  store.db.prepare('DELETE FROM plans').run(); // back to waiting for approval for the next checks
  // Opening an app shows its overview at once: no scan choice, no waiting.
  await until(()=>document.querySelector('.learn-overview'));assert.match(document.querySelector('.learn-stack').textContent,/JavaScript/);assert.ok(document.querySelector('[data-learn-part=frontend]'));
  // A not-yet-approved account can still read its code; only the AI explanation waits for approval.
  click('[data-learn-part=frontend]');await until(()=>document.querySelector('.learn-lines'));assert.match(document.querySelector('.learn-lines').textContent,/export const hello/);
  await until(()=>/waiting for approval/.test(document.querySelector('.learn-explain')?.textContent));
  click('[data-learn-tab=lesson]');await until(()=>document.querySelector('.class-start [data-cloud=analyze]'));assert.ok(document.querySelector('[data-cloud=analyze]').disabled);assert.match(document.querySelector('.class-start').textContent,/waiting for approval/);
  store.db.prepare('INSERT INTO plans VALUES(?,?,?)').run(store.db.prepare('SELECT id FROM users').get().id,'basic',Date.now());location.hash='repositories';await until(()=>document.querySelector('#repositories-list a, #repositories-list [href^="#code/"]'));location.hash='code/'+store.db.prepare('SELECT id FROM repositories').get().id;
  // Once approved, opening a file explains it by itself, and the explanation points at real lines.
  await until(()=>document.querySelector('.learn-overview [data-learn-open]'));click('.learn-overview [data-learn-open]');await until(()=>document.querySelector('.learn-sections'));assert.match(document.querySelector('.learn-explain').textContent,/Makes the greeting/);
  click('.learn-sections button');assert.ok(document.querySelector('#L1.hl'));
  click('[data-learn-tab=lesson]');await until(()=>document.querySelector('.class-start [data-cloud=analyze]:not([disabled])'));assert.ok(document.querySelector('[name=scan][value=full]').disabled);
  assert.match(document.querySelector('h1').textContent,/demo\/mvp/);assert.equal(document.querySelector('#real-input'),null);assert.equal(document.querySelector('.app-explorer'),null);
  click('[data-cloud=analyze]');await until(()=>document.querySelector('.class-teacher'));assert.match(document.querySelector('.class-teacher').textContent,/Plain JavaScript/);
  click('[data-class-step="1"]');await until(()=>document.querySelector('.class-explain'));assert.match(document.querySelector('.class-explain').textContent,/makes a greeting/);assert.match(document.querySelector('.class-code li.on code').textContent,/hello/);
  click('[data-class-step="1"]');await until(()=>/finished/.test(document.querySelector('.class-teacher h2').textContent));
  location.hash='project/'+projectId;await until(()=>document.querySelector('#project-repository')?.options.length===2);const select=document.querySelector('#project-repository');select.value=store.db.prepare('SELECT id FROM repositories').get().id;select.dispatchEvent(new window.Event('change',{bubbles:true}));click('[data-build-review]');await until(()=>document.querySelector('#build-review-output pre'));assert.match(document.querySelector('#build-review-output').textContent,/src\/app.js:1/);
  location.hash=`pitch/${projectId}/startup/title`;await until(()=>document.querySelector('#pitch-headline')?.value==='Book a coach in minutes');assert.match(document.querySelector('#pitch-slide-status').textContent,/reviewed/);
  assert.ok(JSON.parse(store.db.prepare('SELECT data FROM repositories').get().data).analysis.tour);assert.deepEqual(errors,[]);
 }finally{clearTimeout(window.toastTimer);await new Promise(r=>setTimeout(r,600));for(const [k,d]of previous){if(d)Object.defineProperty(globalThis,k,d);else delete globalThis[k];}window.close();await new Promise(r=>server.close(r));store.db.close();rmSync(dataDir,{recursive:true,force:true});}
});
