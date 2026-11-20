import test from 'node:test';
import assert from 'node:assert/strict';
import {runScan} from '../backend/code-tour.mjs';
import {scanGroups} from '../shared/scan-groups.js';
import {fileContext} from '../backend/providers.mjs';

const files=[
 {path:'package.json',content:'{"name":"x"}'},
 {path:'src/App.jsx',content:'export default function App(){\n  return null\n}'},
 {path:'src/components/Button.jsx',content:'export const Button=()=>null'},
 {path:'server/index.js',content:'console.log("hi")'}
];
const repo={fullName:'demo',commit:'abc',files};
// Fake model: explains line 1 of the first file it was given.
const ai=async(system,prompt)=>{const file=/FILE (\S+)/.exec(prompt)[1];return {text:JSON.stringify({framework_name:'React',framework_plain:'p',summary:'s',pieces:[{file,start:1,end:1,title:'T '+file,purpose:'',lines:[{line:1,explain:'Line one of '+file}]}]}),model:'m',usage:{prompt_tokens:10,completion_tokens:5}};};

test('folder groups become chapters and very many folders are merged',()=>{
 assert.deepEqual(scanGroups(files.map(f=>({...f,size:f.content.length}))).map(g=>g.folder).sort(),['','server','src','src/components']);
 const many=Array.from({length:20},(_,i)=>({path:`f${i}/a.js`,size:i}));
 const g=scanGroups(many);assert.equal(g.length,8);assert.equal(g.at(-1).title,'Other files');assert.equal(g.flatMap(x=>x.files).length,20);
});

test('normal scan makes one call; full scan makes one per chapter and adds up tokens',async()=>{
 let calls=0;const count=async(...a)=>{calls++;return ai(...a);};
 const normal=await runScan({kind:'normal',repo,level:'beginner',language:'English',ai:count,pickFiles:r=>r.files.slice(0,2),fileContext,scanGroups,policy:''});
 assert.equal(calls,1);assert.equal(normal.tour.pieces.length,1);assert.equal(normal.tour.full,undefined);
 calls=0;const full=await runScan({kind:'full',repo,level:'beginner',language:'English',ai:count,pickFiles:()=>[],fileContext,scanGroups,policy:''});
 assert.equal(calls,4);assert.equal(full.tour.full,true);assert.equal(full.tour.pieces.length,4);
 assert.ok(full.tour.pieces.every(p=>p.chapter));assert.equal(full.usage.prompt_tokens,40);
});
