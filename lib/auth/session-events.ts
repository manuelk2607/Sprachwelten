import type { AuthConfig } from "@worlds-hub/auth";
import {
  receiveSessionRevocation,
  sessionEventPublicKey,
  sessionRevocationPath,
} from "@worlds-hub/auth/session-revocation";
import { TransitionAuthStore } from "./transition-store";

export const worldsSessionEventKey = (
  env: Record<string, string | undefined>,
) => sessionEventPublicKey(env.WORLDS_HUB_SESSION_EVENT_JWK);

export async function receiveWorldsSessionEvent(
  request: Request,
  config: AuthConfig,
  env: Record<string, string | undefined>,
) {
  const key = worldsSessionEventKey(env);
  const store = config.store;
  if (!key || !(store instanceof TransitionAuthStore)) {
    return new Response(null, {
      status: 404,
      headers: {
        "cache-control": "no-store",
        "x-robots-tag": "noindex, nofollow",
      },
    });
  }
  return receiveSessionRevocation(
    request,
    {
      signer: "https://worlds-hub.maki26.workers.dev",
      audience: config.origin + sessionRevocationPath,
      identityIssuer: config.issuer,
      key,
    },
    (event) => store.applySessionRevocation(event),
  );
}
