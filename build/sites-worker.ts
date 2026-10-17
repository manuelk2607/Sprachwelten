import handler from "vinext/server/fetch-handler";
import {maintainAudio} from '../db/audio-maintenance';
export default {
  scheduled(_event:ScheduledController,env:Cloudflare.Env&{DATABASE_URL:string;AUDIO:R2Bucket},ctx:ExecutionContext){
    ctx.waitUntil(maintainAudio(env.DATABASE_URL,env.AUDIO).then(result=>{console.info('Audio maintenance',result);}));
  },
  fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext) {
    return handler.fetch(request, env, ctx);
  },
};
