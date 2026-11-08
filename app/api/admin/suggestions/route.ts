import {requireAdministrator} from '@/lib/admin';
import {respond,safe} from '@/lib/http';
import {pendingSuggestions} from '@/db/community-repository';
export const GET=(request:Request)=>safe(async()=>{await requireAdministrator(request);return respond({suggestions:await pendingSuggestions()});});
