import { requireAdministrator } from "@/lib/admin";
import { body, respond, safe } from "@/lib/http";
import { bulkInput } from "@/lib/community-input";
import { bulkEdit, undoBulkEdit, bulkHistory } from "@/db/community-repository";
import { z } from "zod";
export const GET = () =>
  safe(async () => {
    await requireAdministrator();
    return respond({ batches: await bulkHistory() });
  });
export const POST = (request: Request) =>
  safe(async () => {
    const admin = await requireAdministrator(),
      data = await body(
        request,
        z.union([bulkInput, z.object({ undoBatchId: z.uuid() })]),
      );
    if ("undoBatchId" in data)
      return respond({
        ok: true,
        count: await undoBulkEdit(data.undoBatchId, admin),
      });
    const batchId = await bulkEdit(data, admin);
    return respond({ ok: true, count: data.entries.length, batchId });
  });
