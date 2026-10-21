import { z } from "zod";
import { requireAdministrator } from "@/lib/admin";
import { body, respond, safe } from "@/lib/http";
import { resolveReport } from "@/db/report-repository";
export const PATCH = (
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) =>
  safe(async () => {
    const admin = await requireAdministrator(),
      id = z.uuid().parse((await ctx.params).id),
      input = await body(
        request,
        z
          .object({ revision: z.number().int().min(0), resolved: z.boolean() })
          .strict(),
      );
    await resolveReport(id, input.revision, input.resolved, admin);
    return respond({ ok: true });
  });
