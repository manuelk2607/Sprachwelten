import {body,respond,safe} from '@/lib/http';
import {requireLearningUser} from '@/lib/auth/learning-session';
import {notebookInput} from '@/lib/vocabulary';
import {createNotebook,listNotebooks} from '@/db/notebooks';
import {rateLimit} from '@/db/repository';
export const GET=(request:Request)=>safe(async()=>{const user=await requireLearningUser(request);return respond({notebooks:await listNotebooks(user.id)});});
export const POST=(request:Request)=>safe(async()=>{const input=await body(request,notebookInput),user=await requireLearningUser(request);await rateLimit('notebook-create:'+user.id,30);return respond({notebook:await createNotebook(user.id,input)},201);});
