import {deckLooks,deckPalettes,deckFonts,deckDesign,slideLayouts,shortCopy,contrastRatio} from '../shared/pitch-design.js';
import {slideCanvas} from './pitch-visual.js';

export function layoutChoices(id,d){
 const selected=d.presentation?.layout||'primary';
 return `<div class="pitch-layout-picker" role="group" aria-label="Layout for this slide">${slideLayouts[id].map((name,i)=>`<button type="button" data-pitch-layout="${i?'alternate':'primary'}" aria-pressed="${selected===(i?'alternate':'primary')}"><span aria-hidden="true">${i?'▤':'▥'}</span>${name}</button>`).join('')}</div>`;
}

export function chartEditor(def,d,esc){
 if(!['traction','ask'].includes(def.id))return '';
 const rows=d.presentation?.data||[];
 return `<div class="pitch-chart-editor"><h4>${def.id==='traction'?'Your measured progress':'Your resource allocation'}</h4><p>${def.id==='traction'?'Add dated values for one metric. Use the same unit throughout.':'Add your own resource amounts. Use one unit throughout, such as RM or hours.'} A chart appears when there is a complete row with a positive value. Empty rows stay as drafts.</p><label class="pitch-field">Unit<input data-pitch-chart-unit maxlength="24" placeholder="e.g. active users, RM, hours" value="${esc(d.presentation?.unit||'')}"></label><div class="pitch-chart-rows">${rows.map((r,i)=>`<div class="pitch-chart-row"><label>${def.id==='traction'?'Date / period':'Category'}<input data-pitch-chart-label="${i}" maxlength="40" value="${esc(r.label)}" placeholder="${def.id==='traction'?'Your measurement period':'What the support funds'}"></label><label>Value<input data-pitch-chart-value="${i}" type="number" min="0" max="1000000000000" step="any" value="${r.value??''}" placeholder="0"></label><button type="button" data-pitch-chart-remove="${i}" aria-label="Remove chart row ${i+1}">×</button></div>`).join('')}</div><button class="text-link" type="button" data-pitch="chart-add" ${rows.length>=6?'disabled':''}>+ Add a data row</button><small>Record the source and date under Evidence. Values you enter are not independently verified.</small></div>`;
}

export function slideDetails(def,d,esc){
 return `<details class="pitch-slide-details" id="pitch-slide-details"><summary><span>Edit what appears on this slide</span><span>Text ${['gtm','traction','ask'].includes(def.id)?'& visual details':''} ↗</span></summary><div class="pitch-slide-details-body"><p>Keep your full thinking in the coaching answers. Use these optional fields for the words your audience sees. Leave a field blank to follow your answer automatically.</p>${def.questions.map(q=>`<label class="pitch-field">${esc(q.label)}<textarea data-pitch-display="${q.id}" rows="3" maxlength="360" placeholder="${esc(shortCopy(d.answers?.[q.id]||'Your answer will appear here.'))}">${esc(d.presentation?.text?.[q.id]||'')}</textarea><small>Up to 360 characters. Your full answer stays in the outline and speaker notes.</small></label>`).join('')}${def.id==='gtm'?`<fieldset class="pitch-stage-editor"><legend>Name the steps in your acquisition path</legend>${(d.presentation?.stages||['Reach','Try','Adopt','Keep']).map((s,i)=>`<label>Step ${i+1}<input data-pitch-stage="${i}" maxlength="40" value="${esc(s)}"></label>`).join('')}</fieldset>`:''}<div id="pitch-chart-controls">${chartEditor(def,d,esc)}</div><button class="text-link" type="button" data-pitch="reset-copy">Use my coaching answers for slide text</button></div></details>`;
}

export function openDeckDesigner({project,track,id,esc,onChange}){
 const d=document.createElement('dialog');d.className='pack-dialog pitch-designer-dialog';
 const design=()=>project.pitch[track].design??={look:'clean-vc'};
 const theme=deckDesign(project,track);
 d.innerHTML=`<button class="close" aria-label="Close deck designer">×</button><div class="eyebrow">YOUR STORY. YOUR STYLE.</div><h2>Make it yours.</h2><p class="pitch-designer-intro">Start with a look, then find your colours. Applies to this ${track==='startup'?'startup':'hackathon'} deck.</p><div class="pitch-look-grid" role="group" aria-label="Deck look">${deckLooks.map(look=>{
  const sample={...project,pitch:{...project.pitch,[track]:{...project.pitch[track],design:{look:look.id}}}};
  return `<button type="button" class="pitch-look-card" data-deck-look="${look.id}" aria-pressed="${theme.id===look.id}"><span class="pitch-look-preview" aria-hidden="true">${slideCanvas(sample,track,id)}</span><span class="pitch-look-name">${look.name}<i aria-hidden="true">↗</i></span><span class="pitch-look-tag">${look.tag}</span><span class="pitch-look-description">${look.description}</span></button>`;
 }).join('')}</div><div class="pitch-designer-workbench"><div class="pitch-designer-preview"><div class="pitch-designer-preview-top"><span>YOUR CURRENT SLIDE</span><strong data-deck-active-name>${theme.name}</strong></div><div id="pitch-design-live-preview">${slideCanvas(project,track,id)}</div><p>Every look keeps your answers, notes and evidence. Your layout is chosen separately on each slide.</p></div><div class="pitch-designer-settings"><h3>Find your palette</h3><div class="pitch-palette-picker" role="group" aria-label="Colour palette">${deckPalettes.map((p,i)=>`<button type="button" data-deck-palette="${i}" aria-label="${p.name} palette" title="${p.name}">${Object.values(p.colors).map(c=>`<i style="background:${c}"></i>`).join('')}<span>${p.name}</span></button>`).join('')}</div><div class="pitch-color-fields">${[['background','Background'],['text','Text'],['accent','Accent'],['secondary','Secondary']].map(([key,name])=>`<label><span>${name}</span><span class="pitch-color-input"><input type="color" data-deck-color="${key}" value="${theme[key]}" aria-label="${name} colour"><input type="text" data-deck-hex="${key}" value="${theme[key]}" maxlength="7" pattern="#[0-9A-Fa-f]{6}" aria-label="${name} hex colour" spellcheck="false"></span></label>`).join('')}</div><p id="pitch-color-warning" role="status"></p><label class="pitch-font-picker">Headline style<select data-deck-font><option value="default">Match this look</option>${deckFonts.map(f=>`<option value="${f.id}" ${project.pitch[track].design?.font===f.id?'selected':''}>${f.name}</option>`).join('')}</select></label><button type="button" class="text-link" data-deck-reset>Reset colours to this look</button><small class="pitch-style-scope">Colours and headline style apply across this deck. Custom colours stay with you when you switch looks.</small></div></div><div class="pitch-designer-footer"><span>Saved as you go.</span><button type="button" class="button orange" data-deck-done>Back to my story ↗</button></div>`;
 document.body.append(d);
 function refresh(){
  const current=deckDesign(project,track);d.querySelector('#pitch-design-live-preview').innerHTML=slideCanvas(project,track,id);d.querySelector('[data-deck-active-name]').textContent=current.name;
  d.querySelectorAll('[data-deck-look]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.deckLook===current.id)));
  d.querySelectorAll('[data-deck-color],[data-deck-hex]').forEach(el=>{if(document.activeElement!==el)el.value=current[el.dataset.deckColor||el.dataset.deckHex];});
  const ratio=contrastRatio(current.background,current.text);d.querySelector('#pitch-color-warning').textContent=ratio<4.5?'Your text and background are close in colour. Try a darker text or lighter background for easier reading.':'';
  d.querySelectorAll('[data-deck-palette]').forEach(b=>b.setAttribute('aria-pressed',String(Object.entries(deckPalettes[Number(b.dataset.deckPalette)].colors).every(([k,v])=>current[k].toUpperCase()===v.toUpperCase()))));
 }
 d.addEventListener('click',e=>{
  const el=e.target.closest('button');if(!el)return;
  if(el.matches('.close,[data-deck-done]'))return d.close();
  if(el.dataset.deckLook){design().look=el.dataset.deckLook;onChange();refresh();}
  if(el.dataset.deckPalette!==undefined){design().colors={...deckPalettes[Number(el.dataset.deckPalette)].colors};onChange();refresh();}
  if(el.hasAttribute('data-deck-reset')){delete design().colors;onChange();refresh();}
 });
 d.addEventListener('input',e=>{
  const key=e.target.dataset.deckColor||e.target.dataset.deckHex;if(!key)return;
  if(!/^#[0-9a-f]{6}$/i.test(e.target.value)){e.target.setAttribute('aria-invalid','true');return;}
  e.target.removeAttribute('aria-invalid');design().colors??={};design().colors[key]=e.target.value.toUpperCase();onChange();refresh();
 });
 d.addEventListener('change',e=>{if(e.target.hasAttribute('data-deck-font')){if(e.target.value==='default')delete design().font;else design().font=e.target.value;onChange();refresh();}});
 d.onclose=()=>d.remove();refresh();d.showModal();
}
