import {compilePrompt} from '../public/prompt-compiler.js';
import {ApiError,jsonFetch} from './providers.mjs';
let referenceEncoding;
export async function compileForTarget(source,target,config,fetcher=fetch){
 if(target==='reference-o200k'){
  if(!referenceEncoding){const {getEncoding}=await import('js-tiktoken');referenceEncoding=getEncoding('o200k_base');}
  return compilePrompt(source,{tokenizer:'o200k_base reference encoding (not a Gemini/Claude model count)',count:text=>referenceEncoding.encode(text).length});
 }
 if(target!=='gemini')throw new ApiError(400,'Select a supported tokenizer.');
 if(config.provider!=='gemini'||!config.geminiKey)throw new ApiError(503,'Gemini counting is not configured. Use the local reference tokenizer.');
 return compilePrompt(source,{tokenizer:`Gemini ${config.model} · countTokens API`,count:async text=>{
  const result=await jsonFetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:countTokens`,{method:'POST',headers:{'x-goog-api-key':config.geminiKey,'Content-Type':'application/json'},body:JSON.stringify({contents:[{role:'user',parts:[{text}]}]})},fetcher);
  return result.totalTokens;
 }});
}
