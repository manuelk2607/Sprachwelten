import { z } from "zod";
import { playableModeIds } from "@/lib/modes";
import { gameLanguagesInput } from "@/lib/game-languages";
import { respond, safe } from "@/lib/http";
import { readyGameDifficulties } from "@/db/editorial-repository";
const schema = z.object({
  mode: z.enum(playableModeIds),
  gameLanguages: gameLanguagesInput,
  meaningCategory: z
    .enum(["all", "expression", "gaming", "youth", "academic"])
    .optional(),
  pronunciationCategory: z.enum(["both", "twister", "sound"]).optional(),
  attributionCategory: z.enum(["both", "person", "song"]).optional(),
});
export const GET = (request: Request) =>
  safe(async () => {
    const params = Object.fromEntries(new URL(request.url).searchParams),
      input = schema.parse({
        ...params,
        gameLanguages: (params.languages ?? "").split(","),
      });
    return respond({ levels: await readyGameDifficulties(input.mode, input) });
  });
