// Showcase: a public gallery of projects users built (#showcase), a page per project
// (#showcase/<id>) and the submit form (#showcase/submit). Posts go live after an admin approves.
import {STAGES,EVENTS,LIMITS,validateShowcase,renderDescription} from '../shared/showcase.js';

const stageLabel=id=>STAGES.find(([s])=>s===id)?.[1]||'';
const MAX_W=1920,MAX_H=1080,TARGET=1400000;

// Shrinks a screenshot in the browser to fit 1920×1080 and re-encodes it, so uploads stay small.
async function shrink(file){
 if(!/^image\/(png|jpe?g|webp)$/.test(file.type))throw new Error(`${file.name}: use a PNG, JPG or WebP image.`);
 const bitmap=await createImageBitmap(file);
 const scale=Math.min(1,MAX_W/bitmap.width,MAX_H/bitmap.height);
 const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
 canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);
 for(const q of [0.86,0.72,0.6]){
  const blob=await new Promise(r=>canvas.toBlob(r,'image/webp',q))||await new Promise(r=>canvas.toBlob(r,'image/jpeg',q));
  if(blob&&blob.size<=TARGET)return await new Promise((ok,no)=>{const fr=new FileReader();fr.onload=()=>ok(fr.result);fr.onerror=no;fr.readAsDataURL(blob);});
 }
 throw new Error(`${file.name} is too large. Try a smaller screenshot.`);
}

export function createShowcase({app,header,esc,toast,cloud}){
 const api=(...a)=>cloud.request(...a);
 const blank=()=>({title:'',summary:'',description:'',stack:[],stage:'',liveUrl:'',sourceUrl:'',videoUrl:'',author:'',event:'',images:[]});
 let draft=blank(),filter={stage:'',q:''},seq=0;

 const shell=(body,cls='')=>{app.innerHTML=`${header(true)}<main class="showcase-page wrap ${cls}">${body}</main>`;cloud.nav();};
 const chips=list=>list?.length?`<ul class="sc-stack">${list.map(t=>`<li>${esc(t)}</li>`).join('')}</ul>`:'';
 const cardHtml=p=>`<a class="sc-card" href="#showcase/${esc(p.id)}"><span class="sc-cover">${p.images[0]?`<img src="${esc(p.images[0])}" alt="" loading="lazy">`:''}</span><span class="sc-card-body">${p.stage?`<span class="sc-stage">${esc(stageLabel(p.stage))}</span>`:''}<strong>${esc(p.title)}</strong><span class="sc-summary">${esc(p.summary)}</span>${chips(p.stack)}${p.author?`<small>by ${esc(p.author)}</small>`:''}</span></a>`;

 // ---- Gallery -------------------------------------------------------------
 async function gallery(){
  const mine=++seq;
  shell(`<div class="sc-hero"><div><div class="eyebrow">SHOWCASE</div><h1>Built with Apexelerate.</h1><p>Projects from our community: hackathon builds, side projects and launched products. Try them, read the code, get ideas.</p></div><a class="button orange" href="#showcase/submit">Submit your build →</a></div>
   <div id="sc-review"></div>
   <div class="sc-filters"><div class="sc-stage-filter" role="group" aria-label="Filter projects">${[['','All'],...STAGES.slice(1),...EVENTS.map(e=>[`event:${e}`,e])].map(([id,l])=>`<button type="button" data-sc-stage="${id}" aria-pressed="${filter.stage===id}" class="${filter.stage===id?'on':''}">${esc(l)}</button>`).join('')}</div><label><span class="sr-only">Search projects</span><input id="sc-search" type="search" placeholder="Search projects or tech" value="${esc(filter.q)}"></label></div>
   <div id="sc-grid" class="sc-grid"><p class="sc-muted">Loading projects…</p></div>`);
  try{
   const list=await api('/api/showcase');if(mine!==seq)return;
   const draw=()=>{const q=filter.q.toLowerCase();const ev=filter.stage.startsWith('event:')?filter.stage.slice(6).toLowerCase():null;const shown=list.filter(p=>(!filter.stage||(ev?String(p.event||'').trim().toLowerCase()===ev:p.stage===filter.stage))&&(!q||`${p.title} ${p.summary} ${(p.stack||[]).join(' ')} ${p.author}`.toLowerCase().includes(q)));
    app.querySelector('#sc-grid').innerHTML=shown.length?shown.map(cardHtml).join(''):`<div class="sc-empty"><p>${list.length?'No projects match.':'No projects yet. Be the first to show what you built.'}</p><a class="button orange" href="#showcase/submit">Submit your build →</a></div>`;};
   draw();
   app.querySelector('.sc-filters').onclick=e=>{const b=e.target.closest('[data-sc-stage]');if(!b)return;filter.stage=b.dataset.scStage;app.querySelectorAll('[data-sc-stage]').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',String(x===b));});draw();};
   app.querySelector('#sc-search').oninput=e=>{filter.q=e.target.value;draw();};
  }catch(e){if(mine===seq)app.querySelector('#sc-grid').innerHTML=`<p class="sc-muted">${esc(e.message)}</p>`;}
  if(cloud.isAdmin())reviewQueue(mine);
 }

 async function reviewQueue(mine){
  const box=app.querySelector('#sc-review');
  try{
   const q=await api('/api/showcase/review');if(mine!==seq||!box)return;
   box.innerHTML=q.length?`<section class="sc-queue"><h2>Waiting for review (${q.length})</h2>${q.map(p=>`<div class="sc-queue-item"><a href="#showcase/${esc(p.id)}">${p.images[0]?`<img src="${esc(p.images[0])}" alt="">`:''}<span><strong>${esc(p.title)}</strong><small>${esc(p.ownerEmail)} · ${esc(p.summary)}</small></span></a><span class="sc-queue-actions"><button class="button orange" data-sc-review="approved" data-id="${esc(p.id)}">Approve</button><button class="button light" data-sc-review="rejected" data-id="${esc(p.id)}">Reject</button></span></div>`).join('')}</section>`:'';
  }catch{}
 }

 // ---- One project -----------------------------------------------------------
 async function detail(id){
  const mine=++seq;shell('<p class="sc-muted">Loading project…</p>');
  let p;try{p=await api(`/api/showcase/${encodeURIComponent(id)}`);}catch(e){if(mine===seq)shell(`<a class="back-link" href="#showcase">← Showcase</a><p>${esc(e.message)}</p>`);return;}
  if(mine!==seq)return;
  const links=[[p.liveUrl,'Try it live'],[p.sourceUrl,'Source code'],[p.videoUrl,'Watch the demo']].filter(([u])=>u);
  const status=p.status==='approved'?'':`<p class="sc-status sc-status-${esc(p.status)}">${p.status==='pending'?'Waiting for review: only you and admins can see this for now.':`Not approved${p.review?.note?`: ${esc(p.review.note)}`:'.'}`}</p>`;
  const admin=cloud.isAdmin()&&p.status!=='approved'?`<button class="button orange" data-sc-review="approved" data-id="${esc(p.id)}">Approve</button>`:'';
  const reject=cloud.isAdmin()&&p.status!=='rejected'?`<button class="button light" data-sc-review="rejected" data-id="${esc(p.id)}">${p.status==='approved'?'Take down':'Reject'}</button>`:'';
  shell(`<a class="back-link" href="#showcase">← Showcase</a>${status}
   <div class="sc-detail">
    <div class="sc-shots"><img class="sc-main-shot" src="${esc(p.images[0]||'')}" alt="Screenshot of ${esc(p.title)}">${p.images.length>1?`<div class="sc-thumbs">${p.images.map((u,i)=>`<button type="button" data-sc-shot="${esc(u)}" class="${i===0?'on':''}" aria-label="Screenshot ${i+1}"><img src="${esc(u)}" alt=""></button>`).join('')}</div>`:''}</div>
    <div class="sc-info">
     ${p.stage?`<span class="sc-stage">${esc(stageLabel(p.stage))}</span>`:''}<h1>${esc(p.title)}</h1><p class="sc-lead">${esc(p.summary)}</p>
     ${p.author||p.event?`<p class="sc-muted">${p.author?`by <strong>${esc(p.author)}</strong>`:''}${p.author&&p.event?' · ':''}${p.event?esc(p.event):''}</p>`:''}
     ${links.length?`<div class="sc-links">${links.map(([u,l],i)=>`<a class="button ${i===0?'orange':'light'}" href="${esc(u)}" target="_blank" rel="noopener noreferrer nofollow">${l} ↗</a>`).join('')}</div>`:''}
     ${chips(p.stack)}
     ${p.description?`<div class="sc-description">${renderDescription(p.description,esc)}</div>`:''}
     ${admin||reject||p.mine?`<div class="sc-owner">${admin}${reject}${p.mine?`<button class="text-link" data-sc-delete="${esc(p.id)}">Delete this project</button>`:''}</div>`:''}
    </div>
   </div>`,'sc-wide');
 }

 // ---- Submit ----------------------------------------------------------------
 function field(id,label,{type='text',max,ph='',hint=''}={}){return `<label class="sc-field" for="sc-${id}"><span>${label}</span><input id="sc-${id}" data-sc-field="${id}" type="${type}" maxlength="${max||LIMITS.url}" placeholder="${esc(ph)}" value="${esc(draft[id])}">${hint?`<small>${hint}</small>`:''}</label>`;}
 function shotsHtml(){return draft.images.map((im,i)=>`<li class="sc-shot"><img src="${esc(im.url)}" alt="Screenshot ${i+1}">${i===0?'<span class="sc-cover-tag">Cover</span>':''}<span class="sc-shot-tools">${i>0?`<button type="button" data-sc-move="${i}" aria-label="Move earlier">←</button>`:''}<button type="button" data-sc-remove="${i}" aria-label="Remove screenshot">✕</button></span></li>`).join('');}
 function tagsHtml(){return draft.stack.map((t,i)=>`<span class="sc-tag">${esc(t)}<button type="button" data-sc-untag="${i}" aria-label="Remove ${esc(t)}">✕</button></span>`).join('');}

 async function submitPage(){
  if(!cloud.requireAccount())return;
  const mine=++seq;
  shell(`<a class="back-link" href="#showcase">← Showcase</a><div class="eyebrow">SUBMIT A PROJECT</div><h1>Show what you built.</h1><p class="sc-muted">Posts appear in the showcase after a quick review.</p>
  <form id="sc-form" class="sc-form" novalidate>
   <section><h2><span>1</span>About your project</h2><p class="sc-muted">The title and one-line summary show on the project card.</p>
    ${field('title','Project title',{max:LIMITS.title,ph:'e.g. StudyPal'})}
    ${field('summary','One-line summary',{max:LIMITS.summary,ph:'What it does, for whom, in one line'})}
    <label class="sc-field" for="sc-description"><span>Description <em>optional</em></span>
     <div class="sc-toolbar" role="toolbar" aria-label="Formatting"><button type="button" data-sc-format="bold" title="Bold (Ctrl+B)"><strong>B</strong></button><button type="button" data-sc-format="bullet" title="Bulleted list">• List</button><button type="button" data-sc-format="number" title="Numbered list">1. List</button></div>
     <textarea id="sc-description" data-sc-field="description" rows="7" maxlength="${LIMITS.description}" placeholder="What problem does it solve? How does it work? What did you learn?">${esc(draft.description)}</textarea>
     <small><span id="sc-desc-count">${draft.description.length}</span> / ${LIMITS.description} · **bold**, “- ” for bullets, “1. ” for numbers</small></label>
   </section>
   <section><h2><span>2</span>Screenshots</h2><p class="sc-muted">The first one is the cover. At least one is needed; a photo of your screen is fine. Up to ${LIMITS.images}.</p>
    <ul class="sc-shots-edit" id="sc-shots">${shotsHtml()}</ul>
    <label class="sc-drop" id="sc-drop"><input id="sc-files" type="file" accept="image/png,image/jpeg,image/webp" multiple><strong>Add screenshots</strong><span>Drop images here or click to choose. PNG, JPG or WebP; large images are shrunk to 1920×1080.</span></label>
    <p class="sc-upload-status" role="status"></p>
   </section>
   <section><h2><span>3</span>Links</h2><p class="sc-muted">Where people can try it, read the code, or watch a demo. At least one.</p>
    ${field('liveUrl','Live site',{type:'url',ph:'https://…'})}
    ${field('sourceUrl','Source code',{type:'url',ph:'https://github.com/…'})}
    ${field('videoUrl','Demo video',{type:'url',ph:'https://youtu.be/…',hint:'A YouTube or Vimeo link.'})}
   </section>
   <section><h2><span>4</span>Tech stack <em>optional</em></h2><p class="sc-muted">Languages, frameworks and tools, up to ${LIMITS.tags}. Press Enter or comma to add.</p>
    <div class="sc-tags" id="sc-tags">${tagsHtml()}<input id="sc-tag-input" aria-label="Add a tech tag" placeholder="e.g. React" maxlength="${LIMITS.tag}"></div>
   </section>
   <section><h2><span>5</span>Details <em>optional</em></h2>
    <label class="sc-field" for="sc-stage"><span>Stage</span><select id="sc-stage" data-sc-field="stage">${STAGES.map(([id,l])=>`<option value="${id}"${draft.stage===id?' selected':''}>${esc(l)}</option>`).join('')}</select></label>
    ${field('author','Your name or team',{max:LIMITS.author,ph:'Shown on the project page'})}
    ${field('event','Hackathon or event',{max:LIMITS.event,ph:`e.g. ${EVENTS[0]}`,hint:`Built for ${EVENTS.join(' or ')}? Pick it so your project shows under that filter.`}).replace('<input ','<input list="sc-events" ')}<datalist id="sc-events">${EVENTS.map(e=>`<option value="${esc(e)}">`).join('')}</datalist>
   </section>
   <p class="form-feedback error" role="alert"></p>
   <div class="sc-submit-row"><button class="button orange" type="submit" id="sc-submit">Submit project</button><span class="sc-muted" id="sc-submit-hint"></span></div>
  </form>
  <section class="sc-mine"><h2>Your submissions</h2><div id="sc-mine"><p class="sc-muted">Loading…</p></div></section>`);
  updateSubmitState();
  try{
   const list=await api('/api/showcase/mine');if(mine!==seq)return;
   app.querySelector('#sc-mine').innerHTML=list.length?list.map(p=>`<a class="sc-mine-item" href="#showcase/${esc(p.id)}">${p.images[0]?`<img src="${esc(p.images[0])}" alt="">`:''}<span><strong>${esc(p.title)}</strong><small>${esc(p.summary)}</small></span><span class="sc-badge sc-badge-${esc(p.status)}">${p.status==='pending'?'In review':p.status==='approved'?'Live':'Not approved'}</span></a>`).join(''):'<p class="sc-muted">Nothing yet.</p>';
  }catch{}
 }

 function updateSubmitState(){
  const btn=app.querySelector('#sc-submit'),hint=app.querySelector('#sc-submit-hint');if(!btn)return;
  const uploading=draft.images.some(i=>!i.id);
  btn.disabled=!draft.images.length||uploading;
  hint.textContent=uploading?'Uploading screenshots…':draft.images.length?'':'Add at least one screenshot to submit.';
 }
 const redrawShots=()=>{const ul=app.querySelector('#sc-shots');if(ul)ul.innerHTML=shotsHtml();updateSubmitState();};
 const redrawTags=()=>{const box=app.querySelector('#sc-tags');if(!box)return;const input=box.querySelector('#sc-tag-input');box.querySelectorAll('.sc-tag').forEach(t=>t.remove());input.insertAdjacentHTML('beforebegin',tagsHtml());input.disabled=draft.stack.length>=LIMITS.tags;};

 async function addFiles(files){
  const status=app.querySelector('.sc-upload-status');
  const room=LIMITS.images-draft.images.length;
  const list=[...files].slice(0,Math.max(0,room));
  if(files.length>room)toast(`You can add up to ${LIMITS.images} screenshots.`);
  for(const file of list){
   const item={url:'',id:''};
   try{
    item.url=await shrink(file);draft.images.push(item);redrawShots();
    const r=await api('/api/showcase/images','POST',{data:item.url});item.id=r.id;
    if(status)status.textContent='';
   }catch(e){draft.images=draft.images.filter(x=>x!==item);if(status)status.textContent=e.message;}
   redrawShots();
  }
 }

 function addTag(raw){
  for(const t of String(raw).split(',').map(x=>x.trim()).filter(Boolean)){
   if(draft.stack.length>=LIMITS.tags)break;
   if(!draft.stack.some(x=>x.toLowerCase()===t.toLowerCase()))draft.stack.push(t.slice(0,LIMITS.tag));
  }
  redrawTags();
 }

 function format(kind){
  const ta=app.querySelector('#sc-description');if(!ta)return;
  const [a,b]=[ta.selectionStart,ta.selectionEnd],v=ta.value,sel=v.slice(a,b);
  let out,cursor;
  if(kind==='bold'){out=`**${sel||'bold text'}**`;cursor=a+out.length;}
  else{const lines=(sel||'item').split('\n');out=lines.map((l,i)=>(kind==='bullet'?'- ':`${i+1}. `)+l.replace(/^([-*]|\d+[.)])\s+/,'')).join('\n');if(a>0&&v[a-1]!=='\n')out='\n'+out;cursor=a+out.length;}
  ta.value=v.slice(0,a)+out+v.slice(b);ta.focus();ta.setSelectionRange(cursor,cursor);
  draft.description=ta.value;app.querySelector('#sc-desc-count').textContent=ta.value.length;
 }

 async function send(form){
  const fb=form.querySelector('.form-feedback'),btn=form.querySelector('#sc-submit');fb.textContent='';
  const body={...draft,images:draft.images.map(i=>i.id)};
  try{validateShowcase(body);}catch(e){fb.textContent=e.message;return;}
  if(!body.images.length){fb.textContent='Add at least one screenshot.';return;}
  btn.disabled=true;btn.textContent='Submitting…';
  try{const p=await api('/api/showcase','POST',body);draft=blank();toast(p.status==='approved'?'Your project is live.':'Submitted! It goes live after a quick review.');location.hash=`showcase/${p.id}`;}
  catch(e){fb.textContent=e.message;btn.textContent='Submit project';updateSubmitState();}
 }

 // ---- Events (delegated; pages are re-rendered) ------------------------------
 app.addEventListener('input',e=>{
  const f=e.target.dataset?.scField;if(!f||!app.querySelector('.showcase-page'))return;
  draft[f]=e.target.value;if(f==='description')app.querySelector('#sc-desc-count').textContent=e.target.value.length;
 });
 app.addEventListener('change',e=>{
  if(e.target.id==='sc-files'){addFiles(e.target.files);e.target.value='';}
  else if(e.target.dataset?.scField==='stage')draft.stage=e.target.value;
 });
 app.addEventListener('keydown',e=>{
  if(e.target.id==='sc-tag-input'){if(e.key==='Enter'||e.key===','){e.preventDefault();addTag(e.target.value);e.target.value='';}else if(e.key==='Backspace'&&!e.target.value&&draft.stack.length){draft.stack.pop();redrawTags();}}
  else if(e.target.id==='sc-description'&&(e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='b'){e.preventDefault();format('bold');}
 });
 app.addEventListener('focusout',e=>{if(e.target.id==='sc-tag-input'&&e.target.value.trim()){addTag(e.target.value);e.target.value='';}});
 app.addEventListener('dragover',e=>{if(e.target.closest?.('#sc-drop')){e.preventDefault();e.target.closest('#sc-drop').classList.add('over');}});
 app.addEventListener('dragleave',e=>{e.target.closest?.('#sc-drop')?.classList.remove('over');});
 app.addEventListener('drop',e=>{const d=e.target.closest?.('#sc-drop');if(!d)return;e.preventDefault();d.classList.remove('over');addFiles(e.dataTransfer.files);});
 app.addEventListener('submit',e=>{if(e.target.id==='sc-form'){e.preventDefault();send(e.target);}});
 app.addEventListener('click',async e=>{
  if(!app.querySelector('.showcase-page'))return;
  const t=e.target.closest('[data-sc-format],[data-sc-remove],[data-sc-move],[data-sc-untag],[data-sc-shot],[data-sc-review],[data-sc-delete]');if(!t)return;
  if(t.dataset.scFormat)format(t.dataset.scFormat);
  else if(t.dataset.scRemove){draft.images.splice(Number(t.dataset.scRemove),1);redrawShots();}
  else if(t.dataset.scMove){const i=Number(t.dataset.scMove);[draft.images[i-1],draft.images[i]]=[draft.images[i],draft.images[i-1]];redrawShots();}
  else if(t.dataset.scUntag){draft.stack.splice(Number(t.dataset.scUntag),1);redrawTags();}
  else if(t.dataset.scShot){app.querySelector('.sc-main-shot').src=t.dataset.scShot;app.querySelectorAll('[data-sc-shot]').forEach(b=>b.classList.toggle('on',b===t));}
  else if(t.dataset.scReview){
   const status=t.dataset.scReview,note=status==='rejected'?(prompt('Reason to show the maker (optional):')??null):'';if(note===null)return;
   t.disabled=true;try{await api(`/api/showcase/${t.dataset.id}/review`,'POST',{status,note});toast(status==='approved'?'Approved: it’s live in the showcase.':'Marked as not approved.');route();}catch(err){toast(err.message);t.disabled=false;}
  }
  else if(t.dataset.scDelete){if(!confirm('Delete this project from the showcase? This can’t be undone.'))return;try{await api(`/api/showcase/${t.dataset.scDelete}`,'DELETE');toast('Project deleted.');location.hash='showcase';}catch(err){toast(err.message);}}
 });

 function route(){
  const h=location.hash.slice(1);
  if(h==='showcase'){gallery();return true;}
  if(h==='showcase/submit'){submitPage();return true;}
  const m=h.match(/^showcase\/([0-9a-f-]{36})$/);if(m){detail(m[1]);return true;}
  return false;
 }
 return {route};
}
