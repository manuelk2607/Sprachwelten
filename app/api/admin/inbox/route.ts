import { requireAdministrator } from "@/lib/admin";
import { body, respond, safe } from "@/lib/http";
import {
  inbox,
  markInboxEntrySeen,
  markInboxSeen,
} from "@/db/community-repository";
import { z } from "zod";
export const GET = () =>
  safe(async () => respond(await inbox(await requireAdministrator())));
export const POST = (request: Request) =>
  safe(async () => {
    const admin = await requireAdministrator();
    const input = await body(
      request,
      z
        .object({ action: z.literal("seen"), entryId: z.uuid().optional() })
        .strict(),
    );
    if (input.entryId) await markInboxEntrySeen(admin, input.entryId);
    else await markInboxSeen(admin);
    return respond({ ok: true });
  });
