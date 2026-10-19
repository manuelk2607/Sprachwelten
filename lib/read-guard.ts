// Keep these declarations shared by local builds and direct Worker deployments.
export const readLimitBindings = [
  {
    name: "PUBLIC_READ_LIMITER",
    namespace_id: "2026101901",
    simple: { limit: 120, period: 60 as const },
  },
  {
    name: "ROOM_IP_LIMITER",
    namespace_id: "2026101902",
    simple: { limit: 1200, period: 60 as const },
  },
  {
    name: "ROOM_READ_LIMITER",
    namespace_id: "2026101903",
    simple: { limit: 90, period: 60 as const },
  },
];
type Limiter = {
  limit: (options: { key: string }) => Promise<{ success: boolean }>;
};
export type ReadLimitEnv = {
  PUBLIC_READ_LIMITER?: Limiter;
  ROOM_IP_LIMITER?: Limiter;
  ROOM_READ_LIMITER?: Limiter;
};
export async function guardReadRequest(request: Request, env: ReadLimitEnv) {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  let path = new URL(request.url).pathname;
  try {
    path = decodeURIComponent(path);
  } catch {
    /* Invalid paths still receive the generic API allowance. */
  }
  path = path.replace(/\/+/g, "/").replace(/\/$/, "");
  if (
    !path.startsWith("/api/") ||
    path === "/api/auth" ||
    path.startsWith("/api/auth/")
  )
    return null;
  const room = /^\/api\/rooms\/[A-Z0-9]{6}(?:\/audio\/[a-f0-9-]+)?$/.test(path);
  const ip = request.headers.get("cf-connecting-ip") ?? "local";
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(ip),
  );
  const ipKey = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  const allowed = await (
    room ? env.ROOM_IP_LIMITER : env.PUBLIC_READ_LIMITER
  )?.limit({ key: ipKey });
  if (allowed?.success === false) return limited();
  if (room && env.ROOM_READ_LIMITER) {
    const token =
      request.headers.get("authorization") ??
      request.headers.get("cookie") ??
      "";
    const credentialHash = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(token),
    );
    const key =
      ipKey +
      ":" +
      path.split("/").slice(0, 4).join("/") +
      ":" +
      Array.from(new Uint8Array(credentialHash), (byte) =>
        byte.toString(16).padStart(2, "0"),
      ).join("");
    if (!(await env.ROOM_READ_LIMITER.limit({ key })).success) return limited();
  }
  return null;
}
function limited() {
  return Response.json(
    { error: "Zu viele Anfragen. Bitte warte einen Moment." },
    {
      status: 429,
      headers: {
        "Retry-After": "60",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
