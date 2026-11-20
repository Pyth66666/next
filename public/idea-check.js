// Idea checker page (#ideas): the user describes an idea, the server searches Devpost
// hackathon projects, YC companies, GitHub and Product Hunt, and the AI says whether the
// idea is new, crowded or already taken, with the closest matches and ways to stand out.
const VERDICT={
 novel:{label:'Looks new',text:'Nothing close turned up in the sources we searched.'},
 crowded:{label:'Crowded space',text:'Others work on parts of this. You will need a clear angle.'},
 taken:{label:'Already exists',text:'Something very similar is already out there.'}
};
const SOURCE_NAME={devpost:'Devpost',yc:'YC',github:'GitHub',producthunt:'Product Hunt'};

export function createIdeaCheck({app,header,esc,toast,cloud}){
 let last=null,draft='',busy=false;

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
   ${others.length?`<details class="idea-more"><summary>Other similar results (${others.length})</summary><ul class="idea-matches">${others.map(matchItem).join('')}</ul></details>`:''}
   <p class="idea-sources">Searched: ${r.sources.map(s=>`<span class="${s.ok?'ok':'off'}" title="${esc(s.error||'')}">${esc(s.label)}${s.ok?` (${s.count})`:' — skipped'}</span>`).join(' · ')}. Keywords: ${r.keywords.map(esc).join(', ')}.</p>
   ${failed.length?`<p class="idea-note">${failed.map(s=>`${esc(s.label)}: ${esc(s.error)}`).join('<br>')}</p>`:''}
   <p class="idea-note">This only covers what these sources list. A “looks new” verdict is a starting point, not proof nobody has built it.</p>
  </section>`;
 }

 function page(){
  app.innerHTML=`${header(true)}<main class="idea-page wrap">
   <div class="eyebrow">IDEA CHECKER</div><h1>Has someone built this already?</h1>
   <p>Describe your idea. We search hackathon projects on Devpost, YC startups, GitHub and Product Hunt, then tell you how original it looks and how to make it stand out.</p>
   <form id="idea-form" class="idea-form"><label for="idea-text">Your idea</label>
    <textarea id="idea-text" name="idea" rows="4" maxlength="2000" required placeholder="Example: A revision planner that builds exam timetables for university students from their course list."></textarea>
    <p class="idea-hint">Say what it does and who it is for. One or two sentences is enough.</p>
    <p class="form-feedback error" role="alert"></p>
    <button class="button dark" type="submit">Check my idea</button>
   </form>
   <div id="idea-output">${last?results(last):''}</div>
  </main>`;
  const input=app.querySelector('#idea-text');input.value=draft;
  input.addEventListener('input',()=>{draft=input.value;});
  cloud.nav();
 }

 async function check(form){
  if(busy)return;
  const idea=form.idea.value.trim(),feedback=form.querySelector('.form-feedback'),button=form.querySelector('button');
  feedback.textContent='';
  if(idea.length<15){feedback.textContent='Add a bit more: what it does and who it is for.';form.idea.focus();return;}
  busy=true;button.disabled=true;button.textContent='Searching…';
  app.querySelector('#idea-output').innerHTML='<p class="idea-loading">Searching Devpost, YC, GitHub and Product Hunt, then reviewing the matches. This takes about 10–20 seconds.</p>';
  try{
   last=await cloud.request('/api/idea-check','POST',{idea});
   app.querySelector('#idea-output').innerHTML=results(last);
  }catch(e){
   app.querySelector('#idea-output').innerHTML='';feedback.textContent=e.message||'The check failed. Try again.';
  }finally{busy=false;button.disabled=false;button.textContent='Check my idea';}
 }

 document.addEventListener('submit',e=>{if(e.target.id==='idea-form'){e.preventDefault();check(e.target);}});

 return {
  route(){
   if(location.hash.slice(1)!=='ideas')return false;
   if(!cloud.requireAccount())return true;
   page();return true;
  }
 };
}
