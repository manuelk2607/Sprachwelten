import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {neon} from '@neondatabase/serverless';

// Read-only reconciliation. Paths and connection values are never printed.
const directory=process.env.MUSIC_MIGRATION_PRIVATE_DIR;
assert.ok(directory,'MUSIC_MIGRATION_PRIVATE_DIR is required');
assert.ok(process.env.DATABASE_URL,'Source DATABASE_URL is required');
const bytes=await readFile(`${directory}/legacy/sprachwelten-song-archive.json`);
const checksum=(await readFile(`${directory}/legacy/sprachwelten-song-archive.sha256`,'utf8')).trim();
assert.equal(createHash('sha256').update(bytes).digest('hex'),checksum,'Archive checksum mismatch');
const archive=JSON.parse(bytes.toString());
assert.equal(archive.sourceProject,'Sprachwelten');
assert.equal(archive.audioBytesIncluded,false);
const archived=archive.tables.content_entries as Record<string,unknown>[];
const connections=JSON.parse(await readFile(`${directory}/connections.json`,'utf8'));
assert.notEqual(new URL(connections.production).hostname,new URL(process.env.DATABASE_URL).hostname,'Source and destination must differ');
const source=neon(process.env.DATABASE_URL),destination=neon(connections.production);
const current=await source`SELECT * FROM content_entries WHERE challenge->>'type'='attribution' AND challenge->>'category'='song' ORDER BY id`;
const stable=(value:unknown):string=>JSON.stringify(value,(_key,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
assert.equal(stable(current),stable([...archived].sort((a,b)=>String(a.id).localeCompare(String(b.id)))),'Source changed since archive');
const imported=await destination`SELECT l.source_id::text,l.target_id::text,l.source_revision,l.source_author_reference,l.archive_checksum,c.author_id,c.body,c.status,c.review FROM legacy_imports l JOIN contributions c ON c.id=l.target_id WHERE l.source_project='Sprachwelten' ORDER BY l.source_id`;
assert.equal(imported.length,archived.length);
assert.equal(new Set(imported.map(x=>x.target_id)).size,archived.length);
for(const entry of archived){
 const row=imported.find(x=>x.source_id===entry.id);assert.ok(row,'Missing source mapping');
 assert.equal(row.target_id,entry.id);assert.equal(row.source_revision,entry.revision??0);
 assert.equal(row.source_author_reference,entry.author_id??null);assert.equal(row.archive_checksum,checksum);
 const challenge=entry.challenge as {answer:string;artist:string;album?:string};
 assert.equal(row.body.prompt,entry.phrase);assert.equal(row.body.song.title,challenge.answer);
 assert.equal(row.body.song.language,entry.language);assert.deepEqual(row.body.song.artists,[challenge.artist]);
 assert.equal(row.body.song.album,challenge.album??'');
 if(!entry.author_id)assert.equal(row.author_id,null,'Invented owner');
 if(row.body.rights.basis==='rights_unverified')assert.notEqual(row.status,'approved','Uncleared content published');
}
console.log(JSON.stringify({archiveChecksumVerified:true,sourceUnchanged:current.length,mappingsVerified:imported.length,approved:imported.filter(x=>x.status==='approved').length,private:imported.filter(x=>x.status!=='approved').length,audioBytesCopied:0}));
