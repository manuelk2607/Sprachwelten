import {requireAdministrator} from '@/lib/admin';
import {respond,safe} from '@/lib/http';
import {adminEntries} from '@/db/admin-repository';
export const GET=(request:Request)=>safe(async()=>{await requireAdministrator();const q=new URL(request.url).searchParams;return respond(await adminEntries((q.get('q')??'').slice(0,100),q.get('removed')==='true',Math.max(0,Math.min(100000,Number(q.get('offset'))||0))));});
