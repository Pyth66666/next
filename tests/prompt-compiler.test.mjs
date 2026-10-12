import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {makeCandidates,decodeCandidate,compilePrompt} from '../public/prompt-compiler.js';
import {compileForTarget} from '../backend/prompt-compiler.mjs';
import {installCompilerPanel} from '../public/prompt-compiler-ui.js';

test('every encoding preserves whitespace, multilingual requirements, code, numbers and negations exactly',()=>{
 for(const source of ['No payments. Only owners may cancel.','\n# Brief\r\n\nRM 1,000; never expose .env.\n','Jangan padam data. 用户只能查看自己的记录。\n','```js\nconst x = "\\n";\n```\n\n','<img src=x onerror=alert(1)>\n{"order":[999]}\n','line\n'.repeat(100),' trailing spaces  \n\n']){
  const candidates=makeCandidates(source);assert.equal(candidates.length,3);
  for(const c of candidates)assert.equal(decodeCandidate(c),source);
 }
 assert.throws(()=>makeCandidates(' '));assert.throws(()=>makeCandidates('a'.repeat(30001)));
});
test('local token selection includes decoder overhead, preserves original on ties and saves on repeated source',async()=>{
 const repetitive=('Only booking owners may cancel. No payments; enforce authorization on the server.\n').repeat(80);
 const result=await compileForTarget(repetitive,'reference-o200k',{});
 assert.equal(result.format,'dictionary');assert.ok(result.savedTokens>0);assert.equal(decodeCandidate(result),repetitive);
 const short=await compileForTarget('No payments.','reference-o200k',{});assert.equal(short.format,'original');assert.equal(short.savedTokens,0);
 assert.match(short.tokenizer,/not a Gemini/);
 assert.equal((await compilePrompt('brief',{count:()=>10,tokenizer:'fixture'})).format,'original');
 await assert.rejects(compilePrompt('brief',{count:()=>NaN,tokenizer:'fixture'}),/Invalid tokenizer/);
 await assert.rejects(compileForTarget('brief','unsupported',{}),/supported/);
});
test('Gemini counts model-specific candidates without generating text or putting credentials in URLs',async()=>{
 const calls=[];const result=await compileForTarget('No payments.','gemini',{provider:'gemini',model:'fixture-model',geminiKey:'fixture-secret'},async(url,options)=>{
  calls.push({url,options});return new Response(JSON.stringify({totalTokens:calls.length===1?10:30}));
 });
 assert.equal(calls.length,3);assert.equal(result.format,'original');
 for(const call of calls){assert.ok(call.url.endsWith(':countTokens'));assert.ok(!call.url.includes('fixture-secret'));assert.equal(call.options.headers['x-goog-api-key'],'fixture-secret');assert.ok(JSON.parse(call.options.body).contents[0].parts[0].text);}
 await assert.rejects(compileForTarget('brief','gemini',{provider:'gemini'}),/not configured/);
});
test('compiler UI supports restore, failed counters, tampered results and stale request protection',async()=>{
 const dom=new JSDOM('<main><textarea></textarea></main>'),field=dom.window.document.querySelector('textarea');
 field.value=('Only owners can cancel. Never delete user data.\n').repeat(60);
 const original=field.value;let pending;
 const api=async(_path,_method,body)=>compileForTarget(body.source,'reference-o200k',{});
 const widget=installCompilerPanel(field,(...args)=>pending?pending(...args):api(...args));
 const click=()=>widget.panel.querySelector('[data-compile-prompt]').click();
 const tick=()=>new Promise(r=>setTimeout(r,30));
 click();await tick();assert.notEqual(field.value,original);assert.match(widget.panel.textContent,/input reduction/);
 widget.panel.querySelector('[data-original-prompt]').click();assert.equal(field.value,original);
 pending=async()=>{throw new Error('Counter unavailable');};click();await tick();assert.equal(field.value,original);assert.match(widget.panel.textContent,/Original prompt retained/);
 pending=async()=>({text:'dropped requirements',format:'original',roundTripVerified:true,originalTokens:100,selectedTokens:1});click();await tick();assert.equal(field.value,original);
 let resolve;pending=()=>new Promise(r=>{resolve=r;});click();field.value='New brief; no payments.';field.dispatchEvent(new dom.window.Event('input'));resolve(await api('', '',{source:original}));await tick();assert.equal(field.value,'New brief; no payments.');
 dom.window.close();
});
