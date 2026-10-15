import { registeredLanguageNames, searchLanguages } from '@/lib/language-registry';
import { isRegisteredLanguage } from '@/lib/language-codes';
import { respond, safe } from '@/lib/http';
export const GET=(request:Request)=>safe(async()=>{
  const query=new URL(request.url).searchParams;const locale=query.get('locale')==='en'?'en':'de';const code=query.get('code');
  if(code&&isRegisteredLanguage(code))return respond({languages:[{code,label:registeredLanguageNames(code)[locale]}]});
  return respond({languages:searchLanguages((query.get('q')??'').slice(0,80),locale)});
});
