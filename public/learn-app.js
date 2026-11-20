// "Learn my app" page (#code/<id>). Opens straight onto an overview of the app: what it is
// built with and how it is put together. Any part or file opens the real code at once, with
// what it contains (from the code itself) and a plain-language explanation that loads by itself.
// The older step-by-step lesson stays available as the "Guided lesson" tab.

const ICON={frontend:'▣',backend:'⚙',data:'▤',shared:'⇄',setup:'⚑',tests:'✓',docs:'✎'};
const FACT_ICON={Route:'↔',Component:'▣',Function:'ƒ',Class:'◇',Table:'▤',Style:'✦','Page part':'▭'};

export function createLearnView({app,header,esc,api,nav}){
 let repo=null,opts=null,tab='overview',path=null,filter='',files=new Map(),pending=new Map(),highlight=null;

 const partLabel=id=>repo.map.parts.find(p=>p.id===id)?.label||'Other';
 const language=()=>opts.settings.language==='Bahasa Melayu'?'Bahasa Melayu':'English';

 function show(r,o){
  if(repo?.id!==r.id)reset();repo=r;opts=o;
  render();
 }
 // Opening an app (rather than re-drawing it after a lesson is made) starts on the overview.
 function reset(){tab='overview';path=null;filter='';files=new Map();pending=new Map();highlight=null;}

 function overview(){
  const m=repo.map;
  const stack=m.stack.length?`<div class="learn-stack">${m.stack.map(s=>`<div class="learn-stack-item"><span class="learn-role">${esc(s.role)}</span><strong>${esc(s.name)}</strong><p>${esc(s.plain)}</p><small>Found from ${esc(s.why)}</small></div>`).join('')}</div>`:'<p class="learn-muted">We couldn’t tell the framework from these files.</p>';
  const parts=`<div class="learn-parts">${m.parts.map(p=>`<button class="learn-part" data-learn-part="${p.id}"><span class="learn-part-icon" aria-hidden="true">${ICON[p.id]||'•'}</span><span class="learn-part-body"><strong>${esc(p.label)}</strong><span>${esc(p.plain)}</span><small>${p.files.length} file${p.files.length===1?'':'s'} · open →</small></span></button>`).join('')}</div>`;
  return `<section class="learn-overview">
   <div class="learn-hero"><div><h2>How this app is built</h2><p>Here is what your app is made of and how its parts fit together. Pick any part to see its real code with an explanation.</p></div>${m.start?`<button class="button orange" data-learn-open="${esc(m.start)}">Start with ${esc(m.start.split('/').pop())} →</button>`:''}</div>
   <h3>Built with</h3>${stack}
   <h3>How it’s put together</h3>${parts}
   <p class="learn-muted">How a request travels: the <strong>frontend</strong> shows the page and sends what people type to the <strong>backend</strong>, which checks it and reads or saves it in the <strong>data</strong> part, then sends the answer back to show on screen.</p>
  </section>`;
 }

 function sidebar(){
  const q=filter.toLowerCase();
  const groups=repo.map.parts.map(p=>{const list=p.files.filter(f=>f.toLowerCase().includes(q));return list.length?`<div class="learn-group"><p class="learn-group-title"><span aria-hidden="true">${ICON[p.id]||'•'}</span>${esc(p.label)}</p>${list.map(f=>`<button class="learn-file${f===path?' on':''}" data-learn-open="${esc(f)}" title="${esc(f)}">${esc(f.split('/').pop())}<small>${esc(f.includes('/')?f.slice(0,f.lastIndexOf('/')):'')}</small></button>`).join('')}</div>`:'';}).join('');
  return `<aside class="learn-side"><label class="learn-search"><span class="sr-only">Find a file</span><input id="learn-filter" type="search" placeholder="Find a file" value="${esc(filter)}"></label><div class="learn-tree">${groups||'<p class="learn-muted">No files match.</p>'}</div></aside>`;
 }

 function codeView(){
  if(!path)return `<div class="learn-empty"><p>Choose a file on the left to see its code.</p></div>`;
  const f=files.get(path);
  if(!f)return `<div class="learn-empty"><p>Opening ${esc(path)}…</p></div>`;
  if(f.error)return `<div class="learn-empty"><p>${esc(f.error)}</p></div>`;
  const lines=f.content.split('\n');
  return `<div class="learn-code"><div class="learn-code-bar"><span>${esc(f.path)}</span><span>${lines.length} lines</span></div><ol class="learn-lines">${lines.map((l,i)=>`<li id="L${i+1}" class="${highlight&&i+1>=highlight[0]&&i+1<=highlight[1]?'hl':''}"><b>${i+1}</b><code>${esc(l)||' '}</code></li>`).join('')}</ol></div>`;
 }

 function explainPanel(){
  if(!path)return '';
  const f=files.get(path);if(!f||f.error)return '<aside class="learn-explain"></aside>';
  const facts=f.facts.items.length?`<ul class="learn-facts">${f.facts.items.map(it=>`<li><button data-learn-line="${it.line}" data-learn-end="${it.line}"><span class="learn-fact-icon" title="${esc(it.kind)}" aria-hidden="true">${FACT_ICON[it.kind]||'•'}</span><span>${esc(it.name)}</span><small>${esc(it.kind)} · line ${it.line}</small></button></li>`).join('')}</ul>`:'<p class="learn-muted">No functions, routes or screens found in this file.</p>';
  let ai;
  if(f.explanation)ai=`${f.explanation.summary?`<p class="learn-summary">${esc(f.explanation.summary)}</p>`:''}<ol class="learn-sections">${f.explanation.sections.map(s=>`<li><button data-learn-line="${s.start}" data-learn-end="${s.end}"><strong>${esc(s.title)}</strong><small>Lines ${s.start}${s.end>s.start?'–'+s.end:''}</small><span>${esc(s.explain)}</span></button></li>`).join('')}</ol>`;
  else if(f.explainError)ai=`<p class="learn-note">${esc(f.explainError)}</p>${f.retry?'<button class="button light" data-learn-retry>Try again</button>':''}`;
  else if(!opts.aiConfigured)ai='<p class="learn-note">AI explanations aren’t switched on for this site. The code and the list above still work.</p>';
  else ai='<div class="learn-loading" role="status"><span></span><span></span><span></span><p>Writing a plain-English explanation…</p></div>';
  return `<aside class="learn-explain" aria-live="polite">
   <p class="learn-kicker">${esc(partLabel(f.part))} · ${esc(f.facts.kind)}</p>
   <h2>${esc(f.path.split('/').pop())}</h2>
   <h3>What it does</h3>${ai}
   <h3>What’s inside</h3>${facts}
  </aside>`;
 }

 function render(){
  const meta=`${repo.source==='upload'?'Uploaded':'GitHub · '+esc(repo.branch)} · ${repo.files.length} files`;
  const tabs=[['overview','Overview'],['code','Code'],['lesson','Guided lesson']];
  let body;
  if(tab==='overview')body=overview();
  else if(tab==='code')body=`<div class="learn-workspace">${sidebar()}<section class="learn-main">${codeView()}</section>${explainPanel()}</div>`;
  else body=`<div class="learn-lesson">${opts.lessonHtml()}</div>`;
  app.innerHTML=`${header(true)}<main class="learn wrap${tab==='code'?' learn-wide':''}">
   <a class="back-link" href="#repositories">← My apps</a>
   <header class="learn-head"><div><h1>${esc(repo.fullName)}</h1><p>${meta}</p></div><label class="learn-lang">Explain in <select id="learn-language">${['English','Bahasa Melayu'].map(o=>`<option${o===language()?' selected':''}>${o}</option>`).join('')}</select></label></header>
   <nav class="learn-tabs" role="tablist">${tabs.map(([id,label])=>`<button role="tab" aria-selected="${tab===id}" class="${tab===id?'on':''}" data-learn-tab="${id}">${label}</button>`).join('')}</nav>
   ${body}
  </main>`;
  nav();
  if(tab==='lesson')opts.startLesson(app.querySelector('#classroom'));
  if(tab==='code'&&highlight)app.querySelector(`#L${highlight[0]}`)?.scrollIntoView({block:'center'});
 }

 async function open(p,{line=null,end=null}={}){
  tab='code';path=p;highlight=line?[line,end||line]:null;render();
  const id=repo.id;
  if(!files.has(p)){
   try{const f=await api(`/api/repositories/${id}/file?path=${encodeURIComponent(p)}&language=${encodeURIComponent(language())}`);if(repo?.id!==id)return;files.set(p,f);}
   catch(e){files.set(p,{error:e.message});}
   if(path===p&&tab==='code')render();
  }
  explain(p);
 }

 async function explain(p){
  const f=files.get(p),id=repo.id,lang=language();
  if(!f||f.error||f.explanation||f.explainError||!opts.aiConfigured||pending.has(p+lang))return;
  pending.set(p+lang,true);
  try{f.explanation=await api(`/api/repositories/${id}/explain`,'POST',{path:p,language:lang});}
  catch(e){f.explainError=e.message;f.retry=!/approval/i.test(e.message);}
  finally{pending.delete(p+lang);}
  if(repo?.id===id&&path===p&&tab==='code')render();
 }

 app.addEventListener('click',e=>{
  if(!repo||!app.querySelector('.learn'))return;
  const t=e.target.closest('[data-learn-tab],[data-learn-part],[data-learn-open],[data-learn-line],[data-learn-retry]');if(!t)return;
  if(t.dataset.learnTab){tab=t.dataset.learnTab;if(tab==='code'&&!path&&repo.map.start){open(repo.map.start);return;}render();}
  else if(t.dataset.learnPart){const part=repo.map.parts.find(p=>p.id===t.dataset.learnPart);const first=part.files.find(f=>f===repo.map.start)||part.files[0];open(first);}
  else if(t.dataset.learnOpen)open(t.dataset.learnOpen);
  else if(t.dataset.learnLine){highlight=[Number(t.dataset.learnLine),Number(t.dataset.learnEnd)];app.querySelectorAll('.learn-lines li.hl').forEach(li=>li.classList.remove('hl'));for(let n=highlight[0];n<=highlight[1];n++)app.querySelector(`#L${n}`)?.classList.add('hl');app.querySelector(`#L${highlight[0]}`)?.scrollIntoView({block:'center',behavior:'smooth'});}
  else if(t.hasAttribute('data-learn-retry')){const f=files.get(path);if(f){delete f.explainError;render();explain(path);}}
 });
 app.addEventListener('input',e=>{
  if(e.target.id!=='learn-filter')return;filter=e.target.value;
  const side=app.querySelector('.learn-side');if(!side)return;
  const pos=e.target.selectionStart;side.outerHTML=sidebar();const input=app.querySelector('#learn-filter');input.focus();input.setSelectionRange(pos,pos);
 });
 app.addEventListener('change',e=>{
  if(e.target.id!=='learn-language')return;
  opts.settings.language=e.target.value;
  for(const f of files.values()){delete f.explanation;delete f.explainError;}
  if(path&&tab==='code'){files.delete(path);open(path,{line:highlight?.[0],end:highlight?.[1]});}else render();
 });

 return {show,reset};
}
