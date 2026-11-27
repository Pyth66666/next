// Showcase: users post projects they built. A post shows publicly only after an admin approves it
// (admins' own posts go straight up). Screenshots are stored in the database (they are already
// shrunk in the browser) and served from /api/showcase/images/<id>.
import {randomUUID} from 'node:crypto';
import {ApiError} from './providers.mjs';
import {validateShowcase,IMAGE_TYPES,MAX_IMAGE_BYTES,LIMITS} from '../shared/showcase.js';

const DAY=86400000;
const parse=v=>{try{return JSON.parse(v);}catch{return {};}};
const STATUSES=['pending','approved','rejected'];

// Image files are recognised by their first bytes, not by what the browser claims.
function sniff(buf){
 if(buf.length>12&&buf.toString('ascii',0,4)==='RIFF'&&buf.toString('ascii',8,12)==='WEBP')return 'image/webp';
 if(buf.length>3&&buf[0]===0xff&&buf[1]===0xd8&&buf[2]===0xff)return 'image/jpeg';
 if(buf.length>8&&buf.toString('hex',0,8)==='89504e470d0a1a0a')return 'image/png';
 return null;
}

export function showcaseStore({db}){
 const card=(row,{withOwner=false}={})=>{
  const d=parse(row.data);
  return {id:row.id,status:row.status,created:Number(row.created),updated:Number(row.updated),...d,images:(d.images||[]).map(i=>`/api/showcase/images/${i}`),...(withOwner?{ownerId:row.user_id}:{})};
 };

 async function uploadImage(user,{data}){
  if(typeof data!=='string'||!data)throw new ApiError(400,'Choose an image to upload.');
  const buf=Buffer.from(data.replace(/^data:[^,]*,/,''),'base64');
  if(buf.length>MAX_IMAGE_BYTES)throw new ApiError(413,'That image is too large even after shrinking. Try a smaller screenshot.');
  const mime=sniff(buf);if(!IMAGE_TYPES.includes(mime))throw new ApiError(400,'Screenshots must be PNG, JPG or WebP images.');
  // Images never attached to a post are cleared after a day.
  await db.prepare('DELETE FROM showcase_images WHERE project_id IS NULL AND created<?').run(Date.now()-DAY);
  const id=randomUUID();
  await db.prepare('INSERT INTO showcase_images VALUES(?,?,?,?,?,?)').run(id,user,null,Date.now(),mime,buf.toString('base64'));
  return {id,url:`/api/showcase/images/${id}`};
 }

 async function submit(user,body,{admin=false}={}){
  let clean;try{clean=validateShowcase(body);}catch(e){throw new ApiError(400,e.message);}
  const ids=Array.isArray(body.images)?body.images.filter(x=>typeof x==='string').slice(0,LIMITS.images):[];
  if(!ids.length)throw new ApiError(400,'Add at least one screenshot. A photo of your screen is fine.');
  for(const id of ids){const img=await db.prepare('SELECT user_id,project_id FROM showcase_images WHERE id=?').get(id);if(!img||img.user_id!==user||img.project_id)throw new ApiError(400,'One of the screenshots is missing. Upload it again.');}
  const id=randomUUID(),now=Date.now(),status=admin?'approved':'pending';
  await db.prepare('INSERT INTO showcase VALUES(?,?,?,?,?,?)').run(id,user,status,now,now,JSON.stringify({...clean,images:ids,review:null}));
  for(const img of ids)await db.prepare('UPDATE showcase_images SET project_id=? WHERE id=?').run(id,img);
  return card(await db.prepare('SELECT * FROM showcase WHERE id=?').get(id));
 }

 async function gallery(){return (await db.prepare("SELECT * FROM showcase WHERE status='approved' ORDER BY created DESC").all()).map(r=>card(r));}
 async function mine(user){return (await db.prepare('SELECT * FROM showcase WHERE user_id=? ORDER BY created DESC').all(user)).map(r=>card(r));}
 async function queue(status='pending'){
  const s=STATUSES.includes(status)?status:'pending';
  const emails=new Map((await db.prepare('SELECT id,email FROM users').all()).map(u=>[u.id,u.email]));
  return (await db.prepare('SELECT * FROM showcase WHERE status=? ORDER BY created').all(s)).map(r=>({...card(r,{withOwner:true}),ownerEmail:emails.get(r.user_id)||''}));
 }

 // Approved posts are public. Pending or rejected ones only to their owner and admins.
 async function one(id,user,admin){
  const row=await db.prepare('SELECT * FROM showcase WHERE id=?').get(id);
  if(!row||row.status!=='approved'&&!admin&&row.user_id!==user)throw new ApiError(404,'This project isn’t in the showcase.');
  return {...card(row),mine:!!user&&row.user_id===user};
 }

 async function image(id,user,admin){
  const img=await db.prepare('SELECT i.*,s.status FROM showcase_images i LEFT JOIN showcase s ON s.id=i.project_id WHERE i.id=?').get(id);
  if(!img||img.status!=='approved'&&!admin&&img.user_id!==user)throw new ApiError(404,'Image not found.');
  return {mime:img.mime,body:Buffer.from(img.data,'base64'),public:img.status==='approved'};
 }

 async function review(id,status,note){
  if(!['approved','rejected'].includes(status))throw new ApiError(400,'Choose approve or reject.');
  const row=await db.prepare('SELECT * FROM showcase WHERE id=?').get(id);if(!row)throw new ApiError(404,'Project not found.');
  const d=parse(row.data);d.review={note:String(note||'').slice(0,500),at:Date.now()};
  await db.prepare('UPDATE showcase SET status=?,updated=?,data=? WHERE id=?').run(status,Date.now(),JSON.stringify(d),id);
  return card(await db.prepare('SELECT * FROM showcase WHERE id=?').get(id));
 }

 async function remove(id,user,admin){
  const row=await db.prepare('SELECT user_id FROM showcase WHERE id=?').get(id);
  if(!row||!admin&&row.user_id!==user)throw new ApiError(404,'Project not found.');
  await db.prepare('DELETE FROM showcase_images WHERE project_id=?').run(id);
  await db.prepare('DELETE FROM showcase WHERE id=?').run(id);
 }

 return {uploadImage,submit,gallery,mine,queue,one,image,review,remove};
}
