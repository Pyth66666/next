import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createApplication} from '../backend/app.mjs';
import {configuration} from '../backend/config.mjs';
import {validateShowcase,renderDescription,cleanTags} from '../shared/showcase.js';

const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// The 8-byte PNG signature plus padding is enough for the type check.
const PNG=Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),Buffer.alloc(40)]).toString('base64');
const POST={title:'StudyPal',summary:'Plans your revision for you',description:'**Fast** setup\n- Timetables\n- Reminders\n1. Sign up\n2. Plan',stack:['React','Node.js'],stage:'launched',liveUrl:'https://studypal.example',sourceUrl:'',videoUrl:'',author:'Team Pal',event:'Build-a-thon'};

test('submissions are cleaned and checked before they are saved',()=>{
 const v=validateShowcase(POST);
 assert.equal(v.title,'StudyPal');assert.deepEqual(v.stack,['React','Node.js']);assert.equal(v.liveUrl,'https://studypal.example/');
 assert.throws(()=>validateShowcase({...POST,title:''}),/title/);
 assert.throws(()=>validateShowcase({...POST,liveUrl:'javascript:alert(1)'}),/https/);
 assert.throws(()=>validateShowcase({...POST,liveUrl:'http://x.example'}),/https/);
 assert.throws(()=>validateShowcase({...POST,liveUrl:'',sourceUrl:'',videoUrl:''}),/at least one link/);
 assert.throws(()=>validateShowcase({...POST,videoUrl:'https://evil.example/v'}),/YouTube or Vimeo/);
 assert.equal(validateShowcase({...POST,videoUrl:'https://youtu.be/abc'}).videoUrl,'https://youtu.be/abc');
 assert.equal(validateShowcase({...POST,stage:'nonsense'}).stage,'');
 assert.deepEqual(cleanTags('React, react ,Vue'),['React','Vue']);
 assert.throws(()=>cleanTags('a,b,c,d,e,f'),/up to 5/);
});

test('descriptions allow bold and lists only, and escape everything else',()=>{
 const html=renderDescription('**Fast** <script>x</script>\n- one\n- **two**\n1. first\n\nlast',esc);
 assert.equal(html,'<p><strong>Fast</strong> &lt;script&gt;x&lt;/script&gt;</p><ul><li>one</li><li><strong>two</strong></li></ul><ol><li>first</li></ol><p>last</p>');
});

test('posts wait for admin review, and only then are they and their screenshots public',async t=>{
 const dataDir=mkdtempSync(join(tmpdir(),'apex-showcase-'));
 const config={...configuration({}),dataDir,port:0,adminUserIds:[]};
 const app=createApplication({config,providers:{async ai(){return {text:'{}'};}}});
 await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${app.server.address().port}`;
 t.after(async()=>{await new Promise(r=>app.server.close(r));app.store.db.close();rmSync(dataDir,{recursive:true,force:true});});
 const client=()=>{let cookie='',csrf='';return async(path,method='GET',data)=>{const r=await fetch(base+path,{method,headers:{Origin:config.origin,...(cookie?{Cookie:cookie}:{}),...(csrf?{'X-CSRF-Token':csrf}:{}),...(data?{'Content-Type':'application/json'}:{})},...(data?{body:JSON.stringify(data)}:{})});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];if(path.startsWith('/api/auth/')&&r.ok)csrf=(await r.clone().json()).csrf||csrf;return r;};};
 const anon=client(),maker=client(),other=client(),boss=client();
 for(const [c,e] of [[maker,'maker@example.com'],[other,'other@example.com'],[boss,'boss@example.com']])assert.equal((await c('/api/auth/register','POST',{email:e,password:'a strong password'})).status,200);
 config.adminUserIds.push(app.store.db.prepare("SELECT id FROM users WHERE email='boss@example.com'").get().id);

 assert.equal((await anon('/api/showcase/images','POST',{data:PNG})).status,403,'signed-out visitors cannot upload');
 assert.equal((await maker('/api/showcase/images','POST',{data:Buffer.from('<svg onload=alert(1)>').toString('base64')})).status,400,'non-images are refused by content');
 const up=await maker('/api/showcase/images','POST',{data:PNG});assert.equal(up.status,201);const img=await up.json();
 assert.equal((await maker('/api/showcase','POST',{...POST,images:[]})).status,400,'a screenshot is required');
 const otherUp=await (await other('/api/showcase/images','POST',{data:PNG})).json();
 assert.equal((await maker('/api/showcase','POST',{...POST,images:[otherUp.id]})).status,400,'cannot attach someone else’s screenshot');

 const sub=await maker('/api/showcase','POST',{...POST,images:[img.id]});assert.equal(sub.status,201);const post=await sub.json();
 assert.equal(post.status,'pending');assert.deepEqual(post.images,[img.url]);

 // Pending: hidden from the public and other users; visible to its maker and admins.
 assert.deepEqual(await (await anon('/api/showcase')).json(),[]);
 assert.equal((await anon(`/api/showcase/${post.id}`)).status,404);
 assert.equal((await other(`/api/showcase/${post.id}`)).status,404);
 assert.equal((await anon(img.url)).status,404);
 assert.equal((await maker(`/api/showcase/${post.id}`)).status,200);
 assert.equal((await maker(img.url)).status,200);
 assert.equal((await maker('/api/showcase/mine').then(r=>r.json()))[0].status,'pending');

 assert.equal((await maker(`/api/showcase/${post.id}/review`,'POST',{status:'approved'})).status,403,'only admins review');
 const queue=await (await boss('/api/showcase/review')).json();assert.equal(queue[0].ownerEmail,'maker@example.com');
 assert.equal((await boss(`/api/showcase/${post.id}/review`,'POST',{status:'approved'})).status,200);

 // Approved: public, and its screenshot is served as a cacheable image.
 const gallery=await (await anon('/api/showcase')).json();assert.equal(gallery.length,1);assert.equal(gallery[0].title,'StudyPal');assert.equal(gallery[0].ownerId,undefined,'owner ids are not exposed');
 const pic=await anon(img.url);assert.equal(pic.status,200);assert.equal(pic.headers.get('content-type'),'image/png');assert.match(pic.headers.get('cache-control'),/public/);

 // Admins' own posts go straight up; the activity feed lists posts.
 const bossImg=await (await boss('/api/showcase/images','POST',{data:PNG})).json();
 assert.equal((await (await boss('/api/showcase','POST',{...POST,title:'Admin pick',images:[bossImg.id]})).json()).status,'approved');
 assert.ok((await (await boss('/api/admin/activity?group=projects')).json()).some(i=>i.kind==='showcase'&&i.title==='StudyPal'));

 // Only the maker (or an admin) can delete; deleting removes its screenshots.
 assert.equal((await other(`/api/showcase/${post.id}`,'DELETE')).status,404);
 assert.equal((await maker(`/api/showcase/${post.id}`,'DELETE')).status,200);
 assert.equal((await anon(img.url)).status,404);
 assert.equal((await anon('/api/showcase').then(r=>r.json())).length,1);
});
