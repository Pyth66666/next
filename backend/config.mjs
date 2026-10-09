import {resolve} from 'node:path';
export function configuration(env=process.env){
 const origin=env.APP_ORIGIN||'http://localhost:4174';const url=new URL(origin);
 if(!['http:','https:'].includes(url.protocol)||url.pathname!=='/'||url.search||url.hash||url.username||url.password||(!['localhost','127.0.0.1'].includes(url.hostname)&&url.protocol!=='https:'))throw new Error('APP_ORIGIN must be an HTTPS origin or a localhost HTTP origin');
 const base=env.NVIDIA_BASE_URL||'https://integrate.api.nvidia.com/v1';
 if(new URL(base).protocol!=='https:')throw new Error('NVIDIA_BASE_URL must use HTTPS');
 return {origin:url.origin,port:Number(env.PORT||url.port||4174),host:env.HOST||'127.0.0.1',dataDir:resolve(env.DATA_DIR||'data'),database:env.DATABASE_PATH,nvidiaKey:env.NVIDIA_API_KEY||'',model:env.NVIDIA_MODEL||'',nvidiaBase:base.replace(/\/$/,''),githubId:env.GITHUB_CLIENT_ID||'',githubSecret:env.GITHUB_CLIENT_SECRET||'',secure:url.protocol==='https:',maxFiles:60,maxChars:240000};
}
