import { account, body, respond, safe } from '@/lib/http';
import { rateLimit } from '@/db/repository';
import { suggestTranslation, translationAvailable, translationRequest } from '@/lib/translation-service';
import { getTranslationAI } from '@/lib/cloudflare-ai';
export const GET=async()=>respond({available:translationAvailable(await getTranslationAI())});
export const POST=(request:Request)=>safe(async()=>{
  const user=await account();const input=await body(request,translationRequest);
  await rateLimit(`translation:${user.id}`,20);
  return respond(await suggestTranslation(input.texts,input.sourceLocale,await getTranslationAI()));
});
