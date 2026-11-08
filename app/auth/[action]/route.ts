import { rateLimit } from "@/db/repository";
import { GameError } from "@/lib/game";
import { hashToken } from "@/lib/http";
import { projectIdentity, worldsConfig, worldsQuery } from "@/lib/auth/learning-session";
import { worldsPaths, worldsRoute } from "@/lib/auth/worlds";

async function handle(request: Request) {
  const config = worldsConfig();
  const url = new URL(request.url);
  let response: Response;
  if (!config || url.origin !== config.origin || !worldsPaths.includes(url.pathname)) response = new Response(null, {status: 404});
  else if(['/auth/status','/auth/worlds','/auth/worlds-en'].includes(url.pathname)&&request.method!=='GET')response=new Response(null,{status:405});
  else {
    try {
      const ip = await hashToken(request.headers.get("cf-connecting-ip") ?? "local");
      await rateLimit("worlds:" + url.pathname + ":" + ip, ["/auth/login","/auth/start"].includes(url.pathname) ? 12 : 60, 60);
      if(url.pathname==='/auth/status'){
        const identity=await projectIdentity(request);if(identity.error)throw identity.error;
        response=Response.json({user:identity.source==='worlds'?identity.user??null:null,csrf:identity.source==='worlds'?identity.csrf:undefined});
      }else if(['/auth/worlds','/auth/worlds-en'].includes(url.pathname)){
        const identity=await projectIdentity(request);if(identity.error)throw identity.error;
        response=await worldsRoute(request,config,worldsQuery,identity.source==='legacy'&&!!identity.user);
      }else response = await worldsRoute(request, config, worldsQuery);
    } catch (error) {
      response = new Response(null, {status: error instanceof GameError ? error.status : 503});
    }
  }
  const headers = new Headers(response.headers);
  headers.set("cache-control", "no-store");
  headers.set("x-robots-tag", "noindex, nofollow");
  headers.set("referrer-policy", "no-referrer");
  headers.set("x-content-type-options", "nosniff");
  headers.set("content-security-policy", "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self' https:");
  return new Response(response.body, {status: response.status, headers});
}
export const GET = handle;
export const POST = handle;
