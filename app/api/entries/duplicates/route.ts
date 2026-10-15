import { findDuplicateEntry } from '@/db/repository';
import { duplicateLookupInput } from '@/lib/entry-duplicates';
import { respond, safe } from '@/lib/http';
export const GET=(request:Request)=>safe(async()=>{
  const input=duplicateLookupInput.parse(Object.fromEntries(new URL(request.url).searchParams));
  return respond({duplicate:await findDuplicateEntry(input)??null});
});
