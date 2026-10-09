import test from 'node:test';
import assert from 'node:assert/strict';
import {generate,checklist,questions} from '../public/engine.js';
test('draft preserves every part of the user brief and identifies generic assumptions',()=>{const p={type:'sop',answers:['Client onboarding','Reduce time to two days','Project manager','No extra budget','Collect brief; Confirm scope\nAssign designer']};const result=generate(p);for(const value of p.answers.slice(0,4))assert.ok(result.includes(value));assert.ok(result.includes('1. Collect brief'));assert.ok(result.includes('2. Confirm scope'));assert.ok(result.includes('3. Assign designer'));assert.ok(result.includes('not AI-generated'));assert.ok(result.includes('Owner: to assign'));});
test('blueprint has delivery terminology and all questions are present',()=>{assert.equal(questions.length,5);assert.ok(generate({type:'blueprint',answers:['Launch','Goal','Owner','Budget','Plan; Deliver']}).includes('Delivery plan'));});
test('each new checklist is independent and incomplete',()=>{const a=checklist({}),b=checklist({});a[0].done=true;assert.equal(b[0].done,false);assert.equal(b.length,5);assert.ok(b.every(t=>!t.done));});
