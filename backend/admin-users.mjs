// Admin view of signed-up users: who they are, how they signed in, and what they have done.
// Read-only. Never returns password hashes, session tokens or GitHub tokens.
import {ApiError} from './providers.mjs';

const SESSION_DAYS=7*86400000;
const parse=v=>{try{return JSON.parse(v);}catch{return {};}};
const projectSummary=d=>{
 const answers=Array.isArray(d.answers)?d.answers.filter(a=>typeof a==='string'&&a.trim()):[];
 return {
  id:d.id,name:String(d.name||d.title||answers[0]||'Untitled idea').slice(0,80),
  created:d.created||null,
  questionsAnswered:answers.length,
  briefReady:!!d.output,
  pitch:!!d.pitch
 };
};

export function adminUsers({db,plans}){
 async function list(){
  const users=await db.prepare('SELECT id,email,created FROM users ORDER BY created DESC').all();
  const count=async(sql,id)=>Number((await db.prepare(sql).get(id))?.n||0);
  return Promise.all(users.map(async u=>{
   const ids=await db.prepare('SELECT provider FROM identities WHERE user_id=?').all(u.id);
   const lastSession=Number((await db.prepare('SELECT MAX(expires) AS n FROM sessions WHERE user_id=?').get(u.id))?.n||0);
   const lastQuestion=Number((await db.prepare('SELECT MAX(created) AS n FROM conversations WHERE user_id=?').get(u.id))?.n||0);
   const progress=parse((await db.prepare('SELECT data FROM progress WHERE user_id=?').get(u.id))?.data);
   return {
    id:u.id,email:u.email,created:Number(u.created),
    signIn:ids.length?ids.map(i=>i.provider):['email'],
    lastActive:Math.max(lastSession?lastSession-SESSION_DAYS:0,lastQuestion,Number(u.created))||null,
    projects:await count('SELECT COUNT(*) AS n FROM projects WHERE user_id=?',u.id),
    apps:await count('SELECT COUNT(*) AS n FROM repositories WHERE user_id=?',u.id),
    questions:await count("SELECT COUNT(*) AS n FROM conversations WHERE user_id=? AND role='user'",u.id),
    quizzesPassed:Array.isArray(progress.quizPasses)?progress.quizPasses.length:0,
    plan:await plans.planOf(u.id,u.email),...await plans.summary(u.id)
   };
  }));
 }

 async function detail(id){
  const u=await db.prepare('SELECT id,email,created FROM users WHERE id=?').get(id);
  if(!u)throw new ApiError(404,'User not found.');
  const projects=(await db.prepare('SELECT data FROM projects WHERE user_id=?').all(id)).map(r=>projectSummary(parse(r.data)));
  const repos=(await db.prepare('SELECT data FROM repositories WHERE user_id=?').all(id)).map(r=>{const d=parse(r.data);return {id:d.id,name:d.fullName,source:d.source||'github',files:d.files?.length||0,explained:!!d.analysis,explainedAt:d.analysis?.created||null};});
  const names=new Map(repos.map(r=>[r.id,r.name]));
  const questions=(await db.prepare("SELECT repo_id,content,created FROM conversations WHERE user_id=? AND role='user' ORDER BY created DESC LIMIT 30").all(id)).map(q=>({app:names.get(q.repo_id)||'Deleted app',question:String(q.content).slice(0,500),at:Number(q.created)}));
  const progress=parse((await db.prepare('SELECT data FROM progress WHERE user_id=?').get(id))?.data);
  const ids=await db.prepare('SELECT provider FROM identities WHERE user_id=?').all(id);
  return {plan:await plans.planOf(u.id,u.email),...await plans.summary(u.id),id:u.id,email:u.email,created:Number(u.created),signIn:ids.length?ids.map(i=>i.provider):['email'],quizzesPassed:Array.isArray(progress.quizPasses)?progress.quizPasses.length:0,projects,apps:repos,questions};
 }

 return {list,detail};
}
