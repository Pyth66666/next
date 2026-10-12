import {decodeCandidate} from './prompt-compiler.js';
export function installCompilerPanel(field,request){
 const document=field.ownerDocument;
 const panel=document.createElement('div');panel.className='prompt-compiler-panel';
 panel.innerHTML='<label>Token counter<select aria-label="Prompt token counter"><option value="reference-o200k">Local o200k reference · no AI call</option><option value="gemini">Configured Gemini · sends prompt for counting</option></select></label><div class="inline-build-actions"><button type="button" class="button light" data-compile-prompt>Compare encodings</button><button type="button" class="text-link" data-original-prompt hidden>Use original</button></div><p data-compiler-status role="status">Sign in to compare real token counts. Your complete prompt stays unchanged until then.</p><details><summary>What is preserved?</summary><p>Every character, number, permission, code block, and instruction must survive exact round-trip reconstruction. This is encoding, not a summary. Smaller encoded input does not guarantee equivalent model comprehension or a cheaper build.</p></details>';
 field.after(panel);
 let original=field.value,applied=field.value,revision=0;
 const button=panel.querySelector('[data-compile-prompt]'),restore=panel.querySelector('[data-original-prompt]'),status=panel.querySelector('[data-compiler-status]'),target=panel.querySelector('select');
 function reset(){revision++;original=field.value;applied=field.value;restore.hidden=true;status.textContent='Prompt updated. Compare again to measure this version.';}
 field.addEventListener('input',reset);
 // Changes to task/style regenerate the modal prompt synchronously.
 field.closest('dialog')?.addEventListener('change',e=>{if(e.target!==target)reset();});
 restore.onclick=()=>{revision++;field.value=original;applied=original;restore.hidden=true;status.textContent='Original prompt restored.';};
 target.onchange=()=>{revision++;if(field.value===applied){field.value=original;applied=original;}restore.hidden=true;status.textContent='Counter changed. Compare again; counts are not interchangeable between models.';};
 button.onclick=async()=>{
  if(field.value!==applied){original=field.value;applied=original;}
  const source=original,ticket=++revision;button.disabled=true;status.textContent='Checking reversible encodings and counting tokens…';
  try{
   const result=await request('/api/prompt/compile','POST',{source,target:target.value});
   if(ticket!==revision||!panel.isConnected||field.value!==applied)return;
   if(!result.roundTripVerified||decodeCandidate({format:result.format,text:result.text})!==source||!Number.isSafeInteger(result.selectedTokens)||result.selectedTokens>result.originalTokens)throw new Error('Validation failed. Original prompt retained.');
   field.value=result.text;applied=result.text;restore.hidden=result.format==='original';field.oninput?.();
   status.textContent=`${result.originalTokens.toLocaleString()} → ${result.selectedTokens.toLocaleString()} tokens · ${result.savedPercent}% input reduction · ${result.tokenizer}. ${result.format==='original'?'No smaller valid encoding; kept original.':'Exact source recovery checked. Build quality not yet benchmarked.'}`;
  }catch(error){if(ticket===revision){field.value=source;applied=source;status.textContent=error.message+' Original prompt retained.';}}
  finally{button.disabled=false;}
 };
 return {reset,panel};
}
