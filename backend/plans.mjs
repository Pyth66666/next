// Plans, monthly lesson-scan limits and the AI usage log.
// New accounts start as "pending" until an admin approves them as basic or pro.
import {randomUUID} from 'node:crypto';
import {ApiError} from './providers.mjs';

export const PLANS={
 pending:{label:'Waiting for approval',scans:0,full:false},
 basic:{label:'Basic',scans:10,full:false},
 pro:{label:'Pro',scans:30,full:true}
};
export const FULL_SCAN_CREDITS=3;
export const planNames=Object.keys(PLANS);

const monthStart=(now=Date.now())=>{const d=new Date(now);return Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),1);};
const tokens=u=>({prompt:Number(u?.prompt_tokens||0),completion:Number(u?.completion_tokens||0)+Number(u?.thinking_tokens||0)});

export function plansStore({db,isAdmin}){
 async function planOf(userId,email){
  if(isAdmin(userId,email))return 'pro';
  const row=await db.prepare('SELECT plan FROM plans WHERE user_id=?').get(userId);
  return PLANS[row?.plan]?row.plan:'pending';
 }
 async function setPlan(userId,plan){
  if(!PLANS[plan])throw new ApiError(400,'Choose pending, basic or pro.');
  if(!(await db.prepare('SELECT id FROM users WHERE id=?').get(userId)))throw new ApiError(404,'User not found.');
  await db.prepare('INSERT INTO plans VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET plan=excluded.plan,updated=excluded.updated').run(userId,plan,Date.now());
 }
 async function creditsUsed(userId,since=monthStart()){
  return Number((await db.prepare("SELECT COALESCE(SUM(credits),0) AS n FROM ai_usage WHERE user_id=? AND created>=? AND kind LIKE 'scan-%'").get(userId,since))?.n||0);
 }
 // What this person may do right now; shown on the lesson start card.
 async function status(userId,email){
  const plan=await planOf(userId,email),p=PLANS[plan],admin=isAdmin(userId,email),used=await creditsUsed(userId);
  return {plan,label:admin?'Admin':p.label,used,limit:admin?null:p.scans,canFull:p.full,fullCredits:FULL_SCAN_CREDITS};
 }
 // Throws unless the scan is allowed; returns the credits it will use.
 async function checkScan(userId,email,kind){
  const s=await status(userId,email),credits=kind==='full'?FULL_SCAN_CREDITS:1;
  if(s.plan==='pending')throw new ApiError(403,'Your account is waiting for approval. You can make lessons once it’s approved.');
  if(kind==='full'&&!s.canFull)throw new ApiError(403,'Full scan is part of the Pro plan.');
  if(s.limit!==null&&s.used+credits>s.limit)throw new ApiError(429,`You’ve used ${s.used} of ${s.limit} scans this month.`);
  return credits;
 }
 async function record(userId,kind,usage,credits=0){
  const t=tokens(usage);
  await db.prepare('INSERT INTO ai_usage VALUES(?,?,?,?,?,?,?)').run(randomUUID(),userId,kind,credits,t.prompt,t.completion,Date.now());
 }
 // Per-user totals for the admin page.
 async function summary(userId){
  const since=monthStart(),q=sql=>db.prepare(sql).get(userId,since);
  const month=await q('SELECT COALESCE(SUM(prompt_tokens+completion_tokens),0) AS n FROM ai_usage WHERE user_id=? AND created>=?');
  return {scansThisMonth:await creditsUsed(userId,since),tokensThisMonth:Number(month?.n||0),tokensAllTime:Number((await db.prepare('SELECT COALESCE(SUM(prompt_tokens+completion_tokens),0) AS n FROM ai_usage WHERE user_id=?').get(userId))?.n||0)};
 }
 return {planOf,setPlan,status,checkScan,record,summary};
}

// Short name for a request path, used as the usage "kind" for non-scan AI calls.
export const usageKind=path=>path.replace(/^\/api\//,'').replace(/\/[0-9a-f-]{36}/g,'').replace(/[^a-z/-]/g,'').slice(0,60)||'ai';
