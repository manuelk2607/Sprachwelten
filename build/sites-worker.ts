import handler from "vinext/server/fetch-handler";
import {maintainApplication} from '../db/maintenance';
import {securityHeaders} from '../lib/security-headers';
export default {
  scheduled(_event:ScheduledController,env:Cloudflare.Env&{DATABASE_URL:string;AUDIO:R2Bucket},ctx:ExecutionContext){
    ctx.waitUntil(maintainApplication(env.DATABASE_URL,env.AUDIO).then(result=>{console.info('Application maintenance',result);}));
  },
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext) {
    return securityHeaders(await handler.fetch(request, env, ctx));
  },
};
