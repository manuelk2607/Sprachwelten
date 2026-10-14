import { account, body, respond, safe } from '@/lib/http';
import { rateLimit } from '@/db/repository';
import { suggestTranslation, translationAvailable, translationRequest } from '@/lib/translation-service';
export const GET=()=>respond({available:translationAvailable()});
export const POST=(request:Request)=>safe(async()=>{
  const user=await account();const input=await body(request,translationRequest);
  await rateLimit(`translation:${user.id}`,20);
  return respond(await suggestTranslation(input.texts,input.sourceLocale));
});
