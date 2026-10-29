// One scene model drives the browser preview, HTML deck and editable PowerPoint.
// Coordinates use a 1280 x 720 canvas. User claims stay separate from presentation styling.
export const deckLooks = [
 {id:'clean-vc',name:'Clean VC',tag:'Clear. Confident. Considered.',description:'Quiet whitespace, crisp type and one confident accent.',font:'sans',colors:{background:'#FAF9F6',text:'#202B29',accent:'#E56640',secondary:'#C9D8C5'}},
 {id:'bold-demo',name:'Bold Demo',tag:'Made for the big screen.',description:'Deep ink, oversized headlines and electric highlights.',font:'sans',colors:{background:'#172425',text:'#F7F8EF',accent:'#D4F46A',secondary:'#91C7C2'}},
 {id:'editorial',name:'Editorial',tag:'A story worth staying for.',description:'Warm paper, expressive serif titles and magazine rhythm.',font:'serif',colors:{background:'#F4EDE2',text:'#382C29',accent:'#B74730',secondary:'#D4B47C'}},
 {id:'data-first',name:'Data-First',tag:'Let the evidence lead.',description:'Precise typography, disciplined structure and cool blue.',font:'mono',colors:{background:'#F3F6FC',text:'#192C49',accent:'#315ED2',secondary:'#8BADC4'}}
];
export const deckPalettes = [
 {name:'Terracotta',colors:deckLooks[0].colors},
 {name:'Electric',colors:deckLooks[1].colors},
 {name:'Paper',colors:deckLooks[2].colors},
 {name:'Cobalt',colors:deckLooks[3].colors},
 {name:'Forest',colors:{background:'#F0F3E9',text:'#203B30',accent:'#38765C',secondary:'#D9AC72'}}
];
export const deckFonts = [{id:'sans',name:'Modern',face:'Arial'},{id:'serif',name:'Editorial',face:'Georgia'},{id:'mono',name:'Technical',face:'Courier New'}];
export const slideLayouts = {
 title:['Split cover','Big statement'],problem:['Three perspectives','Customer story'],solution:['Three-step flow','Solution spotlight'],market:['Market circles','Market breakdown'],business:['Revenue flow','Model at a glance'],gtm:['Acquisition path','Launch roadmap'],traction:['Evidence board','Progress timeline'],competition:['Comparison brief','Alternatives spotlight'],team:['People & experience','Team columns'],ask:['Ask & allocation','Milestone statement']
};
const hex=/^#[0-9a-f]{6}$/i;
export function validateDeckDesign(raw){
 if(raw===undefined)return undefined;
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Invalid deck design.');
 const result={look:raw.look??'clean-vc'};
 if(!deckLooks.some(t=>t.id===result.look))throw Error('Choose a supported deck look.');
 if(raw.font!==undefined){if(!deckFonts.some(f=>f.id===raw.font))throw Error('Choose a supported deck font.');result.font=raw.font;}
 if(raw.colors!==undefined){
  if(!raw.colors||typeof raw.colors!=='object'||Array.isArray(raw.colors))throw Error('Invalid deck colours.');
  result.colors={};for(const key of ['background','text','accent','secondary'])if(raw.colors[key]!==undefined){if(typeof raw.colors[key]!=='string'||!hex.test(raw.colors[key]))throw Error('Use six-digit hex colours.');result.colors[key]=raw.colors[key].toUpperCase();}
 }
 return result;
}
export function validateSlidePresentation(raw,def){
 if(raw===undefined)return undefined;
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Invalid slide presentation.');
 const result={layout:raw.layout??'primary'};
 if(!['primary','alternate'].includes(result.layout))throw Error('Choose a supported slide layout.');
 if(raw.text!==undefined){
  if(!raw.text||typeof raw.text!=='object'||Array.isArray(raw.text))throw Error('Invalid slide text.');
  result.text={};for(const {id} of def.questions)if(raw.text[id]!==undefined){if(typeof raw.text[id]!=='string'||raw.text[id].length>360)throw Error('Slide text must be at most 360 characters per field.');result.text[id]=raw.text[id];}
 }
 if(raw.stages!==undefined){if(def.id!=='gtm'||!Array.isArray(raw.stages)||raw.stages.length!==4||raw.stages.some(s=>typeof s!=='string'||s.length>40))throw Error('Provide four short go-to-market stages.');result.stages=[...raw.stages];}
 if(raw.data!==undefined){
  if(!['traction','ask'].includes(def.id)||!Array.isArray(raw.data)||raw.data.length>6)throw Error('Invalid slide chart data.');
  result.data=raw.data.map(row=>{if(!row||typeof row.label!=='string'||row.label.length>40||(row.value!==null&&(!Number.isFinite(row.value)||row.value<0||row.value>1e12)))throw Error('Chart rows need a short label and a non-negative number.');return {label:row.label,value:row.value};});
 }
 if(raw.unit!==undefined){if(typeof raw.unit!=='string'||raw.unit.length>24)throw Error('Chart unit must be at most 24 characters.');result.unit=raw.unit;}
 return result;
}
export function deckDesign(project,track){
 const raw=project.pitch?.[track]?.design||{},look=deckLooks.find(l=>l.id===raw.look)||deckLooks[0];
 const colors={...look.colors};for(const key of Object.keys(colors))if(hex.test(raw.colors?.[key]||''))colors[key]=raw.colors[key];
 const font=deckFonts.find(f=>f.id===(raw.font||look.font))||deckFonts[0];
 return {...look,...colors,font:font.id,fontFace:font.face};
}
const rgb=c=>c.slice(1).match(/../g).map(s=>parseInt(s,16));
export function mix(a,b,amount){const x=rgb(a),y=rgb(b);return '#'+x.map((v,i)=>Math.round(v+(y[i]-v)*amount).toString(16).padStart(2,'0')).join('');}
function luminance(color){return rgb(color).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);}
export function contrastRatio(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
export const onColor=color=>contrastRatio(color,'#FFFFFF')>contrastRatio(color,'#172425')?'#FFFFFF':'#172425';
export const shortCopy=(text,max=260)=>{const s=String(text??'').trim();return s.length>max?s.slice(0,max-1).trimEnd()+'…':s;};
export function slideCopy(d,key,fallback='Add your own detail'){
 return d.presentation?.text?.[key]?.trim()||shortCopy(d.answers?.[key]||fallback);
}
export function abbreviatedFields(def,d){return def.questions.filter(q=>!d.presentation?.text?.[q.id]?.trim()&&(d.answers?.[q.id]?.trim().length||0)>260);}
export function evidenceLabel(d){return d.evidenceState==='assumption'?'Assumption · not yet validated':d.evidenceState==='provided'?'User-supplied evidence · not independently verified':'Draft · evidence not recorded';}

export function slideScene(project,track,def,d,index){
 const theme=deckDesign(project,track),alt=d.presentation?.layout==='alternate',nodes=[];
 const muted=mix(theme.text,theme.background,.32),line=mix(theme.text,theme.background,.82),surface=mix(theme.background,theme.secondary,.15);
 const text=(value,x,y,w,h,size=25,options={})=>{
  const string=String(value??''),capacity=Math.max(1,w/(size*.52))*Math.max(1,h/(size*1.22));
  // The full source remains in the outline and speaker notes. All visible text is native/editable.
  const fitted=Math.max(Math.min(17,size),Math.min(size,size*Math.sqrt(capacity/Math.max(string.length,1))));
  nodes.push({kind:'text',text:string,x,y,w,h,size:fitted,color:theme.text,font:'Arial',...options});
 };
 const shape=(type,x,y,w,h,fill,stroke=fill,extra={})=>nodes.push({kind:'shape',type,x,y,w,h,fill,stroke,...extra});
 const rule=(x,y,w,color=line)=>shape('rect',x,y,w,2,color);
 const copy=(key,fallback)=>slideCopy(d,key,fallback);
 const label=(s,x,y,w=500)=>text(s.toUpperCase(),x,y,w,24,16,{color:theme.accent,bold:true,letterSpacing:1.4});
 const block=(labelText,body,x,y,w,h=170)=>{rule(x,y,w);label(labelText,x,y+17,w);text(body,x,y+55,w,h-55,26);};
 const paragraph=(labelText,body,x,y,w,h=150)=>{label(labelText,x,y,w);text(body,x,y+35,w,h-35,26);};
 const steps=(items,x,y,w,h=155,vertical=false)=>items.forEach((item,i)=>{
  const stepW=vertical?w:w/items.length-20,stepH=vertical?h/items.length:h;
  const sx=x+(vertical?0:i*w/items.length),sy=y+(vertical?i*stepH:0);
  if(vertical){label(String(i+1).padStart(2,'0'),sx,sy,60);text(item,sx+70,sy,w-70,stepH-12,25);if(i<items.length-1)rule(sx+70,sy+stepH-8,w-70);}
  else{label(String(i+1).padStart(2,'0'),sx,sy,stepW);rule(sx,sy+35,stepW,theme.accent);text(item,sx,sy+52,stepW,h-52,25);}
 });
 const chart=(rows,x,y,w,h,unit='')=>{
  const max=Math.max(...rows.map(r=>r.value),1),rowH=h/rows.length;
  rows.forEach((r,i)=>{const cy=y+i*rowH; text(r.label,x,cy,w*.38,rowH-10,21);shape('rect',x+w*.4,cy+4,w*.4*(r.value/max),Math.min(22,rowH-14),i%2?theme.secondary:theme.accent);text(`${r.value.toLocaleString('en-MY')}${unit?' '+unit:''}`,x+w*.82,cy,w*.18,rowH-10,19,{align:'right'});});
 };
 const rows=(d.presentation?.data||[]).filter(r=>r.label.trim()&&Number.isFinite(r.value)&&r.value>=0);
 const hasData=['traction','ask'].includes(def.id)&&rows.some(r=>r.value>0);
 // Template-specific composition, with restrained typography and consistent geometry.
 if(theme.id==='bold-demo')shape('rect',0,0,16,720,theme.accent);
 if(theme.id==='editorial')rule(64,67,1152,theme.accent);
 if(theme.id==='data-first'){rule(64,75,1152);text(String(index).padStart(2,'0'),1120,95,96,55,42,{font:'Courier New',color:theme.accent,align:'right'});}
 text(shortCopy(project.answers?.[0]||'Your project',80),64,30,900,23,16,{color:muted});
 text(`${track==='hackathon'?'HACKATHON':'STARTUP'} / ${String(index).padStart(2,'0')}`,1000,30,216,23,15,{align:'right',color:muted});
 label(def.title,64,95,950);
 text(d.headline||'Your headline goes here',64,139,theme.id==='data-first'?1010:1152,112,theme.id==='bold-demo'?58:theme.id==='editorial'?54:48,{font:theme.fontFace,bold:theme.id!=='editorial'});
 const y=286;
 switch(def.id){
  case 'title':
   if(alt){label(copy('identity','Your project name'),64,280,1152);text(copy('summary','One sentence about what you do and for whom.'),64,331,1100,190,43,{font:theme.fontFace});text(copy('presenter','Presenter / date'),64,571,1152,40,22,{color:muted});}
   else{paragraph('The project',copy('identity','Your project name'),64,y,560,96);text(copy('summary','One sentence about what you do and for whom.'),64,400,560,145,31);text(copy('presenter','Presenter / date'),64,575,560,36,20,{color:muted});shape('rect',690,y,526,320,surface,line);label('Product visual',720,y+28,466);text(shortCopy(d.visual||'Your screenshot or demo plan goes here.',220),720,y+80,466,180,27,{color:muted});}
   break;
  case 'problem':
   if(alt){paragraph('The customer',copy('customer','Your first customer'),64,y,370,290);shape('rect',478,y,738,320,surface);paragraph('Their experience',copy('pain','Describe the pain'),510,y+27,674,135);paragraph('What it costs / why now',copy('impact','Measured impact or an assumption'),510,y+187,674,115);}
   else ['customer','pain','impact'].forEach((key,i)=>block(['Who','The pain','The cost / why now'][i],copy(key),64+i*393,y,365,300));
   break;
  case 'solution':{
   const flow=String(copy('flow','Your first step; Their action; The result')).split(/[;\n]+/).map(s=>s.trim()).filter(Boolean).slice(0,3);
   if(alt){paragraph('The value',copy('value'),64,y,510,280);steps(flow,660,y,556,235,true);text(copy('difference'),660,548,556,69,21,{color:muted});}
   else{text(copy('value'),64,y,1152,70,31);steps(flow,64,385,1152,145);text(copy('difference'),64,562,1152,64,22,{color:muted});}
   break;}
  case 'market':
   if(alt){['tam','sam','som'].forEach((key,i)=>{const yy=y+i*103;shape('rect',64,yy,1000-i*215,2,i===1?theme.secondary:theme.accent);label(key,64,yy+20,95);text(copy(key),202,yy+13,1014,75,26);});}
   else{[300,240,190].forEach((diameter,i)=>{const x=[64,510,960][i],cy=y+(300-diameter)/2,col=[theme.accent,theme.secondary,mix(theme.accent,theme.background,.25)][i];shape('ellipse',x,cy,diameter,diameter,col);text(['TAM','SAM','SOM'][i],x+25,cy+diameter*.22,diameter-50,34,29,{color:onColor(col),bold:true,align:'center'});text(copy(['tam','sam','som'][i]),x+26,cy+diameter*.41,diameter-52,diameter*.42,23,{color:onColor(col),align:'center'});});text('Conceptual circles, not proportional to market values',64,617,1152,22,16,{color:muted});}
   break;
  case 'business':
   if(alt)['revenue','pricing','economics'].forEach((key,i)=>block(['Who pays + how','Price / package','Cost + economics'][i],copy(key),64+i*393,y,365,305));
   else{block('Who pays + how',copy('revenue'),64,y,510,150);text('→',600,330,60,60,46,{color:theme.accent});block('Price / package',copy('pricing'),704,y,512,150);block('Cost + economics',copy('economics'),64,475,1152,145);}
   break;
  case 'gtm':{
   const stages=d.presentation?.stages||['Reach','Try','Adopt','Keep'];
   if(alt){paragraph('First customer',copy('beachhead'),64,y,510,105);paragraph('Acquisition experiment',copy('engine'),64,422,510,185);steps(stages,660,y,556,220,true);paragraph('Measure + expand',copy('expansion'),660,543,556,82);}
   else{paragraph('First customer',copy('beachhead'),64,y,1152,85);steps(stages,64,388,1152,105);block('Acquisition experiment',copy('engine'),64,519,550,110);block('Measure + expand',copy('expansion'),666,519,550,110);}
   break;}
  case 'traction':
   if(hasData){chart(rows,64,y,740,310,d.presentation.unit);paragraph('Validation',copy('validation'),860,y,356,190);paragraph('Period + next',copy('period'),860,500,356,110);}
   else if(alt){steps(['metrics','validation','period'].map((key,i)=>`${['Measured','Validated','Next'][i]}\n${copy(key)}`),64,y,1152,310,true);}
   else ['metrics','validation','period'].forEach((key,i)=>block(['Measured','Validated','When + next'][i],copy(key),64+i*393,y,365,300));
   break;
  case 'competition':
   if(alt){paragraph('The alternatives',copy('alternatives'),64,y,1152,125);block('Customer criteria',copy('criteria'),64,455,550,165);block('Possible advantage',copy('advantage'),666,455,550,165);}
   else ['alternatives','criteria','advantage'].forEach((key,i)=>block(['Real alternatives','Customer criteria','Possible advantage'][i],copy(key),64+i*393,y,365,300));
   break;
  case 'team':
   if(alt)['people','fit','gaps'].forEach((key,i)=>block(['People + responsibilities','Relevant experience','Support + gaps'][i],copy(key),64+i*393,y,365,300));
   else{paragraph('People + responsibilities',copy('people'),64,y,535,325);block('Relevant experience',copy('fit'),680,y,536,170);block('Support + gaps',copy('gaps','What capability would help next?'),680,486,536,135);}
   break;
  case 'ask':
   if(hasData){paragraph('The ask',copy('request'),64,y,450,135);paragraph('Next milestone',copy('milestone'),64,470,450,145);chart(rows,574,y,642,255,d.presentation.unit);text(copy('resources'),574,566,642,59,20,{color:muted});}
   else if(alt){text(copy('request','Your specific request'),64,y,1152,125,42,{font:theme.fontFace});block('Use of support',copy('resources'),64,463,550,160);block('Next milestone',copy('milestone'),666,463,550,160);}
   else{shape('ellipse',64,y,310,310,theme.accent);label('The ask',110,y+65,218);nodes[nodes.length-1].color=onColor(theme.accent);text(copy('request','Your specific request'),110,y+112,218,130,28,{color:onColor(theme.accent),align:'center'});block('Use of support',copy('resources'),478,y,738,140);block('Next milestone',copy('milestone'),478,472,738,150);}
   break;
 }
 rule(64,662,1152);
 text(evidenceLabel(d),64,679,1000,23,14,{color:muted});
 text(String(index).padStart(2,'0'),1130,676,86,28,18,{align:'right',color:muted});
 return {width:1280,height:720,theme,nodes,layout:alt?'alternate':'primary',abbreviated:abbreviatedFields(def,d)};
}
