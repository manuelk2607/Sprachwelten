import {entryPreview,publicEntry} from '@/lib/content-public';
import { entryInput } from '@/lib/content';
import { account, body, respond, safe } from '@/lib/http';
import { addEntry, listEntries, rateLimit } from '@/db/repository';
export const GET = (request: Request) => safe(async () => {
  const q = new URL(request.url).searchParams;
  const kind=q.get('kind')??'', language=q.get('language')??'', search=(q.get('q')??'').slice(0,100);
  const offset=Math.max(0,Math.min(10000, Number(q.get('offset'))||0));
  return respond({ entries: (await listEntries(kind,language,search,offset)).map(entryPreview) });
});
export const POST = (request: Request) => safe(async () => {
  const user=await account(); const input=await body(request,entryInput); await rateLimit(`entry:${user.id}`,20);
  const entry=await addEntry(input,user.id,user.name); return respond({ entry:publicEntry(entry) },201);
});
