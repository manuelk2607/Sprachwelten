import {execFileSync} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
// Source-only reference bundle. Production data, credentials, audio and seed content are excluded.
const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const files=execFileSync('git',['ls-files','lib','components','db','app/api','tests','transfer/music-worlds','docs/music-worlds-transfer.md','package.json','package-lock.json'],{encoding:'utf8'}).trim().split('\n').filter(p=>!/(seeds|fixtures|\.png$|\.wav$|\.mp3$)/i.test(p));
mkdirSync('outputs/music-worlds',{recursive:true,mode:0o700});
const target=`outputs/music-worlds/source-${commit}.tar`;
execFileSync('git',['archive','--format=tar',`--output=${target}`,commit,'--',...files]);
writeFileSync(target+'.sha256',createHash('sha256').update(readFileSync(target)).digest('hex')+'\n',{mode:0o600});
writeFileSync('outputs/music-worlds/manifest.json',JSON.stringify({commit,archive:target,files,contents:'source only; no production data or rights clearance'},null,2)+'\n',{mode:0o600});
console.log(`Source transfer archived at ${target}; production data export remains a separate prerequisite.`);
