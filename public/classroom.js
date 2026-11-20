// Learn my app as a classroom: code on a "screen" at the left, the teacher's
// explanation at the right, stepping through each lesson one line at a time.

const lang=v=>v==='Bahasa Melayu'?'Bahasa Melayu':'English';

// Page shell. `tour` is repo.analysis.tour, or null before the first lesson.
// plan: {plan,label,used,limit,canFull,fullCredits} from /api/plan.
export function classroomHtml({repo,esc,aiConfigured,language,plan,chapters}){
 const meta=`${repo.source==='upload'?'Uploaded':'GitHub · '+esc(repo.branch)} · ${repo.files.length} files`;
 const tour=repo.analysis?.tour;
 const pending=plan?.plan==='pending',left=plan?.limit==null?Infinity:plan.limit-plan.used;
 const fullCost=plan?.fullCredits||3,canNormal=!pending&&left>=1,canFull=!pending&&plan?.canFull&&left>=fullCost;
 const option=(value,title,text,cost,ok,lock)=>`<label class="scan-option${ok?'':' locked'}"><input type="radio" name="scan" value="${value}" ${ok?'':'disabled'} ${value==='normal'&&ok||value==='full'&&ok&&!canNormal?'checked':''}><span><strong>${title}</strong><small>${text}</small><em>${lock||(cost===1?'Uses 1 scan':`Uses ${cost} scans`)}</em></span></label>`;
 const usage=!plan?'':pending?'<p class="class-note">Your account is waiting for approval. You can make lessons once it’s approved.</p>'
  :plan.limit==null?`<p class="class-note">${esc(plan.label)} · no scan limit</p>`
  :`<p class="class-note">${esc(plan.label)} plan · ${plan.used} of ${plan.limit} scans used this month</p>`;
 const start=`<section class="class-start">
  <h2>${tour?'Make a new lesson':'Ready to learn how it works?'}</h2>
  <p>Choose how much of your code to read. We’ll explain it line by line.</p>
  <div class="scan-options">
   ${option('normal','Normal scan',`The ${Math.min(10,repo.files.length)} most important files, in one short lesson.`,1,canNormal,pending?'Needs approval':left<1?'No scans left':'')}
   ${option('full','Full scan',`All ${repo.files.length} files, in ${chapters} chapter${chapters===1?'':'s'}.`,fullCost,canFull,pending?'Needs approval':!plan?.canFull?'Pro plan':left<fullCost?'Not enough scans left':'')}
  </div>
  <div class="class-start-row">
   <label>Language<select id="real-language">${['English','Bahasa Melayu'].map(o=>`<option${o===lang(language)?' selected':''}>${o}</option>`).join('')}</select></label>
   <button class="button orange" data-cloud="analyze" ${aiConfigured&&(canNormal||canFull)?'':'disabled'}>Start lesson ↗</button>
  </div>
  ${aiConfigured?usage:'<p class="class-note">AI isn’t set up on this site yet.</p>'}
  <p class="class-note class-wait" hidden>Preparing your lesson… a full scan can take about a minute.</p>
 </section>`;
 return `<main class="classroom wrap">
 <a class="back-link" href="#repositories">← My apps</a>
 <header class="class-head"><h1>${esc(repo.fullName)}</h1><p>${meta}</p></header>
 ${tour?`<div id="classroom" class="class-room"></div><details class="class-redo"><summary>Make a new lesson</summary>${start}</details>`:start}
 </main>`;
}

// Builds the steps: an intro, then one step per explained line, then the end.
function stepsFor(tour){
 const steps=[{kind:'intro'}];
 tour.pieces.forEach((p,lesson)=>p.lines.forEach((l,i)=>{if(l.explain)steps.push({kind:'line',lesson,line:i});}));
 steps.push({kind:'end'});
 return steps;
}

export function startClassroom(root,tour,esc){
 if(!root||!tour)return;
 const steps=stepsFor(tour);let at=0;
 const firstStepOf=lesson=>steps.findIndex(s=>s.kind==='line'&&s.lesson===lesson);

 function render(){
  const s=steps[at],p=s.kind==='line'?tour.pieces[s.lesson]:null,line=p?.lines[s.line];
  const tabs=`<nav class="class-lessons" aria-label="Lessons"><button data-class-go="0" class="${s.kind==='intro'?'on':''}">Intro</button>${tour.pieces.map((x,i)=>`<button data-class-go="${firstStepOf(i)}" class="${s.lesson===i&&s.kind==='line'?'on':''}"><span>${i+1}</span>${esc(x.title)}</button>`).join('')}</nav>`;
  const screen=p?`<div class="class-screen" aria-label="Code"><div class="class-screen-bar"><i></i><i></i><i></i><span>${esc(p.file)}</span></div><ol class="class-code">${p.lines.map((l,i)=>`<li class="${i===s.line?'on':''}${l.explain?' has-note':''}" ${l.explain?`data-class-line="${i}"`:''}><b>${l.n}</b><code>${esc(l.code)||' '}</code></li>`).join('')}</ol></div>`
   :`<div class="class-screen class-screen-idle"><div class="class-screen-bar"><i></i><i></i><i></i><span>${s.kind==='end'?'Finished':'Welcome'}</span></div><div class="class-screen-title">${s.kind==='end'?'✓':esc(tour.framework.name)}</div></div>`;
  const total=steps.filter(x=>x.kind==='line').length,done=steps.slice(0,at+1).filter(x=>x.kind==='line').length;
  let teach;
  if(s.kind==='intro')teach=`<p class="class-kicker">Today’s lesson</p><h2>How this app works</h2><p class="class-built">Built with <strong>${esc(tour.framework.name)}</strong></p>${tour.framework.plain?`<p>${esc(tour.framework.plain)}</p>`:''}${tour.summary?`<p>${esc(tour.summary)}</p>`:''}<p class="class-plan">${tour.pieces.length} short lessons · ${total} lines</p>`;
  else if(s.kind==='end')teach=`<p class="class-kicker">Well done</p><h2>You finished the lesson</h2><p>You went through ${total} lines across ${tour.pieces.length} parts of your app. Pick any lesson above to look again.</p>`;
  else teach=`<p class="class-kicker">${p.chapter?`${esc(p.chapter)} · `:''}Lesson ${s.lesson+1} of ${tour.pieces.length}</p><h2>${esc(p.title)}</h2>${p.purpose?`<p class="class-purpose">${esc(p.purpose)}</p>`:''}<div class="class-line"><span>Line ${line.n}</span><code>${esc(line.code.trim())||' '}</code></div><p class="class-explain">${esc(line.explain)}</p>`;
  root.innerHTML=`${tabs}<div class="class-stage">${screen}<section class="class-teacher" aria-live="polite">${teach}<div class="class-controls"><button class="button light" data-class-step="-1" ${at===0?'disabled':''}>← Back</button><span>${done}/${total}</span><button class="button orange" data-class-step="1" ${at===steps.length-1?'disabled':''}>${s.kind==='intro'?'Start':'Next'} →</button></div></section></div>`;
  root.querySelector('.class-code li.on')?.scrollIntoView({block:'nearest'});
 }

 const go=i=>{at=Math.max(0,Math.min(steps.length-1,i));render();};
 root.onclick=e=>{
  const step=e.target.closest('[data-class-step]'),tab=e.target.closest('[data-class-go]'),ln=e.target.closest('[data-class-line]');
  if(step)go(at+Number(step.dataset.classStep));
  else if(tab)go(Number(tab.dataset.classGo));
  else if(ln){const s=steps[at];go(steps.findIndex(x=>x.kind==='line'&&x.lesson===s.lesson&&x.line===Number(ln.dataset.classLine)));}
 };
 root.tabIndex=-1;
 root.onkeydown=e=>{if(e.target.closest('select,input,textarea'))return;if(e.key==='ArrowRight'){e.preventDefault();go(at+1);}if(e.key==='ArrowLeft'){e.preventDefault();go(at-1);}};
 render();
}
