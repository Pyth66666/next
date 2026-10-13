import {pathToFileURL} from 'node:url';
import {benchmarkCases} from '../tests/fixtures/prompt-corpus.mjs';
import {compileForTarget} from '../backend/prompt-compiler.mjs';

// Gold answers are authored independently of the compact template.
const probes={
 booking:[['access','May a student cancel another student\'s booking? Answer yes or no.','no'],['budget','What is the budget in RM? Reply with digits only, without commas.','1000']],
 agency:[['access','May a client access another client\'s project? Answer yes or no.','no'],['upload','What is the maximum PDF upload size in MB? Reply with digits only.','10']],
 bilingual:[['consent','May the app send WhatsApp messages without consent? Answer yes or no.','no'],['timezone','Which IANA time zone is required? Reply with its exact identifier only.','Asia/Kuala_Lumpur']],
 code:[['access','Which role must POST /api/stock require? Reply with the role name only.','manager'],['quantity','Is a stock quantity of zero permitted? Answer yes or no.','yes']],
 events:[['access','May students view scores before publication? Answer yes or no.','no'],['github','May the app automatically write to GitHub? Answer yes or no.','no']],
 learning:[['privacy','May a learner see another learner\'s answers? Answer yes or no.','no'],['deletion','Must deletion require confirmation? Answer yes or no.','yes']]
};
const guidedProbes=[
 ['deployment','Does this prompt authorize deploying paid services? Answer yes or no.','no'],
 ['isolation','When authentication is in scope, must testing verify cross-user data isolation? Answer yes or no.','yes'],
 ['verification','May an external integration be claimed complete without verification? Answer yes or no.','no'],
 ['documentation','Which Markdown file must trace a request from screen through server to storage? Reply with the filename only.','ARCHITECTURE.md']
];
export async function evaluationCases(){
 const rows=[];
 for(const entry of benchmarkCases){
  const [project,mode]=entry.id.split('-');
  const result=await compileForTarget(entry.source,'reference-o200k',{},()=>{throw new Error('Fixture generation must stay offline.');});
  for(const [id,question,answer] of [...probes[project],...(mode==='guided'?guidedProbes:[])])rows.push({id:`${entry.id}-${id}`,group:project,source:entry.source,candidate:result.text,question,answer,originalTokens:result.originalTokens,candidateTokens:result.selectedTokens,tokenizer:'o200k_base'});
 }
 return rows;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(await evaluationCases()));
