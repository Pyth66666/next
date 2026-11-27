// Showcase: rules for a submitted project, shared by the submit form and the server, and a
// safe renderer for the description (bold, bulleted and numbered lists, nothing else).

export const STAGES=[['','Not set'],['hobby','Hobby project'],['launched','Launched'],['monetized','Making money'],['open-source','Open source']];
// Events that get their own filter chip in the gallery and are suggested on the submit form.
export const EVENTS=['UNLOCK AI'];
export const LIMITS={title:80,summary:140,description:3000,author:60,event:80,url:300,tags:5,tag:30,images:6};
export const IMAGE_TYPES=['image/webp','image/jpeg','image/png'];
export const MAX_IMAGE_BYTES=1500000;

const str=v=>typeof v==='string'?v.trim():'';

export function cleanUrl(value,{video=false}={}){
 const v=str(value);if(!v)return '';
 let u;try{u=new URL(v);}catch{throw new Error('Links must be full web addresses starting with https://');}
 if(u.protocol!=='https:')throw new Error('Links must start with https://');
 if(v.length>LIMITS.url)throw new Error('That link is too long.');
 if(video&&!/(^|\.)(youtube\.com|youtu\.be|vimeo\.com)$/.test(u.hostname))throw new Error('The demo video must be a YouTube or Vimeo link.');
 return u.toString();
}

export function cleanTags(value){
 const list=(Array.isArray(value)?value:String(value||'').split(',')).map(t=>str(String(t)).replace(/\s+/g,' ')).filter(Boolean);
 const seen=new Set(),out=[];
 for(const t of list){if(t.length>LIMITS.tag)throw new Error(`Keep each tech tag under ${LIMITS.tag} characters.`);const k=t.toLowerCase();if(!seen.has(k)){seen.add(k);out.push(t);}}
 if(out.length>LIMITS.tags)throw new Error(`Add up to ${LIMITS.tags} tech tags.`);
 return out;
}

// Returns a clean submission or throws an Error whose message can be shown to the user.
export function validateShowcase(input){
 const b=input&&typeof input==='object'?input:{};
 const title=str(b.title),summary=str(b.summary),description=str(b.description),author=str(b.author),event=str(b.event);
 if(!title)throw new Error('Give your project a title.');
 if(!summary)throw new Error('Add a one-line summary for the project card.');
 for(const [k,v] of Object.entries({title,summary,description,author,event}))if(v.length>LIMITS[k])throw new Error(`The ${k} is too long (up to ${LIMITS[k]} characters).`);
 if(/[\r\n]/.test(title+summary))throw new Error('Keep the title and summary on one line.');
 const stage=STAGES.some(([id])=>id===b.stage)?b.stage:'';
 const out={title,summary,description,author,event,stage,stack:cleanTags(b.stack),liveUrl:cleanUrl(b.liveUrl),sourceUrl:cleanUrl(b.sourceUrl),videoUrl:cleanUrl(b.videoUrl,{video:true})};
 if(!out.liveUrl&&!out.sourceUrl&&!out.videoUrl)throw new Error('Add at least one link: where to try it, the code, or a demo video.');
 return out;
}

// Escapes everything, then allows only **bold**, "- " bullets and "1. " numbered lists.
export function renderDescription(text,esc){
 const inline=s=>esc(s).replace(/\*\*([^*\n]+)\*\*/g,'<strong>$1</strong>');
 const blocks=[];let list=null;
 for(const raw of String(text||'').split(/\r?\n/)){
  const line=raw.trim(),bullet=/^[-*]\s+(.+)/.exec(line),num=/^\d+[.)]\s+(.+)/.exec(line);
  const type=bullet?'ul':num?'ol':null;
  if(type){if(!list||list.type!==type){list={type,items:[]};blocks.push(list);}list.items.push((bullet||num)[1]);continue;}
  list=null;
  if(line)blocks.push({type:'p',text:line});
 }
 return blocks.map(b=>b.type==='p'?`<p>${inline(b.text)}</p>`:`<${b.type}>${b.items.map(i=>`<li>${inline(i)}</li>`).join('')}</${b.type}>`).join('');
}
