import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync,existsSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {createStore,postgresQuery,countPlaceholders} from '../backend/store.mjs';
import {createApplication} from '../backend/app.mjs';
import {configuration} from '../backend/config.mjs';
import vercelHandler from '../api/index.mjs';

test('Vercel configuration requires persistent storage, a stable key and explicit origin',()=>{
 assert.throws(()=>configuration({VERCEL:'1'}),/DATABASE_URL/);
 assert.throws(()=>configuration({VERCEL:'1',DATABASE_URL:'postgres://fixture/db'}),/APP_ORIGIN/);
 assert.throws(()=>configuration({DATABASE_URL:'postgres://fixture/db'}),/TOKEN_ENCRYPTION_KEY/);
 assert.throws(()=>configuration({DATABASE_URL:'https://fixture/db'}),/Postgres/);
 const c=configuration({VERCEL:'1',APP_ORIGIN:'https://apexelerate.vercel.app',DATABASE_URL:'postgres://fixture/db',TOKEN_ENCRYPTION_KEY:'ab'.repeat(32)});
 assert.equal(c.secure,true);assert.equal(c.databaseUrl,'postgres://fixture/db');
 assert.equal(postgresQuery('SELECT * FROM projects WHERE id=? AND user_id=?'),'SELECT * FROM projects WHERE id=$1 AND user_id=$2');
 const deploy=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url)));
 assert.equal(deploy.framework,null);assert.equal(deploy.outputDirectory,'public');
 assert.equal(deploy.rewrites[0].destination,'/api/index');
 assert.ok(deploy.functions['api/index.mjs'].maxDuration>=120);
});

test('placeholder rewriting numbers every ? in order and counts them consistently',()=>{
 assert.equal(postgresQuery('SELECT * FROM t WHERE a=? AND b=?'),'SELECT * FROM t WHERE a=$1 AND b=$2');
 assert.equal(postgresQuery('SELECT 1'),'SELECT 1');
 assert.equal(countPlaceholders('INSERT INTO rate_limits VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN rate_limits.expires<=? THEN 1 ELSE rate_limits.count+1 END,expires=CASE WHEN rate_limits.expires<=? THEN excluded.expires ELSE rate_limits.expires END RETURNING count'),4);
 assert.equal(countPlaceholders('SELECT 1'),0);
 // Every placeholder in the source must receive a bound argument.
 const mismatch='SELECT * FROM t WHERE a=? AND b=?';
 assert.notEqual(countPlaceholders(mismatch),1);
});

test('a placeholder/argument mismatch is rejected before reaching the database',async()=>{
 let queried=false;
 const pool={async connect(){return {async query(){return {rows:[]};},release(){}};},async query(){queried=true;return {rows:[],rowCount:0};},async end(){}};
 const store=createStore({databaseUrl:'postgres://fixture/db',tokenKey:'ab'.repeat(32)},{pool});
 await assert.rejects(store.db.prepare('SELECT * FROM t WHERE a=? AND b=?').get('only-one'),/placeholder mismatch/i);
 assert.equal(queried,false);
});

test('serverless configuration failure returns actionable JSON, not an invocation crash',async()=>{
 const previous=process.env.VERCEL,previousUrl=process.env.DATABASE_URL;
 process.env.VERCEL='1';delete process.env.DATABASE_URL;
 let status,result;const headers={};
 try{await vercelHandler({},{writeHead(s,h){status=s;Object.assign(headers,h);},end(s){result=JSON.parse(s);}});}finally{if(previous===undefined)delete process.env.VERCEL;else process.env.VERCEL=previous;if(previousUrl===undefined)delete process.env.DATABASE_URL;else process.env.DATABASE_URL=previousUrl;}
 assert.equal(status,503);assert.match(result.error,/DATABASE_URL/);assert.equal(headers['Cache-Control'],'no-store');
});

test('configuration errors identify the field without echoing its secret value',()=>{
 const secret='private-value-do-not-echo';
 for(const [field,env]of [['TOKEN_ENCRYPTION_KEY',{DATABASE_URL:'postgres://fixture/db',TOKEN_ENCRYPTION_KEY:secret}],['APP_ORIGIN',{APP_ORIGIN:secret}]]){
  assert.throws(()=>configuration(env),e=>e.field===field&&!e.message.includes(secret));
 }
 const ai=configuration({GEMINI_MODEL:secret+'/bad'});
 assert.equal(ai.provider,null);assert.equal(ai.aiConfigurationError.includes(secret),false);
});

test('Postgres-backed API persists accounts, projects, source tutoring and encrypted GitHub tokens across instances',async t=>{
 const engine=new PGlite();
 // Embedded real Postgres SQL engine; transport is injected, not a live hosted DB.
 const calls=[];
 const pool={async connect(){return {async query(sql){calls.push(sql);return (await engine.exec(sql)).at(-1);},release(){}};},async query(sql,args){calls.push(sql);const r=await engine.query(sql,args);return {rows:r.rows,rowCount:r.affectedRows};},async end(){}};
 const config={...configuration({APP_ORIGIN:'https://apexelerate.vercel.app',DATABASE_URL:'postgres://fixture/db',TOKEN_ENCRYPTION_KEY:'ab'.repeat(32)}),dataDir:'/not-a-writable-directory',githubId:'client',githubSecret:'secret'};
 const service={async ai(system,prompt){return {text:prompt.startsWith('Create one')?JSON.stringify({question:'What is exported?',options:['greet','database','cookie'],answer:0,explanation:'src/app.js:1 exports greet.',source:'src/app.js'}):'src/app.js:1 exports greet. Verify runtime separately.',model:'fixture'};},async github(path){if(path==='/user')return {login:'fixture-user'};if(path==='/repos/demo/mvp')return {full_name:'demo/mvp',default_branch:'main'};if(path.includes('/commits/'))return {sha:'commit1',commit:{tree:{sha:'tree1'}}};if(path.includes('/git/trees/'))return {tree:[{type:'blob',path:'src/app.js',sha:'blob1',size:50}]};if(path.includes('/git/blobs/'))return {encoding:'base64',content:Buffer.from('export const greet = () => "Hello";').toString('base64')};throw Error(path);},async fetcher(){return new Response(JSON.stringify({access_token:'fixture-private-github-token'}));}};
 const store=createStore(config,{pool});
 const apps=[createApplication({config,store,providers:service}),createApplication({config,store:createStore(config,{pool}),providers:service})];
 // Vercel's Node API adapter can supply a pre-parsed request.body.
 apps[1].server=http.createServer(async(req,res)=>{let raw='';for await(const chunk of req)raw+=chunk;req.body=raw?JSON.parse(raw):undefined;await apps[1].handler(req,res);});
 for(const app of apps)await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
 t.after(async()=>{for(const app of apps)await new Promise(r=>app.server.close(r));await engine.close();});
 let cookie='',csrf='';
 async function request(path,method='GET',body,instance=0){const res=await fetch(`http://127.0.0.1:${apps[instance].server.address().port}${path}`,{method,redirect:'manual',headers:{Origin:config.origin,Cookie:cookie,'X-CSRF-Token':csrf,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});if(res.headers.get('set-cookie')){assert.match(res.headers.get('set-cookie'),/Secure/);cookie=res.headers.get('set-cookie').split(';')[0];}const raw=await res.text();let value;try{value=JSON.parse(raw);}catch{value=raw;}if(value?.csrf)csrf=value.csrf;return {status:res.status,value,headers:res.headers};}
 assert.equal((await request('/api/auth/register','POST',{email:'one@example.com',password:'long test password'})).status,200);
 assert.equal((await request('/api/auth/me','GET',undefined,1)).value.user.email,'one@example.com');
 assert.equal((await request('/api/auth/register','POST',{email:'one@example.com',password:'long test password'})).status,409);
 const project={answers:['User','Problem','Outcome','Constraints','Success'],tasks:[],output:'MVP brief',type:'mvp'};
 assert.equal((await request('/api/projects/project1','PUT',project)).status,200);
 assert.equal((await request('/api/projects/project1','GET',undefined,1)).value.output,'MVP brief');
 project.output='Updated brief';await request('/api/projects/project1','PUT',project,1);
 assert.equal((await request('/api/projects')).value[0].output,'Updated brief');
 const start=await request('/api/github/start');const state=new URL(start.headers.get('location')).searchParams.get('state');
 const callback='/api/github/callback?code=test&state='+state;
 const callbacks=await Promise.all([request(callback),request(callback,'GET',undefined,1)]);
 assert.deepEqual(callbacks.map(r=>r.status).sort(),[302,400]);
 const token=(await store.db.prepare('SELECT token FROM github').get()).token;
 assert.ok(!token.includes('fixture-private'));assert.equal(apps[1].store.decrypt(token),'fixture-private-github-token');
 const imported=await request('/api/repositories','POST',{repository:'demo/mvp'});assert.equal(imported.status,201);const id=imported.value.id;
 assert.equal((await request('/api/repositories/'+id+'/analysis','POST',{},1)).status,200);
 assert.equal((await request('/api/repositories/'+id+'/chat','POST',{question:'Explain greet'})).status,200);
 assert.equal((await request('/api/repositories/'+id+'/history','GET',undefined,1)).value.length,2);
 const quiz=await request('/api/repositories/'+id+'/quiz','POST',{});
 assert.equal(quiz.status,200);assert.equal(quiz.value.answer,undefined);
 assert.equal((await request('/api/repositories/'+id+'/answer','POST',{id:quiz.value.id,answer:0},1)).value.correct,true);
 assert.equal((await request('/api/progress')).value.quizPasses.length,1);
 assert.equal((await request('/api/auth/logout','POST',{})).status,200);
 assert.equal((await request('/api/auth/me','GET',undefined,1)).value.user,null);
 assert.equal((await request('/api/auth/login','POST',{email:'one@example.com',password:'long test password'},1)).status,200);
 assert.equal((await request('/api/projects')).value.length,1);
 const savedCookie=cookie;cookie='';
 await request('/api/auth/register','POST',{email:'two@example.com',password:'long test password'});
 assert.equal((await request('/api/projects/project1')).status,404);
 cookie=savedCookie;
 assert.ok(calls.some(s=>s.includes('$1')));assert.ok(calls.some(s=>s.includes('pg_advisory_xact_lock')));
 assert.equal(existsSync(config.dataDir),false);
 // Shared rate limits survive changing function instance.
 await store.db.prepare('UPDATE rate_limits SET count=? WHERE key LIKE ?').run(20,'auth:%');
 assert.equal((await request('/api/auth/login','POST',{email:'one@example.com',password:'long test password'},1)).status,429);
});

test('Postgres rate limiting counts within a window, resets after expiry and indexes expiry',async()=>{
 const engine=new PGlite();
 const calls=[];
 const pool={async connect(){return {async query(sql){calls.push(sql);return (await engine.exec(sql)).at(-1);},release(){}};},async query(sql,args){calls.push(sql);const r=await engine.query(sql,args);return {rows:r.rows,rowCount:r.affectedRows};},async end(){}};
 const config={...configuration({APP_ORIGIN:'https://apexelerate.vercel.app',DATABASE_URL:'postgres://fixture/db',TOKEN_ENCRYPTION_KEY:'ab'.repeat(32)}),dataDir:'/not-a-writable-directory'};
 const store=createStore(config,{pool});
 const upsert='INSERT INTO rate_limits VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN rate_limits.expires<=? THEN 1 ELSE rate_limits.count+1 END,expires=CASE WHEN rate_limits.expires<=? THEN excluded.expires ELSE rate_limits.expires END RETURNING count';
 try{
  const now=Date.now(),window=600000;
  // Within a live window the returned count increments rather than resetting.
  const counts=[];
  for(let i=1;i<=5;i++)counts.push((await store.db.prepare(upsert).get('ping:fixture',now+window,now,now)).count);
  assert.deepEqual(counts,[1,2,3,4,5]);
  assert.equal((await store.db.prepare('SELECT count FROM rate_limits WHERE key=?').get('ping:fixture')).count,5);
  // A lapsed window restarts at 1 instead of continuing from the stale count.
  await store.db.prepare('UPDATE rate_limits SET expires=? WHERE key=?').run(now-1,'ping:fixture');
  assert.equal((await store.db.prepare(upsert).get('ping:fixture',now+window,now,now)).count,1);
  // Expired rows are swept by the cleanup statement, and the expiry index exists.
  await store.db.prepare('INSERT INTO rate_limits VALUES(?,?,?)').run('stale:fixture',1,now-1);
  await store.db.prepare('DELETE FROM rate_limits WHERE expires<?').run(now);
  const remaining=await store.db.prepare('SELECT key FROM rate_limits').all();
  assert.deepEqual(remaining.map(r=>r.key),['ping:fixture']);
  assert.equal((await engine.query(`SELECT indexname FROM pg_indexes WHERE tablename='rate_limits' AND indexname='rate_limit_expiry'`)).rows.length,1);
  // The Postgres transport received native $n placeholders, never the '?' source form.
  assert.ok(calls.some(s=>s.includes('$1')&&s.includes('rate_limits')));
  assert.ok(calls.every(s=>!s.includes('?')));
 }finally{await engine.close();}
});

test('Postgres initialization is shared, retries after failure and releases connections',async()=>{
 let connects=0,releases=0,queries=0;
 const pool={async connect(){connects++;return {async query(sql){if(sql==='BEGIN'&&connects===1)throw Error('temporary failure');},release(){releases++;}};},async query(){queries++;return {rows:[{ok:1}],rowCount:1};},async end(){}};
 const store=createStore({databaseUrl:'postgres://fixture/db',tokenKey:'ab'.repeat(32)},{pool});
 await assert.rejects(store.db.prepare('SELECT 1 AS ok').get(),/temporary failure/);
 const results=await Promise.all([store.db.prepare('SELECT 1 AS ok').get(),store.db.prepare('SELECT 1 AS ok').all()]);
 assert.equal(results[0].ok,1);assert.equal(results[1][0].ok,1);
 assert.equal(connects,2);assert.equal(releases,2);assert.equal(queries,2);
});
