import {z} from 'zod';
import {respond,safe} from '@/lib/http';
import {getAuth} from '@/lib/auth/server';
import {languagePairInput} from '@/lib/vocabulary';
import {vocabularyCards} from '@/db/notebooks';
const filter=languagePairInput.safeExtend({notebookId:z.uuid().optional(),query:z.string().max(200).optional(),level:z.enum(['A1','A2','B1','B2','C1','C2']).optional(),topic:z.string().max(100).optional(),status:z.enum(['all','new','due','difficult','known']).optional(),sort:z.enum(['alpha','recent','due','difficult']).optional(),offset:z.coerce.number().int().min(0).max(10000).default(0),locale:z.enum(['de','en']).default('de')});
export const GET=(request:Request)=>safe(async()=>{const value=filter.parse(Object.fromEntries(new URL(request.url).searchParams)),{data}=await getAuth().getSession();return respond(await vocabularyCards(data?.user?.id,value,value.locale));});
