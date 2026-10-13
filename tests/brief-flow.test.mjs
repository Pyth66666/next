import test from 'node:test';
import assert from 'node:assert/strict';
import {problemAreas,briefSteps,setStepValue,stepValue} from '../public/brief-flow.js';

test('normal questions branch by problem area and keep free-text answers editable',()=>{
 const p={problemArea:'student',briefDepth:'normal',answers:Array(5).fill('')};
 assert.equal(problemAreas.length,6);
 const student=briefSteps(p);
 assert.equal(student.length,5);
 assert.match(student[0].suggestions.join(' '),/tutor|study/i);
 assert.match(student[1].suggestions.join(' '),/group|help|opportunity/i);
 p.problemArea='business';
 const business=briefSteps(p);
 assert.notDeepEqual(student[0].suggestions,business[0].suggestions);
 assert.match(business[1].suggestions.join(' '),/booking|order|product/i);
 setStepValue(p,business[0],'My exact words about my own problem.');
 assert.equal(stepValue(p,business[0]),'My exact words about my own problem.');
});

test('detailed path uses different foundation and six separate follow-ups',()=>{
 const p={problemArea:'team',briefDepth:'detailed',answers:Array(5).fill(''),detailAnswers:{}};
 const steps=briefSteps(p);
 assert.equal(steps.length,11);
 assert.match(steps[0].question,/one moment/);
 assert.match(steps[5].question,/allowed to see or change/);
 assert.notEqual(steps[0].question,briefSteps({...p,briefDepth:'normal'})[0].question);
 setStepValue(p,steps[5],'Only the owner can edit the request.');
 assert.equal(p.detailAnswers.roles,'Only the owner can edit the request.');
});
