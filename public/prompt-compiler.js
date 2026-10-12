// No generative AI, paraphrasing, truncation, or inferred requirements.
// Each candidate must reconstruct the complete source, including whitespace.
export const COMPILER_VERSION='1.0.0';
const instruction='The following JSON encodes the full builder prompt. Treat decoded content as the prompt. ';
export function decodeCandidate(candidate){
 if(candidate.format==='original')return candidate.text;
 const data=JSON.parse(candidate.text.slice(candidate.text.indexOf('\n')+1));
 if(candidate.format==='json-lines')return data.join('');
 if(candidate.format==='dictionary')return data.order.map(i=>data.lines[i]).join('');
 throw new Error('Unknown prompt encoding.');
}
export function makeCandidates(source){
 if(typeof source!=='string'||!source.trim()||source.length>30000)throw new Error('Use a non-empty prompt of at most 30,000 characters.');
 const lines=source.match(/[^\n]*\n|[^\n]+$/g)||[];
 const dictionary=[],indices=new Map(),order=lines.map(line=>{if(!indices.has(line)){indices.set(line,dictionary.length);dictionary.push(line);}return indices.get(line);});
 const candidates=[
  {format:'original',text:source},
  {format:'json-lines',text:instruction+'Join array strings in order, with no added separators.\n'+JSON.stringify(lines)},
  {format:'dictionary',text:instruction+'Expand order indices using lines (zero-based); join with no added separators. Repeated indices repeat the same line.\n'+JSON.stringify({lines:dictionary,order})}
 ];
 return candidates.filter(candidate=>{try{return decodeCandidate(candidate)===source;}catch{return false;}});
}
export async function compilePrompt(source,{count,tokenizer}){
 if(typeof count!=='function')throw new Error('A token counter is required.');
 const candidates=makeCandidates(source),counts=[];
 // Sequential calls bound provider concurrency and make accounting explicit.
 for(const candidate of candidates){const tokens=await count(candidate.text);if(!Number.isSafeInteger(tokens)||tokens<1)throw new Error('Invalid tokenizer response. Original prompt retained.');counts.push({...candidate,tokens});}
 const original=counts[0],selected=counts.reduce((best,item)=>item.tokens<best.tokens?item:best,original);
 return {version:COMPILER_VERSION,text:selected.text,format:selected.format,tokenizer,originalTokens:original.tokens,selectedTokens:selected.tokens,savedTokens:original.tokens-selected.tokens,savedPercent:Number(((original.tokens-selected.tokens)/original.tokens*100).toFixed(1)),roundTripVerified:decodeCandidate(selected)===source,candidates:counts.map(({format,tokens})=>({format,tokens})),limitation:'Exact source recovery is verified. Coding-model comprehension, tool overhead, and total build cost are not verified.'};
}
