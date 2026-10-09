import {createRequire} from 'node:module';
import {mkdirSync,existsSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {randomBytes,createCipheriv,createDecipheriv,createHash} from 'node:crypto';
import pg from 'pg';
const require=createRequire(import.meta.url);
export const hash=value=>createHash('sha256').update(value).digest('hex');
export const schema=` CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL,created BIGINT NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),csrf TEXT NOT NULL,expires BIGINT NOT NULL);
 CREATE TABLE IF NOT EXISTS projects(id TEXT NOT NULL,user_id TEXT NOT NULL REFERENCES users(id),data TEXT NOT NULL,PRIMARY KEY(id,user_id));
 CREATE TABLE IF NOT EXISTS github(user_id TEXT PRIMARY KEY REFERENCES users(id),token TEXT NOT NULL,login TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS oauth(state TEXT PRIMARY KEY,session_id TEXT NOT NULL,verifier TEXT NOT NULL,expires BIGINT NOT NULL);
 CREATE TABLE IF NOT EXISTS repositories(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),data TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS conversations(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),repo_id TEXT NOT NULL REFERENCES repositories(id),role TEXT NOT NULL,content TEXT NOT NULL,created BIGINT NOT NULL);
 CREATE TABLE IF NOT EXISTS quizzes(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),repo_id TEXT NOT NULL REFERENCES repositories(id),data TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS progress(user_id TEXT PRIMARY KEY REFERENCES users(id),data TEXT NOT NULL);

 CREATE TABLE IF NOT EXISTS rate_limits(key TEXT PRIMARY KEY,count INTEGER NOT NULL,expires BIGINT NOT NULL);
 CREATE INDEX IF NOT EXISTS session_expiry ON sessions(expires);
 CREATE INDEX IF NOT EXISTS conversation_history ON conversations(repo_id,user_id,created);`;
// Queries are internal literals; user values remain separately bound parameters.
export function postgresQuery(sql){let n=0;return sql.replace(/\?/g,()=>`$${++n}`);}
export function createStore(config,options={}){
 let db,key;
 if(config.databaseUrl){
  if(!/^[a-fA-F0-9]{64}$/.test(config.tokenKey||''))throw new Error('Configure a stable TOKEN_ENCRYPTION_KEY before using Postgres.');
  key=Buffer.from(config.tokenKey,'hex');
  const pool=options.pool||new pg.Pool({connectionString:config.databaseUrl,max:3,idleTimeoutMillis:10000,connectionTimeoutMillis:10000,query_timeout:20000,allowExitOnIdle:true});
  pool.on?.('error',()=>console.error('An idle database connection failed.'));
  let initialized;
  async function initialize(){
   const client=await pool.connect();
   try{
    await client.query('BEGIN');
    // Serialize schema creation across simultaneous serverless cold starts.
    await client.query('SELECT pg_advisory_xact_lock(741092831)');
    await client.query(schema);
    await client.query('COMMIT');
   }catch(e){await client.query('ROLLBACK').catch(()=>{});throw e;}finally{client.release();}
  }
  async function query(sql,args){
   if(!initialized)initialized=initialize().catch(e=>{initialized=undefined;throw e;});
   await initialized;
   return pool.query(postgresQuery(sql),args);
  }
  db={prepare(sql){return {async get(...args){return (await query(sql,args)).rows[0];},async all(...args){return (await query(sql,args)).rows;},async run(...args){return {changes:(await query(sql,args)).rowCount};}};},close:()=>pool.end()};
 }else{
  if(process.env.VERCEL)throw new Error('Vercel requires hosted Postgres; local SQLite is disabled.');
  const {DatabaseSync}=require('node:sqlite');
  mkdirSync(config.dataDir,{recursive:true});
  db=new DatabaseSync(config.database||join(config.dataDir,'apexelerate.sqlite'));
  db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;'+schema);
  const keyPath=join(config.dataDir,'token.key');
  if(!existsSync(keyPath))writeFileSync(keyPath,randomBytes(32),{flag:'wx',mode:0o600});
  key=readFileSync(keyPath);if(key.length!==32)throw new Error('Invalid token encryption key');
 }
 function encrypt(value){const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',key,iv);return [iv.toString('base64'),Buffer.concat([c.update(value,'utf8'),c.final()]).toString('base64'),c.getAuthTag().toString('base64')].join('.');}
 function decrypt(value){const [iv,body,tag]=value.split('.').map(x=>Buffer.from(x,'base64'));const c=createDecipheriv('aes-256-gcm',key,iv);c.setAuthTag(tag);return Buffer.concat([c.update(body),c.final()]).toString('utf8');}
 return {db,encrypt,decrypt};
}
