import { z } from "zod";
import { database } from "@/db/repository";
import { respond, safe } from "@/lib/http";
import { modeInfo, playableModeIds } from "@/lib/modes";
const query = z.object({
  mode: z.enum(playableModeIds),
  meaningCategory: z
    .enum(["all", "expression", "gaming", "youth", "academic"])
    .optional(),
  pronunciationCategory: z.enum(["both", "twister", "sound"]).optional(),
  attributionCategory: z.enum(["both", "person", "song"]).optional(),
});
export const GET = (request: Request) =>
  safe(async () => {
    const input = query.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    if (input.mode === "word-chain") return respond({ languages: [] });
    const kinds =
      input.mode === "meaning-quiz"
        ? input.meaningCategory === "expression"
          ? ["idiom", "dialect"]
          : input.meaningCategory === "gaming"
            ? ["gaming_mission"]
            : input.meaningCategory === "youth"
              ? ["youth_chat"]
              : input.meaningCategory === "academic"
                ? ["academic"]
                : [
                    "idiom",
                    "dialect",
                    "gaming_mission",
                    "youth_chat",
                    "academic",
                  ]
        : input.mode === "tongue-twisters"
          ? input.pronunciationCategory === "twister"
            ? ["tongue_twister"]
            : input.pronunciationCategory === "sound"
              ? ["sound_pair"]
              : ["tongue_twister", "sound_pair"]
          : [modeInfo(input.mode).kind];
    const category =
      input.mode === "who-said-it" && input.attributionCategory !== "both"
        ? (input.attributionCategory ?? "")
        : "";
    const field =
      input.mode === "word-builder"
        ? "challenge->>'targetLanguage'"
        : "language";
    const rows = await database().query(
      `SELECT ${field} AS code,count(*)::int AS count FROM content_entries WHERE deleted_at IS NULL AND kind=ANY($1::text[]) AND ($2='' OR challenge->>'category'=$2) GROUP BY ${field} ORDER BY ${field} LIMIT 64`,
      [kinds, category],
    );
    if (input.mode === "false-friends") {
      const others = await database().query(
        `SELECT challenge->>'otherLanguage' AS code,count(*)::int AS count FROM content_entries WHERE deleted_at IS NULL AND kind='false_friend' GROUP BY challenge->>'otherLanguage' LIMIT 64`,
        [],
      );
      for (const row of others) {
        const existing = rows.find((r) => r.code === row.code);
        if (existing) existing.count += row.count;
        else rows.push(row);
      }
    }
    return respond({ languages: rows.filter((row) => row.code) });
  });
