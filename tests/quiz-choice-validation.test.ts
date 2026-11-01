import {test} from 'node:test';
import assert from 'node:assert/strict';
import {entryInput} from '../lib/content';
import {quizChoiceIdentity} from '../lib/challenges';
test('quiz answers reject Unicode and whitespace duplicates at the exact field without collapsing meaningful symbols',()=>{
 assert.equal(quizChoiceIdentity(' Café\u00a0 noir '),quizChoiceIdentity('Cafe\u0301  noir'));
 assert.notEqual(quizChoiceIdentity('C#'),quizChoiceIdentity('C++'));
 const result=entryInput.safeParse({kind:'idiom',phrase:'Ein Beispiel',language:'de',challenge:{type:'meaning',correctIndex:0,choices:[{de:'Café noir',en:'Black coffee'},{de:'Cafe\u0301  noir',en:'Other coffee'},{de:'Ein Tee',en:'Tea'},{de:'Ein Saft',en:'Juice'}]}});
 assert.equal(result.success,false);if(!result.success)assert.ok(result.error.issues.some(issue=>JSON.stringify(issue.path)===JSON.stringify(['challenge','choices',1,'de'])));
});
