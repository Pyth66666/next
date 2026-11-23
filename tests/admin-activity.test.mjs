import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createApplication} from '../backend/app.mjs';
import {configuration} from '../backend/config.mjs';
import {toCsv} from '../backend/activity.mjs';
import {resetYcCache} from '../backend/idea-check.mjs';
import {emptySlide} from '../shared/pitch-data.js';

const IDEA='A revision planner that builds exam timetables for university students';
const json=v=>new Response(JSON.stringify(v),{headers:{'Content-Type':'application/json'}});
const service={
 async ai(system,user){
  if(user.startsWith('Explain this file'))return {text:JSON.stringify({summary:'Says hello to the user.',sections:[{start:1,end:1,title:'Hello',explain:'Stores hello.'}]})};
  if(/"ideas"/.test(user))return {text:JSON.stringify({ideas:[{title:'Study buddy matcher',problem:'p',who:'w',solution:'Match students for revision.',firstVersion:'f',whyItFits:'y'}]})};
  return {text:JSON.stringify({verdict:'crowded',originality:40,summary:'Several planners exist.',closest:[{index:0,why:'Same idea.'}],standOut:['Focus on one course']})};
 },
 async github(){return {items:[{full_name:'someone/study-planner',description:'Revision planner for exams',html_url:'https://github.com/someone/study-planner',stargazers_count:3}]};},
 async fetcher(url){
  if(url.startsWith('https://devpost.com/'))return json({software:[{name:'Exam Revision Planner',tagline:'Timetables for students before exams',url:'https://devpost.com/software/x'}]});
  if(url.startsWith('https://yc-oss.github.io/'))return json([]);
  throw new Error('unexpected '+url);
 }
};

async function fixture(t){
 resetYcCache();
 const dataDir=mkdtempSync(join(tmpdir(),'apex-activity-'));
 const config={...configuration({}),dataDir,port:0,adminUserIds:[]};
 const app=createApplication({config,providers:service});
 await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${app.server.address().port}`;
 t.after(async()=>{await new Promise(r=>app.server.close(r));app.store.db.close();rmSync(dataDir,{recursive:true,force:true});});
 const client=()=>{let cookie='',csrf='';return async(path,method='GET',data)=>{const r=await fetch(base+path,{method,headers:{Origin:config.origin,...(cookie?{Cookie:cookie}:{}),...(csrf?{'X-CSRF-Token':csrf}:{}),...(data?{'Content-Type':'application/json'}:{})},...(data?{body:JSON.stringify(data)}:{})});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];if(path.startsWith('/api/auth/')&&r.ok){const c=r.clone();csrf=(await c.json()).csrf||csrf;}return r;};};
 return {app,client,config};
}

test('admins see every user’s idea searches, Learn my app activity, projects and pitches',async t=>{
 const {app,client,config}=await fixture(t);
 const user=client(),boss=client();
 assert.equal((await user('/api/auth/register','POST',{email:'student@example.com',password:'a strong password'})).status,200);
 assert.equal((await boss('/api/auth/register','POST',{email:'boss@example.com',password:'a strong password'})).status,200);
 // Admin rights come from the account ID (admin emails cannot sign up through the form).
 config.adminUserIds.push(app.store.db.prepare("SELECT id FROM users WHERE email='boss@example.com'").get().id);
 const uid=app.store.db.prepare("SELECT id FROM users WHERE email='student@example.com'").get().id;
 app.store.db.prepare('INSERT INTO plans VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET plan=excluded.plan').run(uid,'basic',Date.now());

 assert.equal((await user('/api/idea-check','POST',{idea:IDEA})).status,200);
 assert.equal((await user('/api/idea-brainstorm','POST',{interest:'study tools'})).status,200);
 const slide={...emptySlide(),headline:'Revise smarter',answers:{identity:'StudyPal',summary:'Plans your revision'}};
 assert.equal((await user('/api/projects/p1','PUT',{type:'mvp',name:'StudyPal',answers:['Students cram','Plan revision','Students','Two weeks','A timetable'],output:'Build a revision planner.',tasks:[],pitch:{startup:{slides:{title:slide}}}})).status,200);
 const up=await user('/api/repositories/upload','POST',{name:'My App',files:[{path:'src/app.js',content:'export const hello = "hello";'}]});assert.equal(up.status,201);
 const repoId=(await up.json()).id;
 assert.equal((await user(`/api/repositories/${repoId}/explain`,'POST',{path:'src/app.js'})).status,200);

 // Regular users cannot read anyone's activity.
 assert.equal((await user('/api/admin/activity')).status,403);
 assert.equal((await user('/api/admin/activity.csv')).status,403);

 const feed=await (await boss('/api/admin/activity')).json();
 const kinds=new Set(feed.map(i=>i.kind));
 for(const k of ['idea-check','idea-brainstorm','project','pitch','app-added','file-explained'])assert.ok(kinds.has(k),k);
 const check=feed.find(i=>i.kind==='idea-check');
 assert.equal(check.email,'student@example.com');assert.equal(check.title,IDEA);assert.match(check.detail,/crowded · 40\/100/);
 assert.match(feed.find(i=>i.kind==='idea-brainstorm').detail,/Study buddy matcher/);
 assert.match(feed.find(i=>i.kind==='project').detail,/Build a revision planner/);
 assert.match(feed.find(i=>i.kind==='pitch').detail,/Revise smarter[\s\S]*StudyPal/);
 assert.match(feed.find(i=>i.kind==='file-explained').title,/My App: src\/app.js/);
 assert.ok(feed.every((x,i)=>i===0||feed[i-1].at>=x.at),'newest first');

 // Filters: by group, by text and by user.
 assert.deepEqual([...new Set((await (await boss('/api/admin/activity?group=ideas')).json()).map(i=>i.kind))].sort(),['idea-brainstorm','idea-check']);
 assert.ok((await (await boss('/api/admin/activity?q=timetables')).json()).every(i=>/timetables/i.test(i.title+i.detail)));
 assert.equal((await (await boss('/api/admin/activity?user=nobody')).json()).length,0);

 const csv=await boss('/api/admin/activity.csv?group=ideas');
 assert.equal(csv.status,200);assert.match(csv.headers.get('content-type'),/text\/csv/);assert.match(csv.headers.get('content-disposition'),/attachment; filename="apexelerate-activity-/);
 const body=await csv.text();assert.match(body,/Time \(UTC\),User,Type,Title,Details/);assert.match(body,/student@example.com,Idea check,/);
});

test('CSV quotes commas, quotes and new lines, and stops formulas from running',()=>{
 const out=toCsv([{at:0,email:'a@b.c',label:'Idea check',title:'=HYPERLINK("x")',detail:'line one, "two"\nline three'}]);
 assert.ok(out.startsWith('﻿'));
 assert.match(out,/"'=HYPERLINK\(""x""\)"/);
 assert.match(out,/"line one, ""two""\nline three"/);
});
