import {createApplication} from '../backend/app.mjs';
import {ConfigurationError} from '../backend/config.mjs';
let app;
export default async function handler(req,res){
 try{
  // Never listen on a port or create local files in the Vercel function.
  app ||= createApplication();
  await app.handler(req,res);
 }catch(e){
  const error=e instanceof ConfigurationError?`${e.field} is missing or invalid. Check its Production value and redeploy.`:'Backend setup is incomplete. Configure DATABASE_URL, TOKEN_ENCRYPTION_KEY and APP_ORIGIN in Vercel, then redeploy.';
  console.error(error);
  res.writeHead(503,{'Content-Type':'application/json','Cache-Control':'no-store'});
  res.end(JSON.stringify({error}));
 }
}
