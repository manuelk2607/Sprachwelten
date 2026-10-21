import { body, hashToken, playerToken, respond, safe } from "@/lib/http";
import { roomCode } from "@/lib/content";
import { reportInput, reportedRound } from "@/lib/round-reports";
import { getRoom, rateLimit } from "@/db/repository";
import { addRoundReport } from "@/db/report-repository";
export const POST = (
  request: Request,
  ctx: { params: Promise<{ code: string }> },
) =>
  safe(async () => {
    const code = roomCode.parse((await ctx.params).code),
      token = await playerToken(request),
      input = await body(request, reportInput);
    const { state } = await getRoom(code, false),
      report = reportedRound(state, token, input);
    await rateLimit("report:" + token, 20);
    await addRoundReport(
      await hashToken(report.key),
      report.entry,
      state.mode ?? "idiom-bluff",
      input.reason,
      input.note,
    );
    return respond({ ok: true });
  });
