// Splits a project's files into chapters for a full scan, by folder.
// Shared by the server (to scan) and the page (to show how many chapters a full scan makes).
export const MAX_CHAPTERS=8;

const folderOf=path=>{const parts=path.split('/');parts.pop();return parts.slice(0,2).join('/')||'';};

// files: [{path, size}] where size is a character count (or line count on the page).
export function scanGroups(files,max=MAX_CHAPTERS){
 const groups=new Map();
 for(const f of files){const key=folderOf(f.path);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(f);}
 let list=[...groups].map(([folder,items])=>({folder,title:folder?folder.split('/').pop():'Project setup',files:items,size:items.reduce((n,f)=>n+(f.size||0),0)}));
 list.sort((a,b)=>b.size-a.size);
 if(list.length>max){
  const keep=list.slice(0,max-1),rest=list.slice(max-1);
  keep.push({folder:'*',title:'Other files',files:rest.flatMap(g=>g.files),size:rest.reduce((n,g)=>n+g.size,0)});
  list=keep;
 }
 return list;
}
