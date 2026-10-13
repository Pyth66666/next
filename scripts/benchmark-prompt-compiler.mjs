import {compileForTarget} from '../backend/prompt-compiler.mjs';
import {benchmarkCases,fallbackCases} from '../tests/fixtures/prompt-corpus.mjs';

const rows=[];
for(const entry of [...benchmarkCases,...fallbackCases]){
 const result=await compileForTarget(entry.source,'reference-o200k',{},()=>{throw new Error('Network forbidden in local benchmark.');});
 rows.push({id:entry.id,format:result.format,before:result.originalTokens,after:result.selectedTokens,savedPercent:result.savedPercent,sourceRecovered:result.roundTripVerified});
}
const representative=rows.slice(0,benchmarkCases.length),before=representative.reduce((n,r)=>n+r.before,0),after=representative.reduce((n,r)=>n+r.after,0);
console.log(JSON.stringify({counter:'o200k_base (not Gemini/Claude)',modelCalls:0,representative:{cases:representative.length,before,after,savedPercent:Number(((before-after)/before*100).toFixed(1))},rows,limitation:'Synthetic input-token benchmark, not model comprehension or total build cost.'},null,2));
