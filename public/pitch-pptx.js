import {pitchSlides,slideDraft} from '../shared/pitch-data.js';
import {slideScene} from '../shared/pitch-design.js';
import {slideNotes} from './pitch-visual.js';

let loading;
async function loadPowerPoint(){
 if(globalThis.pptxgen)return globalThis.pptxgen;
 if(!loading)loading=new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src='/vendor/pptxgenjs.bundle.js';script.async=true;
  script.onload=()=>{if(globalThis.pptxgen)resolve(globalThis.pptxgen);else{loading=null;script.remove();reject(Error('PowerPoint export could not start. Please reload and try again.'));}};
  script.onerror=()=>{loading=null;script.remove();reject(Error('PowerPoint export could not load. Check your connection and try again.'));};
  document.head.append(script);
 });
 return loading;
}

export function buildPowerPoint(project,track,PptxGenJS){
 const pptx=new PptxGenJS();pptx.layout='LAYOUT_WIDE';
 pptx.author=project.pitch?.[track]?.slides?.title?.answers?.presenter||'';
 pptx.subject=`${track==='hackathon'?'Hackathon':'Startup'} pitch`;
 pptx.title=project.answers?.[0]||'Untitled project';pptx.company='';pptx.lang='en-MY';
 pptx.theme={headFontFace:'Arial',bodyFontFace:'Arial',lang:'en-MY'};
 const inch=value=>value/96,color=value=>value.replace('#','').toUpperCase();
 pitchSlides.forEach((def,i)=>{
  const draft=slideDraft(project,track,def.id),scene=slideScene(project,track,def,draft,i+1),slide=pptx.addSlide();
  slide.background={color:color(scene.theme.background)};
  for(const n of scene.nodes){
   const box={x:inch(n.x),y:inch(n.y),w:inch(n.w),h:inch(n.h)};
   if(n.kind==='shape')slide.addShape(pptx.ShapeType[n.type],{...box,fill:{color:color(n.fill)},line:{color:color(n.stroke),width:.5}});
   else slide.addText(n.text,{...box,fontFace:n.font,fontSize:n.size*.75,color:color(n.color),bold:!!n.bold,align:n.align||'left',valign:'top',margin:0,breakLine:false,fit:'shrink',paraSpaceAfter:0,charSpacing:n.letterSpacing?n.letterSpacing*.75:0});
  }
  slide.addNotes(slideNotes(def,draft));
 });
 return pptx;
}

export async function downloadPowerPoint(project,track){
 const PptxGenJS=await loadPowerPoint();
 const pptx=buildPowerPoint(project,track,PptxGenJS);
 // Blob download stays in the browser, including anonymous/manual-mode projects.
 const blob=await pptx.write({outputType:'blob',compression:true});
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`apexelerate-${track}-pitch.pptx`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
}
