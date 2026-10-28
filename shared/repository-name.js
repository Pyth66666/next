export function githubName(value){
 const input=String(value||'').trim();let name=input;
 if(/^https?:\/\//i.test(input)){
  let url;try{url=new URL(input);}catch{throw new Error('Paste a GitHub project link, or enter owner/project.');}
  if(url.protocol!=='https:'||url.hostname!=='github.com'||url.port||url.username||url.password||url.search||url.hash)throw new Error('Use a project link from https://github.com.');
  name=url.pathname.replace(/^\/|\/$/g,'');
 }
 name=name.replace(/\.git$/,'');
 if(!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(name)||name.split('/').some(part=>/^\.+$/.test(part)))throw new Error('Use the main project link, like https://github.com/your-name/your-app.');
 return name;
}
