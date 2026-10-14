import type { TranslationAI } from './translation-service';
export async function getTranslationAI():Promise<TranslationAI|undefined> {
  // Loaded only in the Worker runtime, so Node-based checks need no Cloudflare emulator.
  try {
    const {env}=await import('cloudflare:workers');
    const ai=(env as Cloudflare.Env&{AI?:TranslationAI}).AI;
    return ai&&typeof ai.run==='function'?ai:undefined;
  }catch{return undefined;}
}
