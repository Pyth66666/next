// Admin activity feed: what every user has searched and made, newest first.
// Idea checks, idea brainstorms and file explanations are recorded as they happen (the
// `activity` table). Apps added, tutor questions, projects and pitches are read from where the
// app already keeps them. Read by admins only; users are told on their account page.
import {randomUUID} from 'node:crypto';

export const KINDS={
 'idea-check':'Idea check','idea-brainstorm':'Idea brainstorm',
 'app-added':'App added','file-explained':'File explained','tutor-question':'Tutor question',
 'project':'Project','pitch':'Pitch','showcase':'Showcase post'
};
const GROUPS={ideas:['idea-check','idea-brainstorm'],learn:['app-added','file-explained','tutor-question'],projects:['project','pitch','showcase']};
const parse=v=>{try{return JSON.parse(v);}catch{return {};}};
const clip=(s,n)=>String(s??'').replace(/\s+/g,' ').trim().slice(0,n);

// Turns what a feature returned into a compact record: the user's input plus the outcome.
export function ideaCheckRecord(idea,track,r){
 return {idea:clip(idea,2000),track:track||null,verdict:r.verdict,originality:r.originality,summary:clip(r.summary,1200),closest:(r.closest||[]).map(c=>`${c.name} (${c.source})`).slice(0,4),keywords:r.keywords||[]};
}
export function brainstormRecord(track,interest,r){
 return {track:track||null,interest:clip(interest,600),ideas:(r.ideas||[]).map(i=>clip(i.title||i.name||i.idea||JSON.stringify(i),200)).slice(0,10)};
}

function describe(kind,d){
 switch(kind){
  case 'idea-check':return {title:d.idea,detail:[`Verdict: ${d.verdict} · ${d.originality}/100 originality`,d.track&&`Track: ${d.track}`,d.summary,d.closest?.length&&`Closest: ${d.closest.join(', ')}`].filter(Boolean).join('\n')};
  case 'idea-brainstorm':return {title:d.interest||`Brainstorm${d.track?' for '+d.track:''}`,detail:[d.track&&`Track: ${d.track}`,d.ideas?.length&&`Ideas suggested:\n- ${d.ideas.join('\n- ')}`].filter(Boolean).join('\n')};
  case 'file-explained':return {title:`${d.app}: ${d.path}`,detail:[d.language&&`Language: ${d.language}`,d.summary].filter(Boolean).join('\n')};
  default:return {title:'',detail:''};
 }
}

function projectText(p){
 const answers=(Array.isArray(p.answers)?p.answers:[]).map((a,i)=>`Q${i+1}: ${a}`).filter(a=>a.length>4);
 const details=Object.entries(p.detailAnswers||{}).map(([k,v])=>`${k}: ${v}`);
 return [p.problemArea&&`Problem area: ${p.problemArea}`,...answers,...details,p.output&&`Brief:\n${String(p.output).slice(0,8000)}`].filter(Boolean).join('\n');
}
function pitchText(p){
 const out=[];
 for(const [track,deck] of Object.entries(p.pitch||{})){
  if(!deck||typeof deck!=='object')continue;
  out.push(`${track} pitch${deck.event?` for ${deck.event}`:''}`);
  for(const [id,s] of Object.entries(deck.slides||{})){
   const answers=Object.entries(s?.answers||{}).filter(([,v])=>String(v).trim()).map(([k,v])=>`  ${k}: ${v}`);
   if(s?.headline||answers.length)out.push(`- ${id}: ${s.headline||''}`,...answers);
  }
 }
 return out.join('\n');
}

export function activityLog({db}){
 // Never lets logging break the feature that called it.
 async function record(user,kind,data){
  try{await db.prepare('INSERT INTO activity VALUES(?,?,?,?,?)').run(randomUUID(),user,kind,Date.now(),JSON.stringify(data));}
  catch{console.error('Could not record activity.');}
 }

 async function feed({kind='',group='',q='',user='',limit=500}={}){
  const users=new Map((await db.prepare('SELECT id,email FROM users').all()).map(u=>[u.id,u.email]));
  const items=[];
  const add=(userId,kindId,at,title,detail)=>items.push({at:Number(at)||0,userId,email:users.get(userId)||'(deleted user)',kind:kindId,label:KINDS[kindId],title:clip(title,300)||'(untitled)',detail:String(detail||'')});

  for(const r of await db.prepare('SELECT user_id,kind,created,data FROM activity').all()){const d=parse(r.data),x=describe(r.kind,d);add(r.user_id,r.kind,r.created,x.title,x.detail);}
  const appNames=new Map();
  for(const r of await db.prepare('SELECT user_id,data FROM repositories').all()){const d=parse(r.data);appNames.set(d.id,d.fullName);add(r.user_id,'app-added',d.indexed,d.fullName,`${d.source==='upload'?'Uploaded':'GitHub · '+(d.branch||'')} · ${d.files?.length||0} files`);}
  for(const r of await db.prepare("SELECT user_id,repo_id,content,created FROM conversations WHERE role='user'").all())add(r.user_id,'tutor-question',r.created,r.content,`App: ${appNames.get(r.repo_id)||'(deleted app)'}\n${r.content}`);
  for(const r of await db.prepare('SELECT user_id,data FROM projects').all()){
   const p=parse(r.data),name=p.name||p.answers?.[0]||'Untitled project';
   add(r.user_id,'project',p.updated||p.created,name,projectText(p));
   const pitch=pitchText(p);if(pitch)add(r.user_id,'pitch',p.updated||p.created,name,pitch);
  }
  for(const r of await db.prepare('SELECT user_id,status,created,data FROM showcase').all()){const d=parse(r.data);add(r.user_id,'showcase',r.created,d.title,[`Status: ${r.status}`,d.summary,d.stack?.length&&`Stack: ${d.stack.join(', ')}`,d.liveUrl,d.sourceUrl,d.videoUrl,d.description].filter(Boolean).join('\n'));}

  const kinds=kind?[kind]:GROUPS[group]||null,needle=q.trim().toLowerCase(),who=user.trim().toLowerCase();
  return items
   .filter(i=>(!kinds||kinds.includes(i.kind))&&(!who||i.email.toLowerCase().includes(who))&&(!needle||`${i.title}\n${i.detail}`.toLowerCase().includes(needle)))
   .sort((a,b)=>b.at-a.at).slice(0,limit);
 }

 return {record,feed};
}

// Spreadsheet export. Cells starting with = + - @ are prefixed so spreadsheet apps
// never run user text as a formula.
export function toCsv(items){
 const cell=v=>{let s=String(v??'');if(/^[=+\-@\t\r]/.test(s))s="'"+s;return /[",\n\r]/.test(s)?`"${s.replace(/"/g,'""')}"`:s;};
 const rows=[['Time (UTC)','User','Type','Title','Details'],...items.map(i=>[new Date(i.at).toISOString(),i.email,i.label,i.title,i.detail])];
 return '﻿'+rows.map(r=>r.map(cell).join(',')).join('\r\n');
}
