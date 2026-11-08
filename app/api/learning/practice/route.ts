import { z } from "zod";
import { body, respond, safe, hashToken } from "@/lib/http";
import { contributor, withContributor } from "@/lib/contributor";
import { rateLimit } from "@/db/repository";
import { startLearning, answerLearning,revealVocabulary } from "@/db/learning-repository";
import {languagePairInput} from '@/lib/vocabulary';
import {startVocabulary} from '@/db/notebooks';
import { learningFilter } from "@/lib/learning-content";
const input = z.discriminatedUnion("action", [
  languagePairInput.safeExtend({action:z.literal('vocabulary'),locale:z.enum(['de','en']),notebookId:z.uuid().optional(),ids:z.array(z.uuid()).min(1).max(100).optional(),status:z.enum(['all','new','due','difficult','known']).default('all'),level:z.string().max(2).optional(),topic:z.string().max(100).optional(),exercise:z.enum(['writing','flashcard']).default('writing'),direction:z.enum(['forward','reverse','both']).default('forward')}),
  z.object({action:z.literal('reveal'),id:z.uuid(),locale:z.enum(['de','en'])}),
  learningFilter.extend({
    action: z.literal("start"),
    locale: z.enum(["de", "en"]),
    review: z.boolean().default(false),
  }),
  z.object({
    action: z.literal("answer"),
    id: z.uuid(),
    answer: z.string().trim().max(300).default(''),
    remembered:z.boolean().optional(),
    locale: z.enum(["de", "en"]),
  }).refine(v=>!!v.answer||v.remembered!==undefined,'Bitte eine Antwort eingeben.'),
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
      value.action==='vocabulary'?await startVocabulary(user.id,!user.guest,value,value.locale,value.exercise,value.direction):value.action==='reveal'?await revealVocabulary(user.id,value.id,value.locale):value.action === "start"
        ? await startLearning(
            user.id,
            !user.guest,
            value,
            value.locale,
            value.review,
          )
        : await answerLearning(user.id, value.id, value.answer, value.locale,value.remembered);
    return withContributor(respond(result), request, user);
  });
