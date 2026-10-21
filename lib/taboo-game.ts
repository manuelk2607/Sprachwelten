import type { Game } from "./game";
import { GameError } from "./game";
import type { Entry } from "./content";
import type { RoomAction } from "./content";
import { promptIdentity } from "./game-pool";
export type TabooState = {
  teams: [string[], string[]];
  scores: [number, number];
  turn: number;
  cursor: number;
  cardsPerTurn: number;
  used: number;
  describerId: string;
  judgeId: string;
  deadline: number | null;
  clue: string;
  guesses: { name: string; text: string }[];
  log: { word: string; result: "correct" | "skip" | "buzz" | "timeout" }[];
};
export const tabooTarget = (
  entry: Pick<Entry, "phrase" | "presentation" | "challenge">,
) =>
  entry.presentation === "audio" && entry.challenge?.type === "taboo"
    ? (entry.challenge.target ?? "")
    : entry.phrase;
export const tabooFold = (value: string) =>
  value
    .normalize("NFKD")
    .toLocaleLowerCase()
    .replace(/\p{M}/gu, "")
    .replaceAll("ß", "ss")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
export function tabooViolation(
  target: string,
  forbidden: string[],
  clue: string,
) {
  const words = " " + tabooFold(clue) + " ";
  return [target, ...forbidden].some((word) => {
    const term = tabooFold(word);
    return term.length >= 3
      ? words.includes(term)
      : words.includes(" " + term + " ");
  });
}
function deal(game: Game) {
  const t = game.taboo!,
    entry = game.prompts[t.cursor++];
  if (!entry)
    throw new GameError("Keine ungespielten Tabu-Karten mehr verfügbar.");
  game.round = { entry, answers: {}, votes: {}, options: [] };
  t.used++;
  t.clue = "";
  t.guesses = [];
  const history = (game.playedPrompts ??= []);
  if (!history.some((p) => p.id === entry.id))
    history.push({ id: entry.id, key: promptIdentity(entry) });
}
function begin(game: Game) {
  const t = game.taboo!,
    a = t.turn % 2,
    b = 1 - a;
  t.describerId = t.teams[a][Math.floor(t.turn / 2) % t.teams[a].length];
  t.judgeId = t.teams[b][Math.floor(t.turn / 2) % t.teams[b].length];
  t.deadline = null;
  t.used = 0;
  t.log = [];
  game.roundIndex = Math.floor(t.turn / 2);
  deal(game);
  game.phase = "briefing";
}
export function initializeTaboo(game: Game) {
  game.taboo = {
    teams: [
      game.players.filter((_, i) => i % 2 === 0).map((p) => p.id),
      game.players.filter((_, i) => i % 2 === 1).map((p) => p.id),
    ],
    scores: [0, 0],
    turn: 0,
    cursor: 0,
    cardsPerTurn: Math.max(
      1,
      Math.floor(game.prompts.length / (game.totalRounds * 2)),
    ),
    used: 0,
    describerId: "",
    judgeId: "",
    deadline: null,
    clue: "",
    guesses: [],
    log: [],
  };
  begin(game);
}
function finishCard(
  game: Game,
  result: "correct" | "skip" | "buzz" | "timeout",
) {
  const t = game.taboo!,
    a = t.turn % 2;
  if (result !== "timeout") {
    t.scores[result === "correct" ? a : 1 - a]++;
    for (const p of game.players)
      p.score = t.scores[t.teams[0].includes(p.id) ? 0 : 1];
  }
  t.log.push({ word: tabooTarget(game.round!.entry), result });
  if (
    result === "timeout" ||
    t.used >= t.cardsPerTurn ||
    Date.now() >= (t.deadline ?? Infinity)
  )
    game.phase = "reveal";
  else deal(game);
}
export function actTaboo(game: Game, id: string, action: RoomAction) {
  if (game.mode !== "taboo" || !game.taboo) return false;
  const t = game.taboo;
  if (action.action === "next") {
    if (id !== game.hostId || game.phase !== "reveal")
      throw new GameError(
        "Nur der Gastgeber kann nach der Auflösung fortsetzen.",
        403,
      );
    t.turn++;
    if (t.turn >= game.totalRounds * 2) game.phase = "finished";
    else begin(game);
    return true;
  }
  if (action.action !== "taboo") return false;
  if (
    action.matchId !== game.matchId ||
    action.roundNumber !== game.roundIndex + 1 ||
    action.cardIndex !== t.cursor
  )
    throw new GameError("Diese Eingabe gehört nicht zur aktuellen Tabu-Karte.");
  if (action.event === "start") {
    if (game.phase !== "briefing" || id !== t.describerId)
      throw new GameError(
        "Nur die erklärende Person kann den Timer starten.",
        403,
      );
    t.deadline = Date.now() + 60000;
    game.phase = "guessing";
    return true;
  }
  if (game.phase !== "guessing")
    throw new GameError("Der Tabu-Zug ist bereits vorbei.");
  if (action.event === "timeout") {
    if (Date.now() < (t.deadline ?? Infinity))
      throw new GameError("Die Zeit läuft noch.");
    finishCard(game, "timeout");
    return true;
  }
  if (Date.now() >= (t.deadline ?? 0))
    throw new GameError("Die Zeit ist abgelaufen. Bitte den Zug auflösen.");
  if (action.event === "clue") {
    if (id !== t.describerId)
      throw new GameError(
        "Nur die erklärende Person kann Hinweise geben.",
        403,
      );
    const c = game.round!.entry.challenge;
    if (c?.type !== "taboo") throw new GameError("Die Tabu-Karte fehlt.");
    if (!action.text?.trim())
      throw new GameError("Bitte einen Hinweis eingeben.", 422);
    if (
      tabooViolation(
        tabooTarget(game.round!.entry),
        [...c.forbidden, ...c.aliases],
        action.text,
      )
    )
      throw new GameError(
        "Der Hinweis enthält ein verbotenes Wort. Bitte anders formulieren.",
        422,
      );
    t.clue = action.text;
    return true;
  }
  if (action.event === "guess") {
    if (!t.teams[t.turn % 2].includes(id) || id === t.describerId)
      throw new GameError("Nur das aktive Rateteam darf antworten.", 403);
    if (!action.text?.trim())
      throw new GameError("Bitte einen Rateversuch eingeben.", 422);
    const c = game.round!.entry.challenge;
    t.guesses.push({
      name: game.players.find((p) => p.id === id)!.name,
      text: action.text,
    });
    t.guesses = t.guesses.slice(-10);
    if (
      [
        tabooTarget(game.round!.entry),
        ...(c?.type === "taboo" ? c.aliases : []),
      ].some((word) => tabooFold(word) === tabooFold(action.text!))
    )
      finishCard(game, "correct");
    return true;
  }
  if (action.event === "skip") {
    if (id !== t.describerId)
      throw new GameError("Nur die erklärende Person kann überspringen.", 403);
    finishCard(game, "skip");
    return true;
  }
  if (id !== t.judgeId)
    throw new GameError(
      "Nur die kontrollierende Person darf dies bestätigen.",
      403,
    );
  finishCard(game, action.event === "buzz" ? "buzz" : "correct");
  return true;
}
export function tabooPlayerLeft(game: Game) {
  const t = game.taboo;
  if (!t) return;
  for (const team of t.teams)
    for (let i = team.length - 1; i >= 0; i--)
      if (!game.players.some((p) => p.id === team[i])) team.splice(i, 1);
  if (t.teams.some((team) => team.length < 2)) {
    game.phase = "lobby";
    game.round = null;
    game.prompts = [];
    game.notice = "Für Tabu braucht jedes Team mindestens 2 Personen.";
    return;
  }
  if (!game.players.some((p) => p.id === t.describerId))
    t.describerId = t.teams[t.turn % 2][0];
  if (!game.players.some((p) => p.id === t.judgeId))
    t.judgeId = t.teams[1 - (t.turn % 2)][0];
}
export function viewTaboo(game: Omit<Game, "prompts">, id: string) {
  const t = game.taboo;
  if (game.mode !== "taboo" || !t || !game.round) return null;
  const c = game.round.entry.challenge,
    revealed = ["reveal", "finished"].includes(game.phase);
  return {
    team: t.turn % 2,
    teams: t.teams,
    scores: t.scores,
    describerId: t.describerId,
    judgeId: t.judgeId,
    cardIndex: t.cursor,
    cardLimit: t.cardsPerTurn,
    cardNumber: t.used,
    deadline: t.deadline,
    clue: t.clue,
    guesses: t.guesses,
    card:
      id === t.describerId || id === t.judgeId || revealed
        ? {
            word: tabooTarget(game.round.entry),
            forbidden: c?.type === "taboo" ? c.forbidden : [],
          }
        : null,
    results: revealed ? t.log : [],
  };
}
