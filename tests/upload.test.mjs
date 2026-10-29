import test from 'node:test';
import assert from 'node:assert/strict';
import {deflateRawSync} from 'node:zlib';
import {readProject,uploadLimits} from '../public/upload.js';

// Builds a small ZIP (stored or deflated entries). The reader does not check CRCs, so they are left as zero.
function zip(entries){
 const locals=[],centrals=[];let offset=0;
 for(const [path,text,deflate=true] of entries){
  const name=Buffer.from(path),raw=Buffer.from(text),data=deflate?deflateRawSync(raw):raw,method=deflate?8:0;
  const local=Buffer.alloc(30);local.writeUInt32LE(0x04034b50,0);local.writeUInt16LE(method,8);local.writeUInt32LE(data.length,18);local.writeUInt32LE(raw.length,22);local.writeUInt16LE(name.length,26);
  const central=Buffer.alloc(46);central.writeUInt32LE(0x02014b50,0);central.writeUInt16LE(method,10);central.writeUInt32LE(data.length,20);central.writeUInt32LE(raw.length,24);central.writeUInt16LE(name.length,28);central.writeUInt32LE(offset,42);
  locals.push(local,name,data);centrals.push(central,name);offset+=30+name.length+data.length;
 }
 const directory=Buffer.concat(centrals),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);
 return Buffer.concat([...locals,directory,end]);
}

test('a downloaded ZIP is read in the browser, keeping only readable code files',async()=>{
 const file=new File([zip([
  ['cake-app-main/README.md','# Cake app'],
  ['cake-app-main/src/App.tsx','export default function App(){return null}'],
  ['cake-app-main/src/data.json','{"a":1}',false],
  ['cake-app-main/.env','SECRET=1'],
  ['cake-app-main/node_modules/x/index.js','x'],
  ['cake-app-main/public/logo.png','\u0089PNG']
 ])],'cake-app-main.zip');
 const result=await readProject([file]);
 assert.equal(result.name,'cake-app-main');
 assert.equal(result.totalFiles,6);
 assert.deepEqual(result.files.map(f=>f.path),['README.md','src/App.tsx','src/data.json']);
 assert.equal(result.files[1].content,'export default function App(){return null}');
});

test('a chosen folder is read the same way and respects the file limit',async()=>{
 const files=Array.from({length:uploadLimits.maxFiles+5},(_,i)=>{const f=new File([`export const n=${i};`],`f${i}.js`);Object.defineProperty(f,'webkitRelativePath',{value:`my-app/src/f${i}.js`});return f;});
 const result=await readProject(files);
 assert.equal(result.name,'my-app');
 assert.equal(result.files.length,uploadLimits.maxFiles);
 assert.ok(result.files.every(f=>f.path.startsWith('src/')));
});

test('a file that is not a ZIP gives a plain error',async()=>{
 await assert.rejects(readProject([new File(['hello'],'notes.zip')]),/does not look like a ZIP/);
 await assert.rejects(readProject([]),/Choose a ZIP file or a folder/);
});
