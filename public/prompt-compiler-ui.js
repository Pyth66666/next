import {validateCompilation} from '../shared/prompt-compiler.js';
export function installCompilerPanel(field,request){
 const document=field.ownerDocument;
 const panel=document.createElement('div');panel.className='prompt-compiler-panel';
 panel.innerHTML='<details class="prompt-size-details"><summary>Instruction length (optional)</summary><p>A token count measures prompt length, not quality or the cost of a complete build.</p><label>Counting method<select aria-label="Prompt token counter"><option value="reference-o200k">Local o200k reference · no AI call</option><option value="gemini">Configured Gemini · sends prompt for counting</option></select></label><div class="inline-build-actions"><button type="button" class="button light" data-compile-prompt>Compact template &amp; compare</button><button type="button" class="text-link" data-original-prompt hidden>Use original</button></div><p data-compiler-status role="status">Sign in to measure size. Your project brief stays word-for-word intact.</p><details><summary>How this works &amp; advanced options</summary><p>We compact only our known builder template, never your requirements. Custom prompts stay unchanged unless you enable experimental encodings. Real counts include all instructions; savings depend on the target tokenizer. Build quality and total build cost have not been benchmarked.</p><label class="compiler-experimental"><input type="checkbox" data-experimental> Compare experimental JSON/dictionary encodings</label><p>These can reduce repeated text, but coding models may not follow encoded instructions equally well.</p></details></details>';
 field.after(panel);
 let original=field.value,applied=field.value,revision=0;
 const button=panel.querySelector('[data-compile-prompt]'),restore=panel.querySelector('[data-original-prompt]'),status=panel.querySelector('[data-compiler-status]'),target=panel.querySelector('select'),experimental=panel.querySelector('[data-experimental]');
 const updateField=value=>{field.value=value;applied=value;field.oninput?.();};
 function reset(){revision++;original=field.value;applied=field.value;restore.hidden=true;status.textContent='Prompt updated. Compare again to measure this version.';}
 field.addEventListener('input',reset);
 // Explicit event covers programmatic task/style/change-request regeneration.
 field.addEventListener('apex:prompt-source-changed',reset);
 restore.onclick=()=>{if(field.value!==applied){reset();return;}revision++;updateField(original);restore.hidden=true;status.textContent='Original prompt restored.';};
 const optionsChanged=()=>{revision++;if(field.value===applied)updateField(original);else original=applied=field.value;restore.hidden=true;status.textContent='Options changed. Measure again; counts are not interchangeable between models.';};
 target.onchange=optionsChanged;experimental.onchange=optionsChanged;
 button.onclick=async()=>{
  if(field.value!==applied){original=field.value;applied=original;}
  const source=original,previous=applied,ticket=++revision,options={allowExperimental:experimental.checked};button.disabled=true;panel.setAttribute('aria-busy','true');status.textContent='Checking requirements and counting tokens…';
  try{
   const result=await request('/api/prompt/compile','POST',{source,target:target.value,...options});
   if(ticket!==revision||!panel.isConnected||field.value!==previous)return;
   validateCompilation(source,result,options);
   updateField(result.text);restore.hidden=result.format==='original';
   const note=result.format==='original'?'No worthwhile saving; kept original.':result.experimental?'Experimental encoding; source recovery checked.':'Your brief is unchanged; our template is more compact.';
   status.textContent=`${result.originalTokens.toLocaleString()} → ${result.selectedTokens.toLocaleString()} tokens · ${result.savedPercent}% input reduction · ${result.tokenizer}. ${note} Build quality not yet benchmarked.`;
  }catch(error){if(ticket===revision&&panel.isConnected&&field.value===previous){updateField(source);restore.hidden=true;status.textContent=(error?.message||'Counter unavailable.')+' Original prompt retained.';}}
  finally{button.disabled=false;panel.removeAttribute('aria-busy');}
 };
 return {reset,panel};
}
