// Idea lab page (#ideas): pick an industry track, brainstorm ideas for it, then check any idea
// against Devpost hackathon projects, YC companies, GitHub and Product Hunt. The AI says whether
// it is new, crowded or taken, how to stand out, and suggests stronger versions to check next.
import {tracks,trackById} from '../shared/industry-tracks.js';

const VERDICT={
 novel:{label:'Looks new',text:'Nothing close turned up in the sources we searched.'},
 crowded:{label:'Crowded space',text:'Others work on parts of this. You will need a clear angle.'},
 taken:{label:'Already exists',text:'Something very similar is already out there.'}
};
const SOURCE_NAME={devpost:'Devpost',yc:'YC',github:'GitHub',producthunt:'Product Hunt'};

export function createIdeaCheck({app,header,esc,toast,cloud}){
 let last=null,draft='',busy=false,track='',interest='',ideas=null;

 const matchItem=m=>`<li class="idea-match"><span class="idea-source idea-source-${esc(m.source)}">${esc(SOURCE_NAME[m.source]||m.source)}</span><div><a href="${esc(m.url)}" target="_blank" rel="noopener noreferrer">${esc(m.name)} ↗</a><p>${esc(m.tagline||'No description')}</p>${m.why?`<p class="idea-why">${esc(m.why)}</p>`:''}<small>${esc(m.note||'')}</small></div></li>`;

 function results(r){
  const v=VERDICT[r.verdict];
  const failed=r.sources.filter(s=>!s.ok);
  const others=r.matches.filter(m=>!r.closest.some(c=>c.url===m.url));
  return `<section class="idea-result" aria-live="polite">
   <div class="idea-verdict idea-verdict-${esc(r.verdict)}"><div><span class="eyebrow">VERDICT</span><h2>${esc(v.label)}</h2><p>${esc(v.text)}</p></div><div class="idea-score" aria-label="Originality ${r.originality} out of 100"><strong>${r.originality}</strong><span>/100 originality</span></div></div>
   <p class="idea-summary">${esc(r.summary)}</p>
   ${r.closest.length?`<h3>Closest matches</h3><ul class="idea-matches">${r.closest.map(matchItem).join('')}</ul>`:''}
   ${r.standOut.length?`<h3>How to stand out</h3><ul class="idea-standout">${r.standOut.map(s=>`<li>${esc(s)}</li>`).join('')}</ul>`:''}
   ${r.suggestions?.length?`<h3>Try a stronger version</h3><div class="idea-cards">${r.suggestions.map(s=>`<article class="idea-card"><h4>${esc(s.title)}</h4><p>${esc(s.idea)}</p>${s.why?`<p class="idea-why">${esc(s.why)}</p>`:''}<button class="button light" type="button" data-idea-use="${esc(s.idea)}">Check this version</button></article>`).join('')}</div>`:''}
   ${others.length?`<details class="idea-more"><summary>Other similar results (${others.length})</summary><ul class="idea-matches">${others.map(matchItem).join('')}</ul></details>`:''}
   <p class="idea-sources">Searched: ${r.sources.map(s=>`<span class="${s.ok?'ok':'off'}" title="${esc(s.error||'')}">${esc(s.label)}${s.ok?` (${s.count})`:' — skipped'}</span>`).join(' · ')}.</p>
   ${failed.length?`<p class="idea-note">${failed.map(s=>`${esc(s.label)}: ${esc(s.error)}`).join('<br>')}</p>`:''}
   <p class="idea-note">This only covers what these sources list. “Looks new” is a starting point, not proof nobody has built it.</p>
  </section>`;
 }

 const ideaCards=list=>`<div class="idea-cards">${list.map(i=>{const text=`${i.solution} For ${i.who}.`;return `<article class="idea-card"><h4>${esc(i.title)}</h4><p><b>Problem:</b> ${esc(i.problem)}</p><p><b>For:</b> ${esc(i.who)}</p><p><b>Build:</b> ${esc(i.solution)}</p>${i.firstVersion?`<p><b>First version:</b> ${esc(i.firstVersion)}</p>`:''}${i.whyItFits?`<p class="idea-why">${esc(i.whyItFits)}</p>`:''}<button class="button light" type="button" data-idea-use="${esc(text)}">Check this idea</button></article>`;}).join('')}</div>`;

 function trackPanel(){
  const t=trackById(track);
  if(!t)return '<p class="idea-hint">Pick a track to get ideas and feedback that fit it, or leave it on Any.</p>';
  return `<div class="track-panel"><p>${esc(t.summary)}</p><details><summary>What people struggle with</summary><ul>${t.problems.map(p=>`<li>${esc(p)}</li>`).join('')}</ul></details><details><summary>What judges look for</summary><ul>${t.judging.map(p=>`<li>${esc(p)}</li>`).join('')}</ul></details></div>`;
 }

 function page(){
  app.innerHTML=`${header(true)}<main class="idea-page wrap">
   <div class="eyebrow">IDEA LAB</div><h1>Find an idea. Test it.</h1>
   <p>Brainstorm ideas for an industry track, then check if someone has built it already.</p>
   <section class="idea-tracks" aria-label="Industry track"><h2>Industry track</h2>
    <div class="track-chips">${[['','Any'],...tracks.map(t=>[t.id,`${t.icon} ${t.label}`])].map(([id,l])=>`<button type="button" data-idea-track="${id}" aria-pressed="${track===id}" class="${track===id?'on':''}">${esc(l)}</button>`).join('')}</div>
    <div id="track-panel">${trackPanel()}</div>
   </section>
   <section class="idea-brainstorm"><h2>Need an idea?</h2>
    <form id="brainstorm-form" class="idea-form"><label for="brainstorm-text">Your interests <span>(optional)</span></label>
     <input id="brainstorm-text" name="interest" maxlength="600" placeholder="e.g. food stalls, students, WhatsApp, recycling">
     <p class="form-feedback error" role="alert"></p>
     <button class="button orange" type="submit">Brainstorm 5 ideas</button>
    </form>
    <div id="brainstorm-output">${ideas?ideaCards(ideas):''}</div>
   </section>
   <section class="idea-check"><h2>Check an idea</h2>
    <form id="idea-form" class="idea-form"><label for="idea-text">Your idea</label>
     <textarea id="idea-text" name="idea" rows="4" maxlength="2000" required placeholder="Example: A shared inbox that collects WhatsApp and Instagram messages for small clinics, with an owner for each."></textarea>
     <p class="idea-hint">Say what it does and who it is for. Ideas you check and brainstorm are saved to your account, and the site owner can see them.</p>
     <p class="form-feedback error" role="alert"></p>
     <button class="button dark" type="submit">Check my idea</button>
    </form>
    <div id="idea-output">${last?results(last):''}</div>
   </section>
  </main>`;
  const input=app.querySelector('#idea-text');input.value=draft;
  input.addEventListener('input',()=>{draft=input.value;});
  const it=app.querySelector('#brainstorm-text');it.value=interest;it.addEventListener('input',()=>{interest=it.value;});
  cloud.nav();
 }

 async function check(form){
  if(busy)return;
  const idea=form.idea.value.trim(),feedback=form.querySelector('.form-feedback'),button=form.querySelector('button');
  feedback.textContent='';
  if(idea.length<15){feedback.textContent='Add a bit more: what it does and who it is for.';form.idea.focus();return;}
  busy=true;button.disabled=true;button.textContent='Searching…';
  app.querySelector('#idea-output').innerHTML='<p class="idea-loading">Searching Devpost, YC, GitHub and Product Hunt, then reviewing the matches. About 10–20 seconds.</p>';
  try{
   last=await cloud.request('/api/idea-check','POST',{idea,track});
   app.querySelector('#idea-output').innerHTML=results(last);
  }catch(e){
   app.querySelector('#idea-output').innerHTML='';feedback.textContent=e.message||'The check failed. Try again.';
  }finally{busy=false;button.disabled=false;button.textContent='Check my idea';}
 }

 async function brainstorm(form){
  if(busy)return;
  const feedback=form.querySelector('.form-feedback'),button=form.querySelector('button');
  feedback.textContent='';
  if(!track&&interest.trim().length<3){feedback.textContent='Pick a track or type an interest first.';return;}
  busy=true;button.disabled=true;button.textContent='Thinking…';
  app.querySelector('#brainstorm-output').innerHTML='<p class="idea-loading">Coming up with ideas…</p>';
  try{
   ideas=(await cloud.request('/api/idea-brainstorm','POST',{track,interest:interest.trim()})).ideas;
   app.querySelector('#brainstorm-output').innerHTML=ideaCards(ideas);
  }catch(e){
   app.querySelector('#brainstorm-output').innerHTML='';feedback.textContent=e.message||'Brainstorming failed. Try again.';
  }finally{busy=false;button.disabled=false;button.textContent='Brainstorm 5 ideas';}
 }

 document.addEventListener('submit',e=>{
  if(e.target.id==='idea-form'){e.preventDefault();check(e.target);}
  if(e.target.id==='brainstorm-form'){e.preventDefault();brainstorm(e.target);}
 });
 document.addEventListener('click',e=>{
  if(location.hash!=='#ideas')return;
  const chip=e.target.closest('[data-idea-track]'),use=e.target.closest('[data-idea-use]');
  if(chip){
   track=chip.dataset.ideaTrack;
   app.querySelectorAll('[data-idea-track]').forEach(b=>{const on=b.dataset.ideaTrack===track;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on);});
   app.querySelector('#track-panel').innerHTML=trackPanel();
  }
  if(use){
   draft=use.dataset.ideaUse;const form=app.querySelector('#idea-form');form.idea.value=draft;
   form.scrollIntoView({behavior:'smooth',block:'start'});check(form);
  }
 });

 return {
  route(){
   if(location.hash.slice(1)!=='ideas')return false;
   if(!cloud.requireAccount())return true;
   page();return true;
  }
 };
}
