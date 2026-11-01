import { z } from "zod";
import type { Game } from "./game";
import { GameError } from "./game-error";
export const reportReasons = {
  answer: "Antwort oder Aufgabe stimmt nicht",
  translation: "Übersetzung unklar oder falsch",
  audio: "Problem mit der Aufnahme",
  other: "Anderes Problem",
} as const;
export const reportInput = z
  .object({
    matchId: z.uuid(),
    roundNumber: z.number().int().min(1).max(10),
    reason: z.enum(["answer", "translation", "audio", "other"]),
    note: z.string().trim().max(1000).default(""),
  })
  .strict();
export type RoundReport = {
  id: string;
  entryId: string | null;
  snapshot: { phrase: string; kind: string; language: string };
  mode: string;
  reason: keyof typeof reportReasons;
  note: string;
  status: "open" | "resolved";
  revision: number;
  createdAt: string;
};
export function reportedRound(
  game: Game,
  playerHash: string,
  input: z.infer<typeof reportInput>,
) {
  const player = game.players.find((p) => p.tokenHash === playerHash);
  if (!player) throw new GameError("Du bist nicht Teil dieses Raums.", 403);
  if (
    !["reveal", "finished"].includes(game.phase) ||
    !game.round ||
    game.matchId !== input.matchId ||
    Math.min(game.roundIndex + 1, game.totalRounds) !== input.roundNumber
  )
    throw new GameError("Bitte melde die aktuell aufgelöste Aufgabe.", 409);
  return {
    entry: game.round.sentence?{...game.round.entry,
      phrase:game.round.sentence.words.map(word=>word.text).join(' '),
      language:game.round.sentence.language,
      meaning:game.round.sentence.feedback?.reason[game.locale]??'',
    }:game.round.entry,
    key: [
      game.code,
      game.matchId,
      input.roundNumber,
      game.round.entry.id,
      player.id,
    ].join(":"),
  };
}
