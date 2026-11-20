// "Learn my app" code tour: the model picks important pieces of real code and explains
// each line in plain words. The server copies the code itself from the stored files, so
// the learner always sees the real lines, never text the model rewrote.

export const MAX_PIECES=6,MAX_PIECE_LINES=15;

export function codeTourPrompt({fullName,commit,partial,level,language,focus='',maxPieces=MAX_PIECES}){
 return `Teach a ${level} how this app's code works, in ${language}. Snapshot: ${fullName} @ ${commit}. ${partial?'Index is partial.':''}${focus?`\nThis lesson covers only one part of the app: ${focus}. Pick pieces from the supplied files only.`:''}
Use very plain words, as if the reader has never coded. Explain what each line DOES, not what might be wrong with it. Do not review, criticise or suggest fixes.
Return only JSON with this shape:
{"framework_name":"main framework or language, e.g. React + Vite",
"framework_plain":"one or two sentences: what that framework is and what it does in this app",
"summary":"two or three sentences: what the app does for its users",
"pieces":[{"file":"exact supplied file path","start":first line number,"end":last line number,"title":"short name, e.g. Saving a new task","purpose":"one sentence: what this piece does in the app","lines":[{"line":line number,"explain":"what this line does, in plain words"}]}]}
Choose ${maxPieces} pieces or fewer, the ones that best show how the app works (entry point, main screen, data, saving, routes). Each piece is at most ${MAX_PIECE_LINES} consecutive lines. Give one explanation for every non-blank line in the piece; line numbers are the numbers shown before each line in the supplied files.`;
}

// Reads the model's JSON. Smaller models sometimes close an object one brace too early
// ("...\"},\"pieces\":..."); dropping that stray brace is tried a few times before giving up.
export function parseLooseJson(text){
 let s=String(text||'').trim().replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,'');
 for(let i=0;i<4;i++){
  try{return JSON.parse(s);}catch(e){
   const at=Number(/position (\d+)/.exec(e.message)?.[1]);
   if(!Number.isInteger(at)||s[at-1]!=='}')return null;
   s=s.slice(0,at-1)+s.slice(at);
  }
 }
 return null;
}

const str=(v,max)=>typeof v==='string'&&v.trim()?v.trim().slice(0,max):'';

// Returns a validated tour, or null if the model's answer cannot be used.
export function buildCodeTour(raw,files,maxPieces=MAX_PIECES){
 if(!raw||typeof raw!=='object'||!Array.isArray(raw.pieces))return null;
 const pieces=[];
 for(const p of raw.pieces.slice(0,maxPieces)){
  const file=files.find(f=>f.path===p?.file);if(!file)continue;
  const source=file.content.split('\n');
  let start=Number.isInteger(p.start)?p.start:NaN,end=Number.isInteger(p.end)?p.end:NaN;
  if(!(start>=1&&start<=source.length))continue;
  if(!(end>=start))end=start;
  end=Math.min(end,source.length,start+MAX_PIECE_LINES-1);
  const notes=new Map();
  for(const l of Array.isArray(p.lines)?p.lines:[])if(Number.isInteger(l?.line)&&str(l.explain,600))notes.set(l.line,str(l.explain,600));
  const lines=[];for(let n=start;n<=end;n++)lines.push({n,code:source[n-1],explain:notes.get(n)||''});
  if(!lines.some(l=>l.explain))continue;
  pieces.push({file:file.path,start,end,title:str(p.title,120)||file.path,purpose:str(p.purpose,600),lines});
 }
 if(!pieces.length)return null;
 return {framework:{name:str(raw.framework_name??raw.framework?.name,120)||'Not sure',plain:str(raw.framework_plain??raw.framework?.plain,800)},summary:str(raw.summary,1200),pieces};
}

// Plain-text version, kept in `text` for history, search and older screens.
export function tourText(tour){
 return [`Built with: ${tour.framework.name}`,tour.framework.plain,'',tour.summary,...tour.pieces.flatMap(p=>['',`${p.title} — ${p.file}:${p.start}-${p.end}`,p.purpose,...p.lines.filter(l=>l.explain).map(l=>`  ${l.n}: ${l.explain}`)])].join('\n').trim();
}

// Runs a lesson scan. "normal": one AI call on the ~10 most important files.
// "full": one AI call per folder group (up to 8 chapters), run a few at a time.
export async function runScan({kind,repo,level,language,ai,pickFiles,fileContext,scanGroups,policy}){
 const one=async(files,extra={})=>{
  const r=await ai(policy,`${codeTourPrompt({...repo,level,language,...extra})}\n${fileContext(files)}`,4000);
  return {r,tour:buildCodeTour(parseLooseJson(r.text),files)};
 };
 if(kind!=='full'){
  const files=pickFiles(repo,'README package schema routes server auth architecture');
  const {r,tour}=await one(files);
  return {result:r,tour,sources:files.map(f=>f.path),usage:r.usage};
 }
 const groups=scanGroups(repo.files.map(f=>({...f,size:f.content.length})));
 const chapters=[];
 for(let i=0;i<groups.length;i+=4){
  const batch=await Promise.allSettled(groups.slice(i,i+4).map(g=>{
   let used=0;const files=g.files.filter(f=>(used+=f.content.length)<=60000);
   return one(files.length?files:g.files.slice(0,1),{focus:g.folder==='*'?'the remaining files':`the "${g.folder||'top-level'}" files`,maxPieces:4}).then(x=>({...x,g,files}));
  }));
  for(const b of batch)if(b.status==='fulfilled')chapters.push(b.value);
 }
 const good=chapters.filter(c=>c.tour);
 if(!good.length)return {result:chapters[0]?.r||{text:'',model:null},tour:null,sources:[],usage:null};
 const add=(a,b)=>a+Number(b||0);
 const usage=chapters.reduce((u,c)=>({prompt_tokens:add(u.prompt_tokens,c.r.usage?.prompt_tokens),completion_tokens:add(u.completion_tokens,c.r.usage?.completion_tokens),thinking_tokens:add(u.thinking_tokens,c.r.usage?.thinking_tokens)}),{prompt_tokens:0,completion_tokens:0,thinking_tokens:0});
 const lead=good[0].tour;
 const tour={framework:lead.framework,summary:lead.summary,full:true,pieces:good.flatMap(c=>c.tour.pieces.map(p=>({...p,chapter:c.g.title})))};
 return {result:{...good[0].r,usage},tour,sources:good.flatMap(c=>c.files.map(f=>f.path)),usage};
}
