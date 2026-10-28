// Reads an app's code from a ZIP file or a chosen folder, entirely in the browser.
// Only files that the tutor can read are kept, using the same rules as the server.
import {eligibleFile} from '../shared/source-files.js';

export const uploadLimits={maxFiles:60,maxChars:240000};

const important=path=>/(^|\/)(README\.md|package\.json|.*schema.*|.*routes.*|.*auth.*|.*server.*)$/i.test(path)?0:1;

// Most ZIP downloads (Lovable, Bolt, GitHub) wrap everything in one top folder; drop it so paths read naturally.
function stripCommonFolder(entries){
 const first=entries[0]?.path.split('/')[0];
 if(!first||!entries.every(e=>e.path.includes('/')&&e.path.split('/')[0]===first))return entries;
 return entries.map(e=>({...e,path:e.path.slice(first.length+1)}));
}

async function inflate(bytes){
 const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
 return new Uint8Array(await new Response(stream).arrayBuffer());
}

// Minimal ZIP reader: central directory, stored (0) and deflate (8) entries. Enough for code downloads.
export async function readZip(buffer){
 const view=new DataView(buffer),bytes=new Uint8Array(buffer),decoder=new TextDecoder();
 let end=-1;
 for(let i=buffer.byteLength-22;i>=Math.max(0,buffer.byteLength-65557);i--)if(view.getUint32(i,true)===0x06054b50){end=i;break;}
 if(end<0)throw new Error('This file does not look like a ZIP file.');
 const count=view.getUint16(end+10,true);let offset=view.getUint32(end+16,true);const entries=[];
 for(let n=0;n<count;n++){
  if(view.getUint32(offset,true)!==0x02014b50)throw new Error('This ZIP file could not be read.');
  const method=view.getUint16(offset+10,true),compressed=view.getUint32(offset+20,true),size=view.getUint32(offset+24,true);
  const nameLength=view.getUint16(offset+28,true),extraLength=view.getUint16(offset+30,true),commentLength=view.getUint16(offset+32,true),local=view.getUint32(offset+42,true);
  const path=decoder.decode(bytes.subarray(offset+46,offset+46+nameLength));
  offset+=46+nameLength+extraLength+commentLength;
  if(path.endsWith('/'))continue;
  entries.push({path,size,async read(){
   const start=local+30+view.getUint16(local+26,true)+view.getUint16(local+28,true),data=bytes.subarray(start,start+compressed);
   if(method===0)return data;if(method===8)return inflate(data);return null;
  }});
 }
 return entries;
}

async function pick(entries){
 entries=stripCommonFolder(entries.map(e=>({...e,path:e.path.replace(/\\/g,'/').replace(/^\/+/,'')})));
 const total=entries.length;
 const candidates=entries.filter(e=>eligibleFile(e.path,e.size)).sort((a,b)=>important(a.path)-important(b.path)||a.path.localeCompare(b.path));
 const files=[];let chars=0;const decoder=new TextDecoder('utf-8',{fatal:true});
 for(const entry of candidates){
  if(files.length>=uploadLimits.maxFiles||chars>=uploadLimits.maxChars)break;
  const raw=await entry.read();if(!raw)continue;
  let content;try{content=decoder.decode(raw);}catch{continue;}
  if(content.includes('\u0000')||chars+content.length>uploadLimits.maxChars)continue;
  chars+=content.length;files.push({path:entry.path,content});
 }
 return {files,totalFiles:total,skipped:total-files.length};
}

// fileList: from <input type="file"> — either one .zip, or every file in a chosen folder.
export async function readProject(fileList){
 const list=[...fileList];
 if(!list.length)throw new Error('Choose a ZIP file or a folder first.');
 if(list.length===1&&/\.zip$/i.test(list[0].name)){
  if(typeof DecompressionStream==='undefined')throw new Error('This browser cannot open ZIP files. Unzip it and choose the folder instead.');
  const result=await pick(await readZip(await list[0].arrayBuffer()));
  return {...result,name:list[0].name.replace(/\.zip$/i,'')};
 }
 const entries=list.map(file=>({path:file.webkitRelativePath||file.name,size:file.size,async read(){return new Uint8Array(await file.arrayBuffer());}}));
 const result=await pick(entries);
 return {...result,name:(list[0].webkitRelativePath||'').split('/')[0]||'My app'};
}
