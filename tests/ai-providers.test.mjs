import test from 'node:test';
import assert from 'node:assert/strict';
import {configuration} from '../backend/config.mjs';
import {providers,aiReady,providerLabel} from '../backend/providers.mjs';

const ILMU={AI_PROVIDER:'anthropic',ANTHROPIC_BASE_URL:'https://api.ilmu.ai/anthropic',ANTHROPIC_API_KEY:'ilmu-test-key',ANTHROPIC_MODEL:'ilmu-glm-5.3-flash'};
const RAPID={NVIDIA_BASE_URL:'https://litellm.rapidscreen.io/v1',NVIDIA_API_KEY:'rapid-test-key',NVIDIA_MODEL:'deepseek-v4-flash'};
const anthropicReply=(text,extra={})=>new Response(JSON.stringify({model:'ilmu-glm-5.3-flash',content:[{type:'thinking',thinking:'hmm'},{type:'text',text}],stop_reason:'end_turn',usage:{input_tokens:12,output_tokens:5},...extra}));
const openaiReply=text=>new Response(JSON.stringify({choices:[{message:{content:text},finish_reason:'stop'}],usage:{prompt_tokens:9}}));

test('ILMU is read as an Anthropic-format provider',()=>{
 const c=configuration(ILMU);
 assert.equal(c.provider,'anthropic');assert.equal(c.model,'ilmu-glm-5.3-flash');assert.equal(c.anthropicBase,'https://api.ilmu.ai/anthropic');
 assert.ok(aiReady(c));assert.equal(providerLabel(c),'ILMU');
 assert.equal(configuration({...ILMU,ANTHROPIC_BASE_URL:'http://api.ilmu.ai/anthropic'}).provider,null);
 assert.equal(aiReady(configuration({...ILMU,ANTHROPIC_API_KEY:''})),false);
});

test('the Anthropic-format adapter sends the Messages request and reads only text blocks',async()=>{
 let sent;const p=providers(configuration(ILMU),async(url,o)=>{sent={url,o,body:JSON.parse(o.body)};return anthropicReply('Hello');});
 const r=await p.ai('Be brief.','Say hi',300);
 assert.equal(sent.url,'https://api.ilmu.ai/anthropic/v1/messages');
 assert.equal(sent.o.headers['x-api-key'],'ilmu-test-key');assert.equal(sent.o.headers['anthropic-version'],'2023-06-01');
 assert.deepEqual(sent.body,{model:'ilmu-glm-5.3-flash',max_tokens:300,system:'Be brief.',messages:[{role:'user',content:'Say hi'}]});
 assert.equal(r.text,'Hello');assert.equal(r.fallback,undefined);assert.deepEqual(r.usage,{prompt_tokens:12,completion_tokens:5,total_tokens:17});
 await assert.rejects(providers(configuration(ILMU),async()=>anthropicReply('cut',{stop_reason:'max_tokens'})).ai('',''),e=>e.status===502);
});

test('when the main provider fails, the backup answers once',async()=>{
 const c=configuration({...ILMU,...RAPID,AI_FALLBACK_PROVIDER:'nvidia'});
 assert.equal(c.fallbackProvider,'nvidia');
 const calls=[];
 const p=providers(c,async url=>{calls.push(url);return url.includes('ilmu')?new Response('{}',{status:401}):openaiReply('From backup');});
 const r=await p.ai('s','u',100);
 assert.equal(r.text,'From backup');assert.equal(r.fallback,true);assert.equal(r.model,'deepseek-v4-flash');
 assert.deepEqual(calls,['https://api.ilmu.ai/anthropic/v1/messages','https://litellm.rapidscreen.io/v1/chat/completions']);
});

test('the backup is not used for a refused request, and is used when the main key is missing',async()=>{
 const c=configuration({...ILMU,...RAPID,AI_FALLBACK_PROVIDER:'nvidia'});let backupCalled=false;
 await assert.rejects(providers(c,async url=>{if(!url.includes('ilmu'))backupCalled=true;return anthropicReply('',{stop_reason:'refusal'});}).ai('s','u'),e=>e.status===422);
 assert.equal(backupCalled,false);
 const noKey=configuration({...ILMU,ANTHROPIC_API_KEY:'',...RAPID,AI_FALLBACK_PROVIDER:'nvidia'});
 const r=await providers(noKey,async()=>openaiReply('Backup only')).ai('s','u');assert.equal(r.text,'Backup only');
 assert.equal(configuration({...ILMU,AI_FALLBACK_PROVIDER:'anthropic'}).fallbackProvider,null);
});
