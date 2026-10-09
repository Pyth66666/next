import {resolve} from 'node:path';
export function configuration(env=process.env){
 if(env.VERCEL&&!env.DATABASE_URL)throw new Error('Set DATABASE_URL to a hosted Postgres connection string in Vercel.');
 if(env.VERCEL&&!env.APP_ORIGIN)throw new Error('Set APP_ORIGIN to your public HTTPS website origin in Vercel.');
 if(env.DATABASE_URL&&!/^postgres(?:ql)?:\/\//.test(env.DATABASE_URL))throw new Error('DATABASE_URL must be a Postgres connection string.');
 if(env.DATABASE_URL&&!/^[a-fA-F0-9]{64}$/.test(env.TOKEN_ENCRYPTION_KEY||''))throw new Error('TOKEN_ENCRYPTION_KEY must contain exactly 64 hexadecimal characters.');
 const origin=env.APP_ORIGIN||'http://localhost:4174';const url=new URL(origin);
 if(!['http:','https:'].includes(url.protocol)||url.pathname!=='/'||url.search||url.hash||url.username||url.password||(!['localhost','127.0.0.1'].includes(url.hostname)&&url.protocol!=='https:'))throw new Error('APP_ORIGIN must be an HTTPS origin or a localhost HTTP origin');
 const base=env.NVIDIA_BASE_URL||'https://integrate.api.nvidia.com/v1';
 if(new URL(base).protocol!=='https:')throw new Error('NVIDIA_BASE_URL must use HTTPS');
 return {origin:url.origin,port:Number(env.PORT||url.port||4174),host:env.HOST||'127.0.0.1',dataDir:resolve(env.DATA_DIR||'data'),database:env.DATABASE_PATH,databaseUrl:env.DATABASE_URL||'',tokenKey:env.TOKEN_ENCRYPTION_KEY||'',nvidiaKey:env.NVIDIA_API_KEY||'',model:env.NVIDIA_MODEL||'',nvidiaBase:base.replace(/\/$/,''),githubId:env.GITHUB_CLIENT_ID||'',githubSecret:env.GITHUB_CLIENT_SECRET||'',secure:url.protocol==='https:',maxFiles:60,maxChars:240000};
}
