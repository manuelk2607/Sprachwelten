import test from 'node:test';
import assert from 'node:assert/strict';
import {musicHelp,musicPoint,musicRound,validateMusicTask,type MusicTask} from '../transfer/music-worlds/quiz';
const task:MusicTask={id:'original-demo',kind:'text',language:'de',rights:{basis:'original',evidence:'Synthetic test fixture, no lyrics'},prompt:'Synthetic clue',answer:'A',alternatives:['B','C','D'],hint:'Hint',album:'Album'};
test('portable music core requires rights and distinct titles, shuffles opaque choices and stages helpers',()=>{
 assert.throws(()=>validateMusicTask({...task,rights:{basis:'licensed',evidence:''}}));
 assert.throws(()=>validateMusicTask({...task,alternatives:['a','C','D']}));
 let n=0;const round=musicRound(task,a=>a.reverse(),()=>String(++n));
 assert.equal(round.choices[3].text,'A');assert.equal(musicPoint(round.correctId,round.choices[3].id),1);
 assert.equal(musicPoint(round.correctId,round.choices[0].id),0);
 assert.deepEqual(musicHelp(task,0),{hint:'',album:''});assert.deepEqual(musicHelp(task,1),{hint:'Hint',album:''});
 assert.deepEqual(musicHelp(task,2),{hint:'Hint',album:'Album'});
 validateMusicTask({...task,kind:'audio',prompt:'private-object-reference'});
});
