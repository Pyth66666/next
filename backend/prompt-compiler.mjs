import {compilePrompt} from '../public/prompt-compiler.js';
import {ApiError,jsonFetch} from './providers.mjs';
let referenceEncodingPromise;
export async function referenceCounter(){
 referenceEncodingPromise ||= Promise.all([import('js-tiktoken/lite'),import('js-tiktoken/ranks/o200k_base')])
  .then(([{Tiktoken},{default:ranks}])=>new Tiktoken(ranks))
  .catch(error=>{referenceEncodingPromise=undefined;throw error;});
 const encoding=await referenceEncodingPromise;
 // User text may legitimately contain special-token spellings in code samples.
 return text=>encoding.encode(text,[],[]).length;
}
export async function compileForTarget(source,target,config,fetcher=fetch,options={}){
 if(target==='reference-o200k'){
  return compilePrompt(source,{...options,tokenizer:'o200k_base reference encoding (not a Gemini/Claude model count)',count:await referenceCounter()});
 }
 if(target!=='gemini')throw new ApiError(400,'Select a supported tokenizer.');
 if(config.provider!=='gemini'||!config.geminiKey)throw new ApiError(503,'Gemini counting is not configured. Use the local reference tokenizer.');
 return compilePrompt(source,{...options,tokenizer:`Gemini ${config.model} · countTokens API`,count:async text=>{
  const result=await jsonFetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:countTokens`,{method:'POST',headers:{'x-goog-api-key':config.geminiKey,'Content-Type':'application/json'},body:JSON.stringify({contents:[{role:'user',parts:[{text}]}]})},fetcher);
  return result.totalTokens;
 }});
}
