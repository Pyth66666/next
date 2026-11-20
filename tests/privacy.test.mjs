import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createApplication} from '../backend/app.mjs';
import {configuration} from '../backend/config.mjs';

// A project made while signed out lives only in this browser. Signing up must MOVE it into
// that account, so the next person on the same browser (signed out, or with another account)
// can neither see it nor import it into their own account.
test('browser projects move into one account and are not shared with the next user',async()=>{
 const dataDir=mkdtempSync(join(tmpdir(),'apex-privacy-'));
 const config={...configuration({}),dataDir,port:0};
 const {server,store}=createApplication({config,providers:{async ai(){return {text:'{}'};}}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 const dom=new JSDOM('<div id="app"></div><div id="toast"></div>',{url:config.origin});const {window}=dom;
 const secret={id:'private-idea-1',type:'mvp',name:'My secret pitch',answers:['A secret idea','x','x','x','x'],output:'',tasks:[],created:Date.now()};
 window.localStorage.setItem('apexelerate.projects.v1',JSON.stringify([secret]));
 const names=['window','document','location','localStorage','navigator','requestAnimationFrame','fetch','FormData','Event'];const previous=new Map(names.map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));const nativeFetch=globalThis.fetch;let cookie='';
 for(const k of ['window','document','location','localStorage','navigator','FormData','Event'])Object.defineProperty(globalThis,k,{value:k==='window'?window:window[k],configurable:true,writable:true});
 globalThis.requestAnimationFrame=fn=>fn();window.scrollTo=()=>{};window.HTMLElement.prototype.scrollIntoView=()=>{};window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};window.HTMLDialogElement.prototype.close=function(){this.dispatchEvent(new window.Event('close'));};
 globalThis.fetch=window.fetch=async(path,options={})=>{const r=await nativeFetch(base+path,{...options,headers:{...options.headers,Origin:config.origin,...(cookie?{Cookie:cookie}:{})}});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return r;};
 const until=async fn=>{const end=Date.now()+5000;while(!fn()){if(Date.now()>end)throw Error('Timed out waiting for UI');await new Promise(r=>setTimeout(r,15));}};
 const fill=(s,v)=>{const el=document.querySelector(s);assert.ok(el,s);el.value=v;el.dispatchEvent(new window.Event('input',{bubbles:true}));};const submit=s=>document.querySelector(s).dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));
 const local=()=>JSON.parse(window.localStorage.getItem('apexelerate.projects.v1')||'[]');
 const owners=()=>store.db.prepare('SELECT p.id,u.email FROM projects p JOIN users u ON u.id=p.user_id').all();
 const register=async email=>{location.hash='repositories';await until(()=>document.querySelector('#account-form'));fill('[name=email]',email);fill('[name=password]','a strong password');submit('#account-form');await until(()=>document.querySelector('#repository-form'));};
 try{
  await import('../public/app.js');await until(()=>document.querySelector('[data-account-link]'));
  await register('first@example.com');
  await until(()=>owners().some(r=>r.id===secret.id));
  await until(()=>!local().some(p=>p.id===secret.id));
  location.hash='account';await until(()=>document.querySelector('[data-cloud=logout]'));document.querySelector('[data-cloud=logout]').click();
  await until(()=>location.hash==='#home');
  location.hash='dashboard';await new Promise(r=>setTimeout(r,100));
  assert.ok(!document.body.textContent.includes('My secret pitch'),'Signed-out visitors must not see the previous account\'s project');
  await register('second@example.com');await new Promise(r=>setTimeout(r,300));
  assert.deepEqual(owners().map(r=>r.email),['first@example.com'],'Only the first account may own the project');
 }finally{
  clearTimeout(window.toastTimer);await new Promise(r=>setTimeout(r,600));for(const [k,d] of previous){if(d)Object.defineProperty(globalThis,k,d);else delete globalThis[k];}window.close();
  await new Promise(r=>server.close(r));store.db.close();rmSync(dataDir,{recursive:true,force:true});
 }
});
