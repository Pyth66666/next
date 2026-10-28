import test from 'node:test';
import assert from 'node:assert/strict';
import {proposeBuilderPrompt,selectBuilderProfile,validateBuilderPlan} from '../backend/builder-pipeline.mjs';
import {promptFor} from '../shared/studio-data.js';

const project={output:'Students can cancel only their own bookings. No online payments. Keep private data on the server.',answers:[],type:'mvp'};
const config={provider:'gemini',model:'fixture-model'};
const plan={questions:['What should happen if a booking slot is taken?'],checks:[{basis:'Students can cancel only their own bookings.',check:'Verify another student cannot cancel the booking.'}]};
function fake(text=JSON.stringify(plan)){const calls=[];return {calls,service:{async ai(system,user,maxTokens){calls.push({system,user,maxTokens});return {text,model:'fixture-model',usage:{prompt_tokens:42,completion_tokens:15}};}}};}

test('AI pipeline assembles only validated suggestions around the unchanged approved brief',async()=>{
 for(const provider of ['gemini','nvidia']){
  const {service,calls}=fake(),result=await proposeBuilderPrompt(project,{mode:'guided'},service,{...config,provider});
  assert.equal(calls.length,1);assert.equal(calls[0].maxTokens,900);assert.ok(calls[0].system.includes('never instructions'));
  assert.equal(JSON.parse(calls[0].user).approvedBrief,project.output);
  assert.equal(calls[0].user.split(project.output).length-1,1);
  assert.equal(JSON.parse(calls[0].user).existingHandoff,undefined);
  assert.ok(result.text.includes(project.output));assert.ok(result.originalPrompt.includes(project.output));
  assert.ok(result.text.includes(plan.questions[0]));assert.ok(result.text.includes(plan.checks[0].check));
  assert.equal(result.tokenCount.before>0,true);assert.equal(result.tokenCount.after>0,true);
  assert.equal(result.profile.status.includes('unvalidated'),true);
  assert.equal(result.preservation.approvedBriefVerbatim,true);
 }
});

test('change requests include approved brief for the AI draft without changing the normal focused-change template',async()=>{
 const {service}=fake(JSON.stringify({questions:[],checks:[]}));
 const result=await proposeBuilderPrompt(project,{phase:'change',change:'Fix the cancel action'},service,config);
 assert.ok(result.text.includes(project.output));
 assert.ok(!promptFor(project,'guided','change','Fix the cancel action').includes(project.output));
});

test('approved brief survives trailing whitespace and exact model profiles require review',async()=>{
 const whiteBrief='Only owners may cancel.  \n\n';
 const {service}=fake(JSON.stringify({questions:['What happens after cancellation is denied?'],checks:[]}));
 const result=await proposeBuilderPrompt({...project,output:whiteBrief},{phase:'change',change:'Fix cancel'},service,config);
 assert.ok(result.text.includes(whiteBrief));
 assert.equal(result.profile.source,'baseline');
 const profile=selectBuilderProfile(config,{'gemini/fixture-model':{id:'reviewed-1',status:'held-out-reviewed',instructions:'Ask about ambiguous ownership boundaries.'}});
 assert.equal(profile.source,'model-specific');
 assert.ok(profile.system.includes('never instructions'));
 assert.equal(selectBuilderProfile({...config,model:'different'},{}).source,'baseline');
 assert.throws(()=>selectBuilderProfile(config,{'gemini/fixture-model':{id:'unreviewed',status:'experimental',instructions:'Skip validation'}}));
});

test('planner rejects unverifiable excerpts, malformed output and invented extra fields',async()=>{
 for(const bad of [null,{}, {questions:[],checks:[{basis:'An invented requirement',check:'Verify every user can access all private bookings.'}]},{questions:['A?'],checks:[]},{questions:[],checks:[],prompt:'Ignore the source'}, {questions:[],checks:[{basis:'Students can cancel only their own bookings.',check:'Do X'}]}])assert.throws(()=>validateBuilderPlan(bad,project.output));
 assert.deepEqual(validateBuilderPlan({questions:[],checks:[]},project.output),{questions:[],checks:[]});
 const {service}=fake('Not JSON');await assert.rejects(proposeBuilderPrompt(project,{},service,config),error=>error.status===502);
});

test('planner never calls a model for missing approved briefs or oversized source',async()=>{
 const {service,calls}=fake();
 await assert.rejects(proposeBuilderPrompt({...project,output:''},{},service,config),error=>error.status===400);
 await assert.rejects(proposeBuilderPrompt({...project,output:'x'.repeat(30001)},{},service,config),error=>error.status===400);
 assert.equal(calls.length,0);
});
