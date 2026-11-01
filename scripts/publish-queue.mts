import {readFile,writeFile,rename,open,unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {request} from '@playwright/test';
import {publicationCards} from './publication-cards';
import {createQueue,queueSchema,summary,ownerId,origin,type PublicationQueue} from './publication-queue';

const path=resolve('publication-queue.json'),lock=path+'.lock',apply=process.argv.includes('--publish');
// This explicit lock prevents two local workers from racing. Never auto-delete a stale lock.
const handle=await open(lock,'wx');
let queue:PublicationQueue;
const persist=async()=>{queueSchema.parse(queue);await writeFile(path+'.tmp',JSON.stringify(queue,null,2)+'\n',{mode:0o600});await rename(path+'.tmp',path);};
try{
 try{queue=queueSchema.parse(JSON.parse(await readFile(path,'utf8')));}
 catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;queue=createQueue(publicationCards);await persist();}
 console.log(JSON.stringify(summary(queue)));
 if(apply){
  if(Date.now()<Date.parse(queue.notBefore))throw Error('Queue is waiting until '+queue.notBefore);
  const email=process.env.AUTH_TEST_EMAIL,password=process.env.AUTH_TEST_PASSWORD;
  if(!email||!password)throw Error('Provide the authorised owner account locally via AUTH_TEST_EMAIL and AUTH_TEST_PASSWORD. No credentials are saved.');
  const client=await request.newContext({baseURL:origin,extraHTTPHeaders:{Origin:origin},timeout:30000});
  let loggedIn=false;
  try{
   const login=await client.post('/api/auth/sign-in/email',{data:{email,password}});
   if(login.status()!==200)throw Error('Account login failed; response withheld');loggedIn=true;
   const identity=await (await client.get('/api/auth/get-session')).json();
   if(identity?.user?.id!==ownerId)throw Error('Wrong account; publication refused');
   for(const row of queue.items.filter(i=>i.status==='pending'||(process.argv.includes('--retry-failed')&&i.status==='failed'))){
    // A stale session must never silently turn a submission into a guest contribution.
    const session=await (await client.get('/api/auth/get-session')).json();
    if(session?.user?.id!==ownerId)throw Error('Session expired; stopped');
    const query=new URLSearchParams({kind:row.input.kind,language:row.input.language,phrase:row.input.phrase});
    const duplicate=await client.get('/api/entries/duplicates?'+query);
    if(!duplicate.ok())throw Error('Duplicate check unavailable; stopped');
    let id=(await duplicate.json()).duplicate?.id as string|undefined;
    let disposition:'existing'|'created'='existing';
    if(!id){
     const quota=await client.get('/api/me/contribution-limit');
     if(!quota.ok())throw Error('Deploy the read-only quota endpoint before publication. No POST sent.');
     const limit=await quota.json();
     if(!Number.isInteger(limit.remaining)||limit.remaining<0||limit.remaining>20)throw Error('Invalid quota response');
     if(limit.remaining===0){queue.notBefore=new Date(Date.parse(limit.resetAt)+2000).toISOString();await persist();break;}
     // Persist BEFORE sending: interruption/timeout requires reconciliation, never blind replay.
     row.attempts++;row.status='failed';row.error='Outcome unknown; reconcile duplicate before retry';await persist();
     const response=await client.post('/api/entries',{data:row.input,headers:{'X-Contribution-Owner':ownerId}});
     if(response.status()===429){row.status='pending';row.error='Rate limit; wait for reset';queue.notBefore=new Date(Date.now()+3602000).toISOString();await persist();break;}
     if(response.status()===409){id=(await response.json()).duplicate?.id;}
     else if(response.status()===201){id=(await response.json()).entry?.id;disposition='created';}
     else{row.error='HTTP '+response.status()+'; reconcile before retry';await persist();break;}
    }
    if(!id)throw Error('Missing stored entry ID');
    const stored=await client.get('/api/entries/'+encodeURIComponent(id));
    if(!stored.ok())throw Error('Read-after-write verification failed; reconcile before retry');
    const result=await stored.json();
    if(result.entry?.kind!==row.input.kind||result.entry?.language!==row.input.language)throw Error('Stored identity mismatch');
    if(disposition==='created'&&(!result.canEdit||!isDeepStrictEqual(result.entry.challenge,row.input.challenge)||result.entry.creditName!=='Manuel'))throw Error('Stored content or ownership mismatch');
    row.status='published';row.entryId=id;row.disposition=disposition;row.verifiedAt=new Date().toISOString();delete row.error;await persist();
    console.log(JSON.stringify(summary(queue)));
   }
  }finally{if(loggedIn)await client.post('/api/auth/sign-out',{data:{}}).catch(()=>{});await client.dispose();}
 }
}finally{await handle.close();await unlink(lock);}
