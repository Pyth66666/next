import {pitchSlides,slideDraft} from '../shared/pitch-data.js';
import {slideScene,evidenceLabel} from '../shared/pitch-design.js';

const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pct=(n,total)=>`${n/total*100}%`;

export function slideCanvas(project,track,id){
 const def=pitchSlides.find(x=>x.id===id);if(!def)return '';
 const scene=slideScene(project,track,def,slideDraft(project,track,id),pitchSlides.indexOf(def)+1);
 const styles=n=>`left:${pct(n.x,1280)};top:${pct(n.y,720)};width:${pct(n.w,1280)};height:${pct(n.h,720)}`;
 return `<article class="deck-canvas deck-${id} deck-look-${scene.theme.id} deck-layout-${scene.layout}" style="background:${scene.theme.background};color:${scene.theme.text}" aria-label="${escape(def.title)} slide preview">${scene.nodes.map(n=>n.kind==='shape'?`<span aria-hidden="true" class="deck-shape ${n.type==='ellipse'?'deck-circle':''}" style="${styles(n)};background:${n.fill};border:1px solid ${n.stroke};${n.type==='ellipse'?'border-radius:50%;':''}"></span>`:`<span class="deck-text" style="${styles(n)};font-size:${n.size/12.8}cqw;color:${n.color};font-family:${n.font};font-weight:${n.bold?700:400};text-align:${n.align||'left'};${n.letterSpacing?`letter-spacing:${n.letterSpacing/12.8}cqw;`:''}">${escape(n.text)}</span>`).join('')}</article>`;
}

export function slideNotes(def,d){
 return [d.notes||'',`${def.title}: ${d.headline||'[Unfinished]'}`,evidenceLabel(d),d.evidence?`Source / date / validation plan: ${d.evidence}`:'',...def.questions.map(q=>`${q.label}\n${d.answers?.[q.id]||'[Not answered]'}`),d.visual?`Visual plan: ${d.visual}`:'',d.presentation?.data?.length?`Chart data (user supplied): ${d.presentation.data.map(r=>`${r.label}: ${r.value} ${d.presentation.unit||''}`).join('; ')}`:''].filter(Boolean).join('\n\n');
}

export function deckHtml(project,track,styles){
 const title=escape(project.answers?.[0]||'Untitled project');
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · ${escape(track)} pitch</title><style>${styles}</style><style>body{margin:0;background:#e8e9e1;font-family:Arial,sans-serif}.export-bar{padding:12px 20px;background:#18241d;color:white;font:14px Arial;position:sticky;top:0;z-index:2}.export-bar button{margin-left:12px;padding:8px 12px;cursor:pointer}.export-deck{max-width:1200px;margin:30px auto;display:grid;gap:30px}.export-notes{background:white;padding:16px;border-radius:0 0 8px 8px}.export-notes pre{white-space:pre-wrap;font:15px/1.6 Arial}.export-deck .deck-canvas{aspect-ratio:16/9;min-height:0;box-sizing:border-box}@page{size:13.333in 7.5in;margin:0}@media print{body{background:white}.export-bar,.export-notes{display:none}.export-deck{display:block;margin:0;max-width:none}.export-deck .deck-canvas{width:13.333in;height:7.5in;aspect-ratio:auto;border-radius:0;break-after:page;page-break-after:always;box-shadow:none;print-color-adjust:exact;-webkit-print-color-adjust:exact}.export-slide:last-child .deck-canvas{break-after:auto;page-break-after:auto}}</style></head><body><div class="export-bar">${title} · ${escape(track)} pitch <button onclick="window.print()">Print / Save PDF</button></div><main class="export-deck">${pitchSlides.map(s=>`<section class="export-slide">${slideCanvas(project,track,s.id)}<details class="export-notes"><summary>Speaker notes &amp; full answers</summary><pre>${escape(slideNotes(s,slideDraft(project,track,s.id)))}</pre></details></section>`).join('')}</main></body></html>`;
}
