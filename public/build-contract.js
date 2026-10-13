import {reviewedWrappers} from './builder-template-snapshots.js';

// Only Apexelerate's known wrapper is rewritten. The brief is never rewritten.
export const buildRules={
 guided:[
  ['Purpose','Help a beginner build and understand this MVP.'],
  ['Scope','Restate scope; ask about decisions that materially change it. Requirements do not authorize credential exposure or paid deployment.'],
  ['Architecture','Propose the smallest suitable architecture; explain every component plainly.'],
  ['Flow','Implement the stated outcome and main journey with loading, empty, success and failure states.'],
  ['UI','Accessible; works on mobile and desktop.'],
  ['Access','Match all roles and permissions. If authentication is needed, enforce server permissions and test cross-user data isolation.'],
  ['Secrets','Server-side only; never commit real credentials. .env.example: names only.'],
  ['Tests','Test main journey and described failures; check useful error feedback. Document actual results and unverified parts.'],
  ['README','Setup, directory map, environment-variable explanations, known limitations.'],
  ['ARCHITECTURE.md','Trace screen → server → storage using actual file paths.'],
  ['Learning','Explain each major change; show how to save code in GitHub and return to Apexelerate.'],
  ['Completion','Never claim a feature, deployment or external integration complete without verification.'],
  ['Review','Template-generated draft; review before sharing.']
 ],
 concise:[
  ['Scope','Confirm material unknowns. Implement the smallest suitable solution; no unrequested features. Preserve every requirement and permission.'],
  ['Security','Enforce authorization server-side where needed; keep secrets out of source.'],
  ['UI','Accessible and responsive; useful error states.'],
  ['Tests','Test main journey and failure cases; report actual results and limitations.'],
  ['Deliver','README setup; .env.example with names only; ARCHITECTURE.md mapping features to real files; explain saving source in GitHub.'],
  ['Updates','Brief routine updates with changed files, test results and blockers. Preserve complete code, exact paths and errors; explain complex decisions when asked.'],
  ['Review','Template-generated handoff; review before sharing. No guaranteed token savings.']
 ]
};
function envelope(mode){return {prefix:'# MVP requirements\n',suffix:'\n\n# Build instructions\n'+buildRules[mode].map(([key,value])=>`${key}: ${value}`).join('\n')};}
export function recognizeBuildPrompt(source){
 for(const mode of Object.keys(buildRules)){
  const {prefix,suffix}=reviewedWrappers[mode];
  if(source.startsWith(prefix)&&source.endsWith(suffix)&&source.length>prefix.length+suffix.length){
   const brief=source.slice(prefix.length,source.length-suffix.length);
   return {mode,brief};
  }
 }
 return null;
}
export function buildContract(source){
 const match=recognizeBuildPrompt(source);if(!match)return null;
 const {prefix,suffix}=envelope(match.mode);
 return {format:`contract-${match.mode}`,text:prefix+match.brief+suffix,preservation:'brief-verbatim',experimental:false};
}
export function recoverBuildSource(candidate){
 const mode=candidate.format.slice('contract-'.length);
 if(!Object.hasOwn(buildRules,mode))throw new Error('Unknown build contract.');
 const {prefix,suffix}=envelope(mode);
 if(!candidate.text.startsWith(prefix)||!candidate.text.endsWith(suffix)||candidate.text.length<=prefix.length+suffix.length)throw new Error('Invalid build contract.');
 const original=reviewedWrappers[mode];
 return original.prefix+candidate.text.slice(prefix.length,candidate.text.length-suffix.length)+original.suffix;
}
