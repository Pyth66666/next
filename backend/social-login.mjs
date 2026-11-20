// Sign in with Google or GitHub (OAuth authorization code flow with PKCE).
// A verified email from the provider either finds the matching account or creates one.
import {randomBytes,randomUUID} from 'node:crypto';
import {ApiError,jsonFetch} from './providers.mjs';

const PROVIDERS={
 google:{
  authorize:'https://accounts.google.com/o/oauth2/v2/auth',
  token:'https://oauth2.googleapis.com/token',
  scope:'openid email',
  id:c=>c.googleId,secret:c=>c.googleSecret
 },
 github:{
  authorize:'https://github.com/login/oauth/authorize',
  token:'https://github.com/login/oauth/access_token',
  scope:'read:user user:email',
  id:c=>c.githubId,secret:c=>c.githubSecret
 }
};

export const loginProviders=config=>Object.keys(PROVIDERS).filter(p=>PROVIDERS[p].id(config)&&PROVIDERS[p].secret(config));

// Only same-page routes like "#dashboard" or "#code/abc-123" are accepted as a return place.
const safeNext=v=>typeof v==='string'&&/^#[a-zA-Z0-9/_-]{0,80}$/.test(v)?v:'#dashboard';

export function socialLogin({config,db,store,service,hash,scrypt,newSession}){
 const callbackUrl=p=>`${config.origin}/api/auth/${p}/callback`;
 const fail=(res,code)=>{res.writeHead(302,{Location:`/?login_error=${code}#account`});res.end();};

 async function start(provider,url,res){
  const p=PROVIDERS[provider];if(!loginProviders(config).includes(provider))throw new ApiError(503,`Sign in with ${provider} is not switched on.`);
  const state=randomBytes(32).toString('hex'),verifier=randomBytes(32).toString('base64url');
  await db.prepare('DELETE FROM login_states WHERE expires<?').run(Date.now());
  await db.prepare('INSERT INTO login_states VALUES(?,?,?,?,?)').run(hash(state),provider,verifier,safeNext(url.searchParams.get('next')),Date.now()+600000);
  const auth=new URL(p.authorize);
  auth.search=new URLSearchParams({client_id:p.id(config),redirect_uri:callbackUrl(provider),response_type:'code',scope:p.scope,state,
   code_challenge:Buffer.from(hash(verifier),'hex').toString('base64url'),code_challenge_method:'S256',...(provider==='google'?{prompt:'select_account'}:{})}).toString();
  res.writeHead(302,{Location:auth.href});res.end();
 }

 async function exchange(provider,code,verifier){
  const p=PROVIDERS[provider],fields={client_id:p.id(config),client_secret:p.secret(config),code,code_verifier:verifier,redirect_uri:callbackUrl(provider),grant_type:'authorization_code'};
  const t=await jsonFetch(p.token,{method:'POST',headers:{Accept:'application/json','Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(fields).toString()},service.fetcher);
  if(!t.access_token)throw new ApiError(502,'No access token.');
  return t.access_token;
 }

 // Returns {subject,email,login?} with a provider-verified email, or null.
 async function profile(provider,token){
  if(provider==='google'){
   const me=await jsonFetch('https://openidconnect.googleapis.com/v1/userinfo',{headers:{Authorization:`Bearer ${token}`}},service.fetcher);
   return me.sub&&me.email&&me.email_verified===true?{subject:String(me.sub),email:String(me.email).toLowerCase()}:null;
  }
  const me=await service.github('/user',token),emails=await service.github('/user/emails',token).catch(()=>[]);
  const primary=Array.isArray(emails)?emails.find(e=>e.primary&&e.verified)||emails.find(e=>e.verified):null;
  return me?.id&&primary?.email?{subject:String(me.id),email:String(primary.email).toLowerCase(),login:me.login}:null;
 }

 async function userFor(provider,who){
  const linked=await db.prepare('SELECT u.id,u.email FROM identities i JOIN users u ON u.id=i.user_id WHERE i.provider=? AND i.subject=?').get(provider,who.subject);
  if(linked)return linked;
  let user=await db.prepare('SELECT id,email FROM users WHERE email=?').get(who.email);
  if(!user){
   // No password is known for this account; "Forgot password" can set one later.
   const id=randomUUID(),salt=randomBytes(16).toString('hex'),key=await scrypt(randomBytes(48).toString('hex'),salt,64);
   await db.prepare('INSERT INTO users VALUES(?,?,?,?)').run(id,who.email,`${salt}:${key.toString('hex')}`,Date.now());
   user={id,email:who.email};
  }
  await db.prepare('INSERT INTO identities VALUES(?,?,?) ON CONFLICT(provider,subject) DO NOTHING').run(provider,who.subject,user.id);
  return user;
 }

 async function callback(provider,url,res){
  if(!PROVIDERS[provider])throw new ApiError(404,'Not found.');
  const row=await db.prepare('DELETE FROM login_states WHERE state=? AND provider=? AND expires>? RETURNING *').get(hash(url.searchParams.get('state')||''),provider,Date.now());
  if(!row)return fail(res,'expired');
  const code=url.searchParams.get('code');if(!code)return fail(res,'cancelled');
  let token,who;
  try{token=await exchange(provider,code,row.verifier);who=await profile(provider,token);}catch{return fail(res,'failed');}
  if(!who)return fail(res,'no_email');
  const user=await userFor(provider,who);
  // Signing in with GitHub also connects GitHub for importing projects.
  if(provider==='github'&&who.login)await db.prepare('INSERT INTO github VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET token=excluded.token,login=excluded.login').run(user.id,store.encrypt(token),who.login);
  await newSession(res,user);
  res.writeHead(302,{Location:'/'+row.next});res.end();
 }

 return {start,callback};
}
