import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createApplication} from '../backend/app.mjs';
import {configuration} from '../backend/config.mjs';
import {ideaKeywords,overlap,checkIdea,resetYcCache,searchYc} from '../backend/idea-check.mjs';

const IDEA='A study planner app that helps university students plan revision timetables before exams';
const json=v=>new Response(JSON.stringify(v),{headers:{'Content-Type':'application/json'}});
function fakeNet({devpostDown=false}={}){
 const urls=[];
 const fetcher=async url=>{urls.push(url);
  if(url.startsWith('https://devpost.com/')){if(devpostDown)return new Response('down',{status:503});return json({software:[{name:'StudyBuddy Planner',tagline:'Revision timetable planner for students before exams',url:'https://devpost.com/software/studybuddy',winner:true},{name:'Cat Facts',tagline:'Random cat facts',url:'https://devpost.com/software/cats'}]});}
  if(url.startsWith('https://yc-oss.github.io/'))return json([{name:'Exam Pal',slug:'exam-pal',one_liner:'Revision planner for students',long_description:'Helps university students plan exams',website:'https://exampal.example',batch:'W24',status:'Active',tags:['EdTech']},{name:'Rocket Co',one_liner:'Rockets',long_description:'Space',website:'https://rocket.example'}]);
  throw new Error('unexpected '+url);};
 const github=async path=>{urls.push(path);return {items:[{full_name:'someone/study-planner',description:'Plan revision for exams, for students',html_url:'https://github.com/someone/study-planner',stargazers_count:42}]};};
 return {urls,fetcher,github};
}
const verdictAi=calls=>async(system,user)=>{calls.push({system,user});return {text:JSON.stringify({verdict:'crowded',originality:41,summary:'Several study planners exist.',closest:[{index:0,why:'Same revision timetable for students.'},{index:99,why:'invented'}],standOut:['Focus on one university course']}),model:'fixture',usage:null};};

test('keywords drop filler words and overlap scores shared terms',()=>{
 const k=ideaKeywords(IDEA);
 assert.ok(k.includes('study')&&k.includes('students'));assert.ok(!k.includes('the')&&!k.includes('app')&&!k.includes('helps'));
 assert.equal(overlap(['study','exam'],'A study tool'),0.5);assert.equal(overlap([],'x'),0);
});

test('idea check searches every source, ranks matches and keeps only real AI references',async()=>{
 resetYcCache();const net=fakeNet(),calls=[];
 const r=await checkIdea({idea:IDEA,ai:verdictAi(calls),github:net.github,fetcher:net.fetcher});
 assert.equal(r.verdict,'crowded');assert.equal(r.originality,41);
 assert.deepEqual(r.sources.map(s=>[s.id,s.ok]),[['devpost',true],['yc',true],['github',true],['producthunt',false]]);
 assert.match(r.sources.find(s=>s.id==='producthunt').error,/PRODUCT_HUNT_TOKEN/);
 assert.ok(r.matches.some(m=>m.source==='devpost'&&m.name==='StudyBuddy Planner'));
 assert.ok(r.matches.some(m=>m.source==='yc'&&m.name==='Exam Pal'));
 assert.ok(!r.matches.some(m=>m.name==='Cat Facts'||m.name==='Rocket Co'),'Unrelated results are filtered out');
 assert.equal(r.closest.length,1,'An index the AI made up is dropped');assert.equal(r.closest[0].name,r.matches[0].name);
 assert.match(calls[0].user,/StudyBuddy Planner/);assert.match(calls[0].system,/untrusted/);
});

test('one source failing does not fail the check, and the YC list is cached',async()=>{
 resetYcCache();const net=fakeNet({devpostDown:true});
 const r=await checkIdea({idea:IDEA,ai:verdictAi([]),github:net.github,fetcher:net.fetcher});
 assert.equal(r.sources.find(s=>s.id==='devpost').ok,false);assert.ok(r.matches.length>0);
 await searchYc(['study','students'],net.fetcher);
 assert.equal(net.urls.filter(u=>u.startsWith('https://yc-oss')).length,1);
});

test('too-short ideas are rejected before any search',async()=>{
 const net=fakeNet();
 await assert.rejects(checkIdea({idea:'an app',ai:verdictAi([]),github:net.github,fetcher:net.fetcher}),/Describe the idea/);
 assert.equal(net.urls.length,0);
});

test('idea check route needs sign-in and returns a verdict',async t=>{
 resetYcCache();const dataDir=mkdtempSync(join(tmpdir(),'apex-idea-'));const net=fakeNet();
 const service={ai:verdictAi([]),github:net.github,fetcher:net.fetcher};
 const config={...configuration({}),dataDir,port:0};const app=createApplication({config,providers:service});
 await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${app.server.address().port}`;
 t.after(async()=>{await new Promise(r=>app.server.close(r));app.store.db.close();rmSync(dataDir,{recursive:true,force:true});});
 let cookie='',csrf='';
 const call=async(path,data)=>{const r=await fetch(base+path,{method:'POST',headers:{Origin:config.origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{}),...(csrf?{'X-CSRF-Token':csrf}:{})},body:JSON.stringify(data)});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return r;};
 assert.equal((await call('/api/idea-check',{idea:IDEA})).status,403);
 const reg=await call('/api/auth/register',{email:'idea@example.com',password:'a strong password'});assert.equal(reg.status,200);const regBody=await reg.json();csrf=regBody.csrf;app.store.db.prepare('INSERT INTO plans VALUES(?,?,?)').run(regBody.user.id,'basic',Date.now());
 const r=await call('/api/idea-check',{idea:IDEA});assert.equal(r.status,200);const out=await r.json();
 assert.equal(out.verdict,'crowded');assert.ok(out.matches.length);
 assert.equal((await call('/api/idea-check',{idea:''})).status,400);
});

import {brainstormIdeas} from '../backend/idea-check.mjs';
import {tracks,trackById,trackContext} from '../shared/industry-tracks.js';
import {problemAreas,briefSteps} from '../public/brief-flow.js';

test('the 7 industry tracks are complete and appear as brief starting points',()=>{
 assert.deepEqual(tracks.map(t=>t.label),['Customer Experience & Support','Operations & Productivity','Marketing & Content','Data & Decision-Making','Sustainability & ESG','Finance & Accounting','Logistics & Supply Chain']);
 for(const t of tracks){assert.ok(t.problems.length>=6&&t.ideas.length>=5&&t.users.length&&t.data.length&&t.judging.length,t.id);assert.match(trackContext(t),new RegExp(t.label.replace(/[&]/g,'.')));}
 assert.ok(problemAreas.some(a=>a.id==='esg'&&a.group==='track'));
 const steps=briefSteps({problemArea:'logistics',answers:Array(5).fill('')});
 assert.equal(steps[0].suggestions[0],trackById('logistics').problems[0]);assert.deepEqual(steps[1].suggestions,trackById('logistics').mvp);
});

test('idea check uses the track as grounding and returns suggested stronger versions',async()=>{
 resetYcCache();const net=fakeNet(),calls=[];
 const ai=async(system,user)=>{calls.push(user);return {text:JSON.stringify({verdict:'crowded',originality:40,summary:'Several exist.',closest:[],standOut:['Focus on clinics'],suggestions:[{title:'Clinic inbox',idea:'A shared inbox for small clinics that assigns every WhatsApp message an owner.',why:'Narrower audience.'},{title:'',idea:'  '}]}),model:'m',usage:null};};
 const r=await checkIdea({idea:IDEA,track:'cx',ai,github:net.github,fetcher:net.fetcher});
 assert.match(calls[0],/Industry track: Customer Experience & Support/);
 assert.equal(r.track,'cx');assert.equal(r.suggestions.length,1);assert.equal(r.suggestions[0].title,'Clinic inbox');
 resetYcCache();const plain=await checkIdea({idea:IDEA,ai,github:net.github,fetcher:net.fetcher});assert.equal(plain.track,null);assert.doesNotMatch(calls[1],/Industry track/);
});

test('brainstormer needs a track or interest, grounds on the track and keeps only usable ideas',async()=>{
 const calls=[];const ai=async(system,user)=>{calls.push(user);return {text:JSON.stringify({ideas:[{title:'Expiry alert',problem:'Food expires',who:'Grocers',solution:'Flag stock near expiry.',firstVersion:'One shelf',whyItFits:'Cuts waste'},{title:'Empty',solution:''}]}),model:'m',usage:null};};
 await assert.rejects(brainstormIdeas({ai}),e=>e.status===400);
 const r=await brainstormIdeas({track:'logistics',interest:'groceries',ai});
 assert.match(calls[0],/Logistics & Supply Chain/);assert.match(calls[0],/groceries/);
 assert.equal(r.ideas.length,1);assert.equal(r.ideas[0].title,'Expiry alert');
 await assert.rejects(brainstormIdeas({track:'cx',ai:async()=>({text:'{"ideas":[]}'})}),e=>e.status===502);
});
