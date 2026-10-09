import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,existsSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {randomBytes,createCipheriv,createDecipheriv,createHash} from 'node:crypto';
export const hash=value=>createHash('sha256').update(value).digest('hex');
export function createStore(config){
 mkdirSync(config.dataDir,{recursive:true});
 const db=new DatabaseSync(config.database||join(config.dataDir,'apexelerate.sqlite'));
 db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
 CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL,created INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),csrf TEXT NOT NULL,expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS projects(id TEXT NOT NULL,user_id TEXT NOT NULL REFERENCES users(id),data TEXT NOT NULL,PRIMARY KEY(id,user_id));
 CREATE TABLE IF NOT EXISTS github(user_id TEXT PRIMARY KEY REFERENCES users(id),token TEXT NOT NULL,login TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS oauth(state TEXT PRIMARY KEY,session_id TEXT NOT NULL,verifier TEXT NOT NULL,expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS repositories(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),data TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS conversations(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),repo_id TEXT NOT NULL REFERENCES repositories(id),role TEXT NOT NULL,content TEXT NOT NULL,created INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS quizzes(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),repo_id TEXT NOT NULL REFERENCES repositories(id),data TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS progress(user_id TEXT PRIMARY KEY REFERENCES users(id),data TEXT NOT NULL);
 `);
 const keyPath=join(config.dataDir,'token.key');if(!existsSync(keyPath))writeFileSync(keyPath,randomBytes(32),{flag:'wx',mode:0o600});const key=readFileSync(keyPath);if(key.length!==32)throw new Error('Invalid token encryption key');
 function encrypt(value){const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',key,iv);return [iv.toString('base64'),Buffer.concat([c.update(value,'utf8'),c.final()]).toString('base64'),c.getAuthTag().toString('base64')].join('.');}
 function decrypt(value){const [iv,body,tag]=value.split('.').map(x=>Buffer.from(x,'base64'));const c=createDecipheriv('aes-256-gcm',key,iv);c.setAuthTag(tag);return Buffer.concat([c.update(body),c.final()]).toString('utf8');}
 return {db,encrypt,decrypt};
}
