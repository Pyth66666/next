import test from 'node:test';
import assert from 'node:assert/strict';
import {githubName} from '../public/repository-name.js';
test('GitHub project entry accepts ordinary links but rejects non-project and credential-bearing URLs',()=>{
 for(const input of ['owner/app',' https://github.com/owner/app ','https://github.com/owner/app/','https://github.com/owner/app.git'])assert.equal(githubName(input),'owner/app');
 for(const input of ['https://github.com/owner/app/tree/main','https://other.example/owner/app','http://github.com/owner/app','https://user:password@github.com/owner/app','https://github.com/owner/app?token=secret','https://github.com:444/owner/app','owner','../app','https://github.com/owner/app#main'])assert.throws(()=>githubName(input));
});
