import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {pitchSlides,emptySlide,slideReadiness,deckProgress,validatePitch,pitchOutline} from '../public/pitch-data.js';
import {createPitch} from '../public/pitch.js';

test('pitch framework preserves all ten PDF sections in order',()=>{
 assert.deepEqual(pitchSlides.map(s=>s.id),['title','problem','solution','market','business','gtm','traction','competition','team','ask']);
 assert.ok(pitchSlides.every(s=>s.hackathon&&s.questions.length&&s.visual));
 assert.match(pitchSlides.find(s=>s.id==='market').questions[0].label,/TAM/);
 assert.match(pitchSlides.find(s=>s.id==='traction').tip,/not proof/);
});

test('slide review requires answers and honest evidence labels; edits can be reopened',()=>{
 const def=pitchSlides.find(s=>s.id==='problem'),d=emptySlide();assert.ok(slideReadiness(def,d).missing.length>=4);
 d.headline='Independent coaches lose time';d.answers={customer:'Local coaches',pain:'Manual booking',impact:'Not measured yet'};assert.equal(slideReadiness(def,d).missing.length,1);
 d.evidenceState='provided';assert.equal(slideReadiness(def,d).missing.length,1);
 d.evidenceState='assumption';d.reviewed=true;assert.equal(slideReadiness(def,d).status,'reviewed');
 const p={answers:['CoachBook'],pitch:{startup:{slides:{problem:d}}}};assert.equal(deckProgress(p,'startup').reviewed,1);assert.equal(deckProgress(p,'startup').assumptions,1);assert.equal(deckProgress(p,'hackathon').reviewed,0);
 assert.match(pitchOutline(p,'startup'),/Assumption|assumption/);assert.match(pitchOutline(p,'startup'),/Not measured yet/);assert.match(pitchOutline(p,'startup'),/Speaker notes/);
});

test('pitch schema bounds inputs, strips unknown keys and rejects invented completion',()=>{
 const d=emptySlide();d.headline='Hello';d.answers={identity:'CoachBook',summary:'Bookings for coaches',injected:'discard'};d.reviewed=true;
 const clean=validatePitch({startup:{event:'VC meeting',duration:5,slides:{title:d,unknown:{text:'discard'}}},hidden:'discard'});assert.equal(clean.startup.slides.title.reviewed,true);assert.equal(clean.startup.slides.title.answers.injected,undefined);assert.equal(clean.hidden,undefined);assert.equal(clean.startup.slides.unknown,undefined);
 assert.throws(()=>validatePitch({startup:{slides:{title:{...d,headline:''}}}}));
 assert.throws(()=>validatePitch({startup:{slides:{title:{...d,notes:'x'.repeat(2001)}}}}));
 assert.throws(()=>validatePitch({startup:{duration:0,slides:{}}}));
 assert.throws(()=>validatePitch({startup:{slides:[]}}));
});

test('pitch UI supports free navigation, independent paths, evidence checks and export',async()=>{
 const dom=new JSDOM('<div id="app"></div>',{url:'http://localhost:4174/#pitch/p1/startup/title'}),w=dom.window;
 const names=['window','document','location','navigator','Blob'];const previous=new Map(names.map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 for(const k of names)Object.defineProperty(globalThis,k,{value:k==='window'?w:w[k],configurable:true,writable:true});w.scrollTo=()=>{};w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.dispatchEvent(new w.Event('close'));};
 const p={id:'p1',answers:['CoachBook','Fast bookings','Local coaches','No payments','Browse then book'],output:'Approved brief',tasks:[]};let saved='';
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const pitch=createPitch({app:document.querySelector('#app'),header:()=>'<header class="nav"><nav></nav></header>',esc,toast:()=>{},getProjects:()=>[p],save:()=>{saved=JSON.stringify(p);return true;},cloud:{nav(){},isAuthenticated:()=>false}});
 const fill=(s,v)=>{const el=document.querySelector(s);assert.ok(el,s);el.value=v;el.dispatchEvent(new w.Event('input',{bubbles:true}));};const go=(track,id)=>{location.hash=`pitch/p1/${track}/${id}`;pitch.route();};
 try{
  assert.equal(pitch.route(),true);assert.equal(document.querySelectorAll('.pitch-slide-nav a').length,10);assert.equal(document.querySelector('[data-pitch=review]').disabled,true);
  fill('#pitch-headline','Book a coach in minutes');fill('[data-pitch-answer=identity]','CoachBook');fill('[data-pitch-answer=summary]','Simple bookings for local coaches');document.querySelector('[data-pitch=review]').click();assert.equal(p.pitch.startup.slides.title.reviewed,true);
  fill('#pitch-headline','An updated headline');assert.equal(p.pitch.startup.slides.title.reviewed,false);
  go('startup','traction');assert.equal(document.querySelector('.pitch-slide-heading h2').textContent,'Traction');assert.equal(document.querySelector('#pitch-evidence-state').value,'missing');
  fill('#pitch-headline','No paying users yet');fill('[data-pitch-answer=metrics]','No revenue or users yet.');fill('[data-pitch-answer=validation]','MVP built; no customer interviews.');fill('[data-pitch-answer=period]','Next: five interviews next week.');assert.equal(document.querySelector('[data-pitch=review]').disabled,true);
  const state=document.querySelector('#pitch-evidence-state');state.value='assumption';state.dispatchEvent(new w.Event('change',{bubbles:true}));assert.equal(document.querySelector('[data-pitch=review]').disabled,false);document.querySelector('[data-pitch=review]').click();
  const filter=document.querySelector('#pitch-filter');filter.value='unfinished';filter.dispatchEvent(new w.Event('change',{bubbles:true}));assert.equal(document.querySelectorAll('.pitch-slide-nav a').length,9);
  go('hackathon','title');assert.equal(document.querySelector('#pitch-headline').value,'');fill('#pitch-headline','Hackathon demo headline');fill('[data-pitch-answer=identity]','<img src=x onerror=alert(1)>');assert.equal(document.querySelector('.pitch-slide-preview img'),null);
  go('startup','title');assert.equal(document.querySelector('#pitch-headline').value,'An updated headline');document.querySelector('[data-pitch=export]').click();
  const dialog=document.querySelector('.pitch-export-dialog');assert.equal(dialog.querySelector('textarea'),null);assert.equal(dialog.querySelectorAll('[data-export-slide]').length,10);assert.ok(dialog.querySelector('[data-pitch-download]'));assert.ok(!dialog.textContent.includes('Evidence/source/date:'));
  let copied='';Object.defineProperty(w.navigator,'clipboard',{value:{writeText:async text=>{copied=text;}},configurable:true});dialog.querySelector('[data-pitch-copy]').click();await new Promise(r=>setTimeout(r,0));assert.match(copied,/No paying users yet/);assert.match(copied,/Speaker notes/);assert.match(copied,/\[Unfinished\]/);
  w.navigator.clipboard.writeText=async()=>{throw Error('Clipboard blocked');};dialog.querySelector('[data-pitch-copy]').click();await new Promise(r=>setTimeout(r,0));assert.match(dialog.querySelector('[data-export-feedback]').textContent,/Use Download/);
  assert.ok(JSON.parse(saved).pitch.hackathon.slides.title.headline);assert.match(document.querySelector('#pitch-local-guidance').textContent,/review|steps/i);
 }finally{w.close();for(const [k,d]of previous){if(d)Object.defineProperty(globalThis,k,d);else delete globalThis[k];}}
});
