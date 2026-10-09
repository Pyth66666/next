import test from 'node:test';
import assert from 'node:assert/strict';
import {configuration} from '../backend/config.mjs';
import {providers,redact} from '../backend/providers.mjs';

test('Gemini is the default even if old NVIDIA credentials remain configured',()=>{
 const config=configuration({NVIDIA_API_KEY:'old-private-key',NVIDIA_MODEL:'old-model'});
 assert.equal(config.provider,'gemini');assert.equal(config.model,'gemini-3.5-flash-lite');assert.equal(config.geminiKey,'');
 assert.equal(configuration({GEMINI_MODEL:'models/gemini-3.5-flash-lite'}).model,'gemini-3.5-flash-lite');
 assert.throws(()=>configuration({GEMINI_MODEL:'../other-service'}),/GEMINI_MODEL/);
 assert.throws(()=>configuration({AI_PROVIDER:'unknown'}),/AI_PROVIDER/);
 assert.equal(configuration({AI_PROVIDER:'nvidia',NVIDIA_MODEL:'legacy'}).model,'legacy');
});

test('Gemini sends system instructions separately, keeps keys out of URLs and maps text/usage',async()=>{
 const config=configuration({GEMINI_API_KEY:'fixture-google-secret'});let captured;
 const service=providers(config,async(url,options)=>{
  captured={url,...options,body:JSON.parse(options.body)};
  return new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{thought:true,text:'internal reasoning'},{text:'Explain the '},{text:'source clearly.'}]}}],usageMetadata:{promptTokenCount:100,candidatesTokenCount:20,thoughtsTokenCount:8,totalTokenCount:128}}));
 });
 const result=await service.ai('Teach without inventing evidence','Explain this code',1200);
 assert.equal(captured.url,'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent');
 assert.equal(captured.headers['x-goog-api-key'],'fixture-google-secret');assert.equal(captured.url.includes(config.geminiKey),false);
 assert.deepEqual(captured.body.systemInstruction,{parts:[{text:'Teach without inventing evidence'}]});
 assert.equal(captured.body.contents[0].role,'user');assert.equal(captured.body.contents[0].parts[0].text,'Explain this code');
 assert.equal(captured.body.generationConfig.maxOutputTokens,1200);assert.equal(captured.body.generationConfig.thinkingConfig.thinkingLevel,'minimal');
 assert.equal(result.text,'Explain the source clearly.');assert.equal(result.model,config.model);
 assert.deepEqual(result.usage,{prompt_tokens:100,completion_tokens:20,thinking_tokens:8,total_tokens:128});
 assert.equal(JSON.stringify(result).includes(config.geminiKey),false);
});

test('Gemini rejects blocked, empty and incomplete answers and reports quota/config errors safely',async()=>{
 const config=configuration({GEMINI_API_KEY:'fixture-google-secret'});
 for(const [payload,status,pattern]of [
  [{candidates:[{finishReason:'MAX_TOKENS',content:{parts:[{text:'partial'}]}}]},502,/cut off/],
  [{promptFeedback:{blockReason:'SAFETY'}},422,/could not complete/],
  [{candidates:[{finishReason:'SAFETY',content:{parts:[{text:'partial'}]}}]},422,/could not complete/],
  [{candidates:[{finishReason:'STOP',content:{parts:[{thought:true,text:'thought only'}]}}]},502,/no answer/],
  [{},502,/no answer/]
 ])await assert.rejects(providers(config,async()=>new Response(JSON.stringify(payload))).ai('system','user'),e=>e.status===status&&pattern.test(e.message));
 for(const [http,status,pattern]of [[400,502,/GEMINI_API_KEY/],[403,502,/API access/],[404,502,/GEMINI_MODEL/],[429,429,/quota/],[503,502,/HTTP 503/]]){
  await assert.rejects(providers(config,async()=>new Response(JSON.stringify({error:{message:config.geminiKey}}),{status:http})).ai('system','user'),e=>e.status===status&&pattern.test(e.message)&&!e.message.includes(config.geminiKey));
 }
 await assert.rejects(providers(configuration({}),()=>{throw Error('must not fetch');}).ai('system','user'),e=>e.status===503&&/GEMINI_API_KEY/.test(e.message));
 await assert.rejects(providers(config,async()=>{throw Object.assign(Error('timeout'),{name:'TimeoutError'});}).ai('system','user'),e=>e.status===504);
 assert.equal(redact('const leaked = '+ 'AIza'+'a'.repeat(35)),'const leaked = [REDACTED_TOKEN]');
});
