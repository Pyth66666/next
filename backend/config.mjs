import {resolve} from 'node:path';
export class ConfigurationError extends Error{
 constructor(field,message){super(message);this.name='ConfigurationError';this.field=field;}
}
export function configuration(env=process.env){
 if(env.VERCEL&&!env.DATABASE_URL)throw new ConfigurationError('DATABASE_URL','Set DATABASE_URL to a hosted Postgres connection string in Vercel.');
 if(env.VERCEL&&!env.APP_ORIGIN)throw new ConfigurationError('APP_ORIGIN','Set APP_ORIGIN to your public HTTPS website origin in Vercel.');
 if(env.DATABASE_URL&&!/^postgres(?:ql)?:\/\//.test(env.DATABASE_URL))throw new ConfigurationError('DATABASE_URL','DATABASE_URL must be a Postgres connection string.');
 if(env.DATABASE_URL&&!/^[a-fA-F0-9]{64}$/.test(env.TOKEN_ENCRYPTION_KEY||''))throw new ConfigurationError('TOKEN_ENCRYPTION_KEY','TOKEN_ENCRYPTION_KEY must contain exactly 64 hexadecimal characters.');
 const origin=env.APP_ORIGIN||'http://localhost:4174';let url;
 try{url=new URL(origin);}catch{throw new ConfigurationError('APP_ORIGIN','APP_ORIGIN must be a valid HTTPS origin.');}
 if(!['http:','https:'].includes(url.protocol)||url.pathname!=='/'||url.search||url.hash||url.username||url.password||(!['localhost','127.0.0.1'].includes(url.hostname)&&url.protocol!=='https:'))throw new ConfigurationError('APP_ORIGIN','APP_ORIGIN must be an HTTPS origin or a localhost HTTP origin');
 const requestedProvider=env.AI_PROVIDER||'gemini';
 const PROVIDERS=['gemini','nvidia','anthropic'];
 let provider=PROVIDERS.includes(requestedProvider)?requestedProvider:null;
 let aiConfigurationError=provider?null:'AI_PROVIDER must be gemini, nvidia or anthropic.';
 // Each provider keeps its own model, so a backup provider can run with its own settings.
 const models={gemini:(env.GEMINI_MODEL||'gemini-3.5-flash-lite').replace(/^models\//,''),nvidia:env.NVIDIA_MODEL||'',anthropic:env.ANTHROPIC_MODEL||''};
 const model=provider?models[provider]:'';
 if(provider==='gemini'&&!/^gemini-[a-zA-Z0-9.-]+$/.test(model)){provider=null;aiConfigurationError='GEMINI_MODEL must be a Gemini model ID.';}
 const base=env.NVIDIA_BASE_URL||'https://integrate.api.nvidia.com/v1';
 const https=u=>{try{return new URL(u).protocol==='https:';}catch{return false;}};
 if(provider==='nvidia'&&!https(base)){provider=null;aiConfigurationError='NVIDIA_BASE_URL must use HTTPS.';}
 const anthropicBase=(env.ANTHROPIC_BASE_URL||'https://api.anthropic.com').replace(/\/$/,'');
 if(provider==='anthropic'&&!https(anthropicBase)){provider=null;aiConfigurationError='ANTHROPIC_BASE_URL must use HTTPS.';}
 // Optional backup: used automatically when the main provider fails or is busy.
 const fb=env.AI_FALLBACK_PROVIDER||'';
 const fallbackProvider=PROVIDERS.includes(fb)&&fb!==provider&&!(fb==='nvidia'&&!https(base))&&!(fb==='anthropic'&&!https(anthropicBase))?fb:null;
 return {adminUserIds:(env.ADMIN_USER_IDS||'').split(',').map(x=>x.trim()).filter(Boolean),adminEmails:(env.ADMIN_EMAILS||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean),defaultPlan:['pending','basic','pro'].includes(env.DEFAULT_PLAN)?env.DEFAULT_PLAN:'pending',origin:url.origin,port:Number(env.PORT||url.port||4174),host:env.HOST||'127.0.0.1',dataDir:resolve(env.DATA_DIR||'data'),database:env.DATABASE_PATH,databaseUrl:env.DATABASE_URL||'',tokenKey:env.TOKEN_ENCRYPTION_KEY||'',provider,aiConfigurationError,geminiKey:env.GEMINI_API_KEY||'',nvidiaKey:env.NVIDIA_API_KEY||'',model,models,fallbackProvider,nvidiaBase:base.replace(/\/$/,''),anthropicKey:env.ANTHROPIC_API_KEY||'',anthropicBase,githubId:env.GITHUB_CLIENT_ID||'',githubSecret:env.GITHUB_CLIENT_SECRET||'',googleId:env.GOOGLE_CLIENT_ID||'',googleSecret:env.GOOGLE_CLIENT_SECRET||'',resendKey:env.RESEND_API_KEY||'',productHuntToken:env.PRODUCT_HUNT_TOKEN||'',emailFrom:env.EMAIL_FROM||'',secure:url.protocol==='https:',maxFiles:60,maxChars:240000};
}
