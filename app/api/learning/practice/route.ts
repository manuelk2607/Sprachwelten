import { z } from "zod";
import { body, respond, safe, hashToken } from "@/lib/http";
import { contributor, withContributor } from "@/lib/contributor";
import { rateLimit } from "@/db/repository";
import { startLearning, answerLearning } from "@/db/learning-repository";
import { learningFilter } from "@/lib/learning-content";
const input = z.discriminatedUnion("action", [
  learningFilter.extend({
    action: z.literal("start"),
    locale: z.enum(["de", "en"]),
    review: z.boolean().default(false),
  }),
  z.object({
    action: z.literal("answer"),
    id: z.uuid(),
    answer: z.string().trim().min(1).max(300),
    locale: z.enum(["de", "en"]),
  }),
]);
export const POST = (request: Request) =>
  safe(async () => {
    const value = await body(request, input),
      user = await contributor(request);
    if (user.guest)
      await rateLimit(
        "learning-ip:" +
          (await hashToken(request.headers.get("cf-connecting-ip") ?? "local")),
        120,
      );
    await rateLimit("learning:" + user.id, 120);
    const result =
      value.action === "start"
        ? await startLearning(
            user.id,
            !user.guest,
            value,
            value.locale,
            value.review,
          )
        : await answerLearning(user.id, value.id, value.answer, value.locale);
    return withContributor(respond(result), request, user);
  });
