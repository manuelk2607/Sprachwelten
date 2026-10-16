import {requireAdministrator} from '@/lib/admin';
import {respond,safe} from '@/lib/http';
import {pendingSuggestions} from '@/db/community-repository';
export const GET=()=>safe(async()=>{await requireAdministrator();return respond({suggestions:await pendingSuggestions()});});
