import {buildContract,recoverBuildSource} from './build-contract.js';

export const COMPILER_VERSION='2.0.0';
export const MAX_SOURCE_LENGTH=30000;
const instruction='The following JSON encodes the full builder prompt. Treat decoded content as the prompt. ';
const headers={
 'json-lines':instruction+'Join array strings in order, with no added separators.\n',
 dictionary:instruction+'Expand order indices using lines (zero-based); join with no added separators. Repeated indices repeat the same line.\n'
};
const positiveInteger=n=>Number.isSafeInteger(n)&&n>0;
const percent=(before,after)=>Number(((before-after)/before*100).toFixed(1));
export function decodeCandidate(candidate){
 if(candidate.format==='original')return candidate.text;
 if(candidate.format.startsWith('contract-'))return recoverBuildSource(candidate);
 const header=headers[candidate.format];
 if(!header||!candidate.text.startsWith(header))throw new Error('Unknown or invalid prompt encoding.');
 const data=JSON.parse(candidate.text.slice(header.length));
 const lines=candidate.format==='json-lines'?data:data?.lines;
 if(!Array.isArray(lines)||lines.length>MAX_SOURCE_LENGTH||lines.some(line=>typeof line!=='string'))throw new Error('Invalid prompt lines.');
 let ordered=lines;
 if(candidate.format==='dictionary'){
  if(!Array.isArray(data.order)||data.order.length>MAX_SOURCE_LENGTH||data.order.some(i=>!Number.isSafeInteger(i)||i<0||i>=lines.length))throw new Error('Invalid dictionary indices.');
  ordered=data.order.map(i=>lines[i]);
 }
 if(ordered.reduce((n,line)=>n+line.length,0)>MAX_SOURCE_LENGTH)throw new Error('Decoded prompt too large.');
 return ordered.join('');
}
export function makeCandidates(source,{allowExperimental=false}={}){
 if(typeof source!=='string'||!source.trim()||source.length>MAX_SOURCE_LENGTH)throw new Error('Use a non-empty prompt of at most 30,000 characters.');
 const candidates=[{format:'original',text:source,preservation:'verbatim',experimental:false}];
 const contract=buildContract(source);if(contract)candidates.push(contract);
 if(allowExperimental){
  const lines=source.match(/[^\n]*\n|[^\n]+$/g)||[];
  candidates.push({format:'json-lines',text:headers['json-lines']+JSON.stringify(lines),preservation:'reversible-encoding',experimental:true});
  const dictionary=[],indices=new Map(),order=lines.map(line=>{if(!indices.has(line)){indices.set(line,dictionary.length);dictionary.push(line);}return indices.get(line);});
  if(dictionary.length<lines.length)candidates.push({format:'dictionary',text:headers.dictionary+JSON.stringify({lines:dictionary,order}),preservation:'reversible-encoding',experimental:true});
 }
 return candidates.filter(candidate=>{try{return decodeCandidate(candidate)===source;}catch{return false;}});
}
export function validateCompilation(source,result,options={}){
 if(!result||result.version!==COMPILER_VERSION||typeof result.tokenizer!=='string'||!result.tokenizer.trim()||!result.roundTripVerified||!positiveInteger(result.originalTokens)||!positiveInteger(result.selectedTokens)||result.selectedTokens>result.originalTokens)throw new Error('Invalid compiler response.');
 const known=makeCandidates(source,options).find(c=>c.format===result.format&&c.text===result.text);
 if(!known||known.preservation!==result.preservation||known.experimental!==result.experimental||decodeCandidate(known)!==source||result.savedTokens!==result.originalTokens-result.selectedTokens||result.savedPercent!==percent(result.originalTokens,result.selectedTokens))throw new Error('Compiler integrity check failed.');
 if(!Array.isArray(result.candidates)||!result.candidates.some(c=>c.format==='original'&&c.tokens===result.originalTokens)||!result.candidates.some(c=>c.format===result.format&&c.tokens===result.selectedTokens))throw new Error('Inconsistent compiler counts.');
 return true;
}
export async function compilePrompt(source,{count,tokenizer,allowExperimental=false}){
 if(typeof count!=='function')throw new Error('A token counter is required.');
 const counts=[];
 // Sequential calls bound provider concurrency. Local counting makes no API call.
 for(const candidate of makeCandidates(source,{allowExperimental})){
  const tokens=await count(candidate.text);
  if(!positiveInteger(tokens))throw new Error('Invalid tokenizer response.');
  counts.push({...candidate,tokens});
 }
 const original=counts[0],smallest=counts.reduce((best,item)=>item.tokens<best.tokens?item:best,original);
 // Tiny wins do not justify changing the handoff format.
 const selected=original.tokens-smallest.tokens>=Math.max(8,Math.ceil(original.tokens*.02))?smallest:original;
 return {version:COMPILER_VERSION,text:selected.text,format:selected.format,preservation:selected.preservation,experimental:selected.experimental,tokenizer,originalTokens:original.tokens,selectedTokens:selected.tokens,savedTokens:original.tokens-selected.tokens,savedPercent:percent(original.tokens,selected.tokens),roundTripVerified:decodeCandidate(selected)===source,candidates:counts.map(({format,tokens})=>({format,tokens})),limitation:'User brief preserved; source recovery checked against known templates. Coding-model quality, tool overhead and total build cost are not verified.'};
}
