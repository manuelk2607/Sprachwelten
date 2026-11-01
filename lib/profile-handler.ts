import type { ZodType } from "zod";
import {
  passwordChangeInput,
  emailChangeInput,
  emailConfirmInput,
} from "./account-settings";
import { profileInput } from "./profile";
import { body, safe } from "./http";
import { GameError } from "./game-error";
export function accountMutationPath(parts: string[]) {
  let value = parts.join("/");
  try {
    for (let i = 0; i < 3; i++) {
      const decoded = decodeURIComponent(value);
      if (decoded === value) break;
      value = decoded;
    }
    return new URL(
      "https://auth.invalid/" + value.replace(/\\/g, "/").replace(/^\/+/, ""),
    ).pathname
      .replace(/\/+/g, "/")
      .replace(/\/$/, "")
      .toLowerCase();
  } catch {
    return "";
  }
}
export const isProfileUpdatePath = (parts: string[]) =>
  accountMutationPath(parts) === "/update-user";
export function accountMutationSchema(parts: string[]) {
  return (
    {
      "/update-user": profileInput,
      "/change-password": passwordChangeInput,
      "/email-otp/request-email-change": emailChangeInput,
      "/email-otp/change-email": emailConfirmInput,
    } as Record<string, ZodType>
  )[accountMutationPath(parts)];
}
// The identity always comes from the managed session; no target ID is accepted.
export function updateOwnProfile(
  request: Request,
  session: () => Promise<{ id: string }>,
  forward: (request: Request) => Promise<Response>,
  schema: ZodType = profileInput,
) {
  return safe(async () => {
    if (request.method !== "POST")
      throw new GameError("Diese Anfrage ist nicht erlaubt.", 405);
    await session();
    const input = await body(request, schema),
      headers = new Headers(request.headers);
    headers.delete("content-length");
    const response = await forward(
      new Request(request.url, {
        method: "POST",
        headers,
        body: JSON.stringify(input),
      }),
    );
    const result = new Response(response.body, response);
    result.headers.set("Cache-Control", "no-store");
    return result;
  });
}
