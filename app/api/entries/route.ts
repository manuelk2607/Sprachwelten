import {publicEntry} from '@/lib/content-public';
import { entryInput } from '@/lib/content';
import { body, respond, safe } from '@/lib/http';
import {contributor,limitContribution,withContributor} from '@/lib/contributor';
import { addEntry, listEntries } from '@/db/repository';
export const GET = (request: Request) => safe(async () => {
  const q = new URL(request.url).searchParams;
  const kind=q.get('kind')??'', language=q.get('language')??'', search=(q.get('q')??'').slice(0,100);
  const offset=Math.max(0,Math.min(10000, Number(q.get('offset'))||0));
  return respond({ entries: await listEntries(kind,language,search,offset) });
});
export const POST = (request: Request) => safe(async () => {
  const input=await body(request,entryInput),user=await contributor(request);await limitContribution(request,user,'entry');
  const entry=await addEntry(input,user.id,user.name);return withContributor(respond({entry:publicEntry(entry)},201),request,user);
});
