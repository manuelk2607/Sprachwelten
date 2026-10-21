import { requireAdministrator } from "@/lib/admin";
import { respond, safe } from "@/lib/http";
import { reports } from "@/db/report-repository";
export const GET = (request: Request) =>
  safe(async () => {
    await requireAdministrator();
    return respond({
      reports: await reports(
        new URL(request.url).searchParams.get("resolved") === "true",
      ),
    });
  });
