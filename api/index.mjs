import {createApplication} from '../backend/app.mjs';
let app;
export default async function handler(req,res){
 try{
  // Never listen on a port or create local files in the Vercel function.
  app ||= createApplication();
  await app.handler(req,res);
 }catch{
  console.error('Backend configuration failed. Check DATABASE_URL, TOKEN_ENCRYPTION_KEY and APP_ORIGIN.');
  res.writeHead(503,{'Content-Type':'application/json','Cache-Control':'no-store'});
  res.end(JSON.stringify({error:'Backend setup is incomplete. Configure DATABASE_URL, TOKEN_ENCRYPTION_KEY and APP_ORIGIN in Vercel, then redeploy.'}));
 }
}
