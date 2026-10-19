import { hasText, hasAudio, presentationOf } from "./content-media";
import { songTitle } from "./attribution";
import {
  initializeTeam,
  settleTeam,
  teamMemberLeft,
  actTeam,
  viewTeam,
  type TeamRound,
} from "./team-game";
import {
  challengeText,
  challengeHasFallback,
  type PronunciationCategory,
  type AttributionCategory,
} from "./challenges";
import {
  languages,
  pronunciationLanguageInput,
  ratingScores,
  type Entry,
  type RatingScores,
  type RoomAction,
} from "./content";
import type { Locale } from "./translations";
import { localizeEntry } from "./entry-localization";
import {
  currentModeIds,
  isQuizMode,
  isTeamMode,
  modeInfo,
  prepareChoices,
  prepareLanguageQuiz,
  type PlayableGameMode,
} from "./modes";
import { registeredLanguageNames } from "./language-registry";
import { shuffled } from "./random";
import {
  categoryId,
  categoryLabel,
  contextIds,
  regionIds,
  type CategoryKind,
} from "./quiz-categories";
import { translationStatus } from "./content-translations";
import { type MeaningCategory } from "./meaning-categories";
import {
  maximumRounds,
  promptIdentity,
  unseenPrompts,
  updateAvailability,
} from "./game-pool";
import { chainChoices, edgeLetter, type ChainRound } from "./word-chain";

export type Phase =
  | "lobby"
  | "writing"
  | "voting"
  | "speaking"
  | "rating"
  | "reveal"
  | "finished"
  | "briefing"
  | "mission"
  | "ordering"
  | "linking";
export type Player = {
  id: string;
  name: string;
  tokenHash: string;
  score: number;
  lastSeenAt?: number;
};
export type Option = {
  id: string;
  text: string;
  authorId: string | null;
  solution?: boolean;
  language?: string;
  categoryId?: string;
  categoryKind?: CategoryKind;
};
export type PronunciationRound = {
  speakerIndex: number;
  ratings: Record<string, Record<string, RatingScores>>;
};
export type Round = {
  entry: Entry;
  answers: Record<string, string>;
  votes: Record<string, string>;
  options: Option[];
  chain?: ChainRound;
  team?: TeamRound;
  orders?: Record<string, string[]>;
  tiles?: { id: string; text: string; sourceId: string }[];
  pronunciation?: PronunciationRound;
};
export type Game = {
  code: string;
  locale: Locale;
  mode?: PlayableGameMode;
  hostId: string;
  phase: Phase;
  players: Player[];
  prompts: Entry[];
  playedPrompts?: { id: string; key: string }[];
  roundIndex: number;
  round: Round | null;
  totalRounds: number;
  availableRounds?: number;
  matchId?: string;
  notice?: string;
  meaningCategory?: MeaningCategory;
  pronunciationCategory?: PronunciationCategory;
  pronunciationLanguage?: string;
  attributionCategory?: AttributionCategory;
};
export class GameError extends Error {
  constructor(
    message: string,
    public status = 409,
  ) {
    super(message);
  }
}
export function createGame(
  code: string,
  player: Player,
  locale: Locale = "de",
  mode: PlayableGameMode = "idiom-bluff",
): Game {
  player.lastSeenAt = Date.now();
  return {
    code,
    locale,
    mode,
    pronunciationLanguage: locale,
    hostId: player.id,
    phase: "lobby",
    players: [player],
    prompts: [],
    roundIndex: 0,
    round: null,
    totalRounds: 2,
    matchId: crypto.randomUUID(),
  };
}
export function joinGame(game: Game, player: Player) {
  if (game.phase !== "lobby")
    throw new GameError("Diese Runde hat bereits begonnen.");
  if (game.players.length >= 10)
    throw new GameError("Der Raum ist voll (maximal 10 Personen).");
  if (
    game.players.some((p) => p.name.toLowerCase() === player.name.toLowerCase())
  )
    throw new GameError("Dieser Name ist im Raum schon vergeben.");
  player.lastSeenAt = Date.now();
  game.players.push(player);
}
function rememberPrompt(game: Game) {
  const shown = [
    ...game.prompts.slice(0, game.roundIndex + 1),
    ...(game.round ? [game.round.entry] : []),
  ];
  if (!shown.length) return;
  const history = (game.playedPrompts ??= []),
    ids = new Set(history.map((prompt) => prompt.id));
  for (const entry of shown)
    if (!ids.has(entry.id)) {
      history.push({ id: entry.id, key: promptIdentity(entry) });
      ids.add(entry.id);
    }
}
function newRound(game: Game) {
  const entry = game.prompts[game.roundIndex];
  game.round = { entry, answers: {}, votes: {}, options: [] };
  rememberPrompt(game);
  if (game.availableRounds !== undefined)
    game.availableRounds = Math.max(0, game.availableRounds - 1);
  game.phase = "writing";
  if (game.mode === "word-chain") {
    game.round.chain = {
      queue: game.players.map(
        (_, index) =>
          game.players[(game.roundIndex + index) % game.players.length].id,
      ),
      turn: 0,
      words: [{ text: entry.phrase }],
      choices: [],
      results: [],
    };
    chainChoices(game.round.chain, game.locale);
    game.phase = "linking";
  } else if (
    (game.mode === "meaning-quiz" && entry.challenge?.type === "meaning") ||
    (game.mode === "word-outsider" && entry.challenge?.type === "outsider")
  ) {
    const c = entry.challenge;
    game.round.options = shuffled(
      c.choices.map((choice, index) => ({
        id: crypto.randomUUID(),
        text: challengeText(choice, game.locale),
        authorId: null,
        solution: index === c.correctIndex,
      })),
    );
    game.phase = "voting";
  } else if (
    game.mode === "loanword-quiz" &&
    entry.challenge?.type === "loan"
  ) {
    const origin = entry.challenge.originLanguage;
    game.round.options = prepareChoices(origin, Object.keys(languages)).map(
      (value) => ({
        id: crypto.randomUUID(),
        text: registeredLanguageNames(value)[game.locale],
        language: value,
        authorId: null,
        solution: value === origin,
      }),
    );
    game.phase = "voting";
  } else if (isTeamMode(game.mode)) {
    initializeTeam(game, game.round);
  } else if (
    game.mode === "word-builder" &&
    entry.challenge?.type === "order"
  ) {
    game.round.orders = {};
    game.round.tiles = shuffled(
      entry.challenge.tiles.map((tile) => ({
        id: crypto.randomUUID(),
        text: tile.text,
        sourceId: tile.id,
      })),
    );
    game.phase = "ordering";
  } else if (game.mode === "tongue-twisters") {
    game.round.pronunciation = { speakerIndex: 0, ratings: {} };
    game.phase = "speaking";
  } else if (game.mode === "joke-quiz" && entry.challenge?.type === "joke") {
    const c = entry.challenge;
    game.round.options = shuffled(
      c.choices.map((choice, i) => ({
        id: crypto.randomUUID(),
        text: challengeText(choice, game.locale),
        authorId: null,
        solution: i === c.correctIndex,
      })),
    );
    game.phase = "voting";
  } else if (
    game.mode === "who-said-it" &&
    entry.challenge?.type === "attribution"
  ) {
    const c = entry.challenge;
    game.round.options = shuffled(
      [c.answer, ...c.alternatives].map((text, i) => ({
        id: crypto.randomUUID(),
        text: c.category === "song" ? songTitle(text) : text,
        authorId: null,
        solution: i === 0,
      })),
    );
    game.phase = "voting";
  } else if (
    game.mode === "false-friends" &&
    entry.challenge?.type === "friends"
  ) {
    const same = entry.challenge.sameMeaning;
    game.round.options = shuffled([
      {
        id: crypto.randomUUID(),
        text: game.locale === "de" ? "Gleiche Bedeutung" : "Same meaning",
        authorId: null,
        solution: same,
      },
      {
        id: crypto.randomUUID(),
        text: "False Friend",
        authorId: null,
        solution: !same,
      },
    ]);
    game.phase = "voting";
  } else if (isQuizMode(game.mode)) {
    const categoryKind =
      game.mode === "dialect-detective" ? "region" : "context";
    const target =
      categoryKind === "region"
        ? (entry.regionId ?? categoryId("region", entry.region))
        : (entry.contextId ?? categoryId("context", entry.context));
    const choices =
      game.mode === "language-quiz"
        ? entry.phrase
          ? prepareLanguageQuiz(
              entry.phrase,
              entry.language,
              Object.keys(languages),
            ).options
          : prepareChoices(entry.language, Object.keys(languages))
        : prepareChoices(
            target ?? "",
            categoryKind === "region" ? regionIds : contextIds,
          );
    game.round.options = choices.map((value) => ({
      id: crypto.randomUUID(),
      text:
        game.mode === "language-quiz"
          ? registeredLanguageNames(value)[game.locale]
          : value.startsWith("custom-")
            ? (entry.regionNames?.[game.locale] ?? entry.region)
            : categoryLabel(categoryKind, value, game.locale),
      authorId: null,
      ...(game.mode === "language-quiz"
        ? { language: value }
        : { categoryId: value, categoryKind }),
    }));
    game.phase = "voting";
  }
}
const correctOption = (game: Omit<Game, "prompts">, option: Option) =>
  option.solution !== undefined
    ? option.solution
    : game.mode === "language-quiz"
      ? option.language === game.round?.entry.language
      : game.mode === "dialect-detective"
        ? option.categoryId
          ? option.categoryId === game.round?.entry.regionId
          : option.text === game.round?.entry.region
        : game.mode === "everyday-language"
          ? option.categoryId
            ? option.categoryId === game.round?.entry.contextId
            : option.text === game.round?.entry.context
          : option.authorId === null;
const rounded = (value: number) => Math.round(value * 10) / 10;
function pronunciationResults(game: Omit<Game, "prompts">) {
  return game.players.map((player) => {
    const ratings = Object.values(
      game.round?.pronunciation?.ratings[player.id] ?? {},
    );
    const average = (key: keyof RatingScores) =>
      ratings.length
        ? ratings.reduce((sum, rating) => sum + rating[key], 0) / ratings.length
        : 0;
    return {
      playerId: player.id,
      name: player.name,
      ratingCount: ratings.length,
      clarity: rounded(average("clarity")),
      accuracy: rounded(average("accuracy")),
      rhythm: rounded(average("rhythm")),
      score: rounded(
        (average("clarity") + average("accuracy") + average("rhythm")) / 3,
      ),
    };
  });
}
function settleVotes(game: Game) {
  const round = game.round;
  if (!round) return;
  if (round.team) {
    settleTeam(game);
    return;
  }
  if (
    game.phase === "ordering" &&
    game.players.every((p) => !!round.orders?.[p.id])
  ) {
    const c = round.entry.challenge;
    if (c?.type === "order")
      for (const p of game.players)
        if (
          c.accepted.some((a) => a.join("|") === round.orders![p.id].join("|"))
        )
          p.score++;
    game.phase = "reveal";
    return;
  }
  if (
    game.phase === "writing" &&
    game.players.every((player) => !!round.answers[player.id])
  ) {
    round.options = shuffled([
      {
        id: crypto.randomUUID(),
        text: round.entry.meaning || round.entry.literal,
        authorId: null,
      },
      ...game.players.map((player) => ({
        id: crypto.randomUUID(),
        text: round.answers[player.id],
        authorId: player.id,
      })),
    ]);
    game.phase = "voting";
  }
  if (
    game.phase === "voting" &&
    game.players.every((player) => !!round.votes[player.id])
  ) {
    for (const [voter, optionId] of Object.entries(round.votes)) {
      const choice = round.options.find((option) => option.id === optionId);
      if (!choice) continue;
      const recipient = game.players.find(
        (player) =>
          player.id ===
          (isQuizMode(game.mode) ? voter : (choice.authorId ?? voter)),
      );
      if (recipient && (!isQuizMode(game.mode) || correctOption(game, choice)))
        recipient.score++;
    }
    game.phase = "reveal";
  }
}
function finishPronunciation(game: Game) {
  for (const result of pronunciationResults(game)) {
    const player = game.players.find(
      (player) => player.id === result.playerId,
    )!;
    player.score = rounded(player.score + result.score);
  }
  game.phase = "reveal";
}
function settleRatings(game: Game) {
  const performance = game.round?.pronunciation;
  const speaker = performance
    ? game.players[performance.speakerIndex]
    : undefined;
  if (game.phase !== "rating" || !performance || !speaker) return;
  if (
    game.players
      .filter((player) => player.id !== speaker.id)
      .every((player) => !!performance.ratings[speaker.id]?.[player.id])
  ) {
    if (performance.speakerIndex + 1 < game.players.length) {
      performance.speakerIndex++;
      game.phase = "speaking";
    } else finishPronunciation(game);
  }
}
export function leaveGame(game: Game, playerId: string) {
  const index = game.players.findIndex((player) => player.id === playerId);
  if (index < 0) throw new GameError("Du bist nicht Teil dieses Raums.", 403);
  const performance = game.round?.pronunciation;
  const speakerId = performance
    ? game.players[performance.speakerIndex]?.id
    : undefined;
  const speakerIndex = performance?.speakerIndex ?? 0;
  rememberPrompt(game);
  game.players.splice(index, 1);
  if (game.hostId === playerId) game.hostId = game.players[0]?.id ?? "";
  if (!game.players.length) {
    game.phase = "finished";
    game.round = null;
    game.prompts = [];
    return;
  }
  if (game.phase === "lobby") return;
  if (game.phase === "finished") return;
  const minimum =
    isQuizMode(game.mode) ||
    game.mode === "word-builder" ||
    game.mode === "word-chain"
      ? 1
      : 2;
  if (game.players.length < minimum) {
    game.phase = "lobby";
    game.round = null;
    game.prompts = [];
    game.roundIndex = 0;
    game.totalRounds = Math.max(
      1,
      Math.min(game.totalRounds, maximumRounds(game)),
    );
    game.notice =
      "Zu wenige Personen zum Weiterspielen. Ihr könnt in der Lobby wieder starten.";
    return;
  }
  const round = game.round;
  if (!round) return;
  if (round.chain) {
    round.chain.queue = round.chain.queue.filter((id) => id !== playerId);
    round.chain.turn++;
    if (game.phase === "linking") {
      if (!round.chain.queue.length) game.phase = "reveal";
      else chainChoices(round.chain, game.locale);
    }
    return;
  }
  delete round.answers[playerId];
  delete round.votes[playerId];
  if (round.orders) delete round.orders[playerId];
  if (game.phase !== "reveal") {
    round.options = round.options.filter(
      (option) => option.authorId !== playerId,
    );
    for (const [voter, optionId] of Object.entries(round.votes))
      if (!round.options.some((option) => option.id === optionId))
        delete round.votes[voter];
  }
  if (round.team) {
    teamMemberLeft(game, playerId);
    return;
  }
  if (performance) {
    delete performance.ratings[playerId];
    for (const ratings of Object.values(performance.ratings))
      delete ratings[playerId];
    if (game.phase === "speaking" || game.phase === "rating") {
      if (speakerId === playerId) {
        performance.speakerIndex = speakerIndex;
        if (speakerIndex >= game.players.length) finishPronunciation(game);
        else game.phase = "speaking";
      } else {
        performance.speakerIndex = game.players.findIndex(
          (player) => player.id === speakerId,
        );
        settleRatings(game);
      }
    }
  } else settleVotes(game);
}
export function act(
  game: Game,
  playerId: string,
  action: RoomAction,
  prompts: Entry[] = [],
) {
  const player = game.players.find((player) => player.id === playerId);
  if (!player) throw new GameError("Du bist nicht Teil dieses Raums.", 403);
  rememberPrompt(game);
  const now = Date.now();
  player.lastSeenAt = now;
  for (const other of [...game.players])
    if (
      other.id !== playerId &&
      other.lastSeenAt &&
      now - other.lastSeenAt > 120000
    )
      leaveGame(game, other.id);
  if (action.action === "heartbeat") return;
  if (action.action === "leave") {
    leaveGame(game, playerId);
    return;
  }
  if (action.action === "configure") {
    if (playerId !== game.hostId)
      throw new GameError(
        "Nur der Gastgeber kann die Spieleinstellungen ändern.",
        403,
      );
    if (game.phase !== "lobby")
      throw new GameError(
        "Die Spieleinstellungen können nur in der Lobby geändert werden.",
      );
    if (action.mode && !currentModeIds.includes(action.mode))
      throw new GameError("Dieses Spiel ist nicht verfügbar.", 422);
    const next = { ...game, mode: action.mode ?? game.mode };
    if (action.pronunciationCategory) {
      if (next.mode !== "tongue-twisters")
        throw new GameError("Diese Kategorie passt nicht zum Spiel.", 422);
      next.pronunciationCategory = action.pronunciationCategory;
    }
    if (action.pronunciationLanguage !== undefined) {
      if (next.mode !== "tongue-twisters")
        throw new GameError("Dieser Sprachfilter passt nicht zum Spiel.", 422);
      const language = pronunciationLanguageInput.safeParse(
        action.pronunciationLanguage,
      );
      if (!language.success)
        throw new GameError(
          "Bitte eine Sprache aus dem geprüften Register wählen.",
          422,
        );
      next.pronunciationLanguage = language.data;
    }
    if (action.attributionCategory) {
      if (next.mode !== "who-said-it")
        throw new GameError("Diese Kategorie passt nicht zum Spiel.", 422);
      next.attributionCategory = action.attributionCategory;
    }
    if (action.meaningCategory) {
      if (next.mode !== "meaning-quiz")
        throw new GameError("Diese Kategorie passt nicht zum Spiel.", 422);
      next.meaningCategory = action.meaningCategory;
    }
    if (prompts.length) updateAvailability(next, prompts);
    if (action.rounds !== undefined) {
      if (
        !Number.isInteger(action.rounds) ||
        action.rounds < 1 ||
        action.rounds > 10
      )
        throw new GameError("Bitte zwischen 1 und 10 Runden wählen.", 422);
      if (action.rounds > maximumRounds(next))
        throw new GameError(
          "Für diese Rundenzahl sind noch nicht genügend ungespielte Beiträge vorhanden.",
          422,
        );
      next.totalRounds = action.rounds;
    }
    Object.assign(game, next);
    return;
  }
  if (action.action === "restart") {
    if (playerId !== game.hostId)
      throw new GameError(
        "Nur der Gastgeber kann eine neue Partie starten.",
        403,
      );
    if (game.phase !== "finished")
      throw new GameError("Die Partie ist noch nicht beendet.");
    if (
      action.rounds !== undefined &&
      (!Number.isInteger(action.rounds) ||
        action.rounds < 1 ||
        action.rounds > 10)
    )
      throw new GameError("Bitte zwischen 1 und 10 Runden wählen.", 422);
    const rounds = action.rounds ?? Math.min(game.totalRounds, 10);
    const next: Game = {
      ...game,
      totalRounds: rounds,
      phase: "lobby",
      roundIndex: 0,
      round: null,
      prompts: [],
      matchId: crypto.randomUUID(),
      notice: undefined,
      players: game.players.map((member) => ({ ...member, score: 0 })),
      playedPrompts: [...(game.playedPrompts ?? [])],
    };
    updateAvailability(next, prompts);
    if (action.immediate) {
      next.totalRounds = rounds;
      act(next, playerId, { action: "start" }, prompts);
    }
    Object.assign(game, next);
    return;
  }
  if (action.action === "start") {
    if (playerId !== game.hostId)
      throw new GameError(
        "Nur die Gastgeberin oder der Gastgeber kann starten.",
        403,
      );
    if (game.phase !== "lobby") throw new GameError("Das Spiel läuft bereits.");
    const info = modeInfo(game.mode);
    if (game.players.length < info.minPlayers)
      throw new GameError(
        info.minPlayers === 2
          ? "Zum Start braucht ihr mindestens 2 Personen."
          : "Zum Start braucht ihr mindestens 3 Personen.",
      );
    if (
      !Number.isInteger(game.totalRounds) ||
      game.totalRounds < 1 ||
      game.totalRounds > 10
    )
      throw new GameError("Bitte zwischen 1 und 10 Runden wählen.", 422);
    const unique = unseenPrompts(game, prompts);
    game.availableRounds = unique.length;
    if (unique.length < game.totalRounds)
      throw new GameError(
        "Für diese Rundenzahl sind noch nicht genügend ungespielte Beiträge vorhanden.",
      );
    let ordered = shuffled(unique);
    if (game.mode === "plain-talk") {
      const plain = ordered.filter(
          (e) =>
            e.challenge?.type === "academic" &&
            e.challenge.direction === "plain",
        ),
        precise = ordered.filter(
          (e) =>
            e.challenge?.type === "academic" &&
            e.challenge.direction === "precise",
        );
      ordered = [];
      while (plain.length || precise.length) {
        const a = plain.shift(),
          b = precise.shift();
        if (a) ordered.push(a);
        if (b) ordered.push(b);
      }
    }
    game.prompts = ordered
      .slice(0, game.totalRounds)
      .map((entry) => localizeEntry(entry, game.locale ?? "de"));
    game.roundIndex = 0;
    game.matchId = crypto.randomUUID();
    game.notice = undefined;
    for (const player of game.players) player.score = 0;
    newRound(game);
    return;
  }
  const round = game.round;
  if (!round) throw new GameError("Das Spiel hat noch nicht begonnen.");
  if (action.action === "chain") {
    const chain = round.chain;
    if (game.mode !== "word-chain" || game.phase !== "linking" || !chain)
      throw new GameError("Hier wird gerade keine Wortkette gebaut.");
    if (
      action.matchId !== game.matchId ||
      action.roundNumber !== game.roundIndex + 1 ||
      action.turn !== chain.turn
    )
      throw new GameError("Diese Eingabe gehört nicht zur aktuellen Runde.");
    if (chain.queue[0] !== playerId)
      throw new GameError("Eine andere Person ist gerade dran.", 403);
    const word = chain.choices.find((word) => word.id === action.wordId);
    if (!word) throw new GameError("Bitte ein verfügbares Wort wählen.", 422);
    const correct =
      edgeLetter(word.text, "first") ===
      edgeLetter(chain.words.at(-1)!.text, "last");
    if (correct) {
      chain.words.push({ text: word.text, playerId });
      player.score++;
    }
    chain.results.push({ playerId, correct });
    chain.queue.shift();
    chain.turn++;
    if (!chain.queue.length) {
      chain.choices = [];
      game.phase = "reveal";
    } else chainChoices(chain, game.locale);
    return;
  }
  if (actTeam(game, playerId, action)) return;
  if (action.action === "order") {
    const c = round.entry.challenge;
    if (
      game.mode !== "word-builder" ||
      c?.type !== "order" ||
      game.phase !== "ordering"
    )
      throw new GameError("Hier werden gerade keine Wörter sortiert.");
    if (
      action.matchId !== game.matchId ||
      action.roundNumber !== game.roundIndex + 1
    )
      throw new GameError("Diese Eingabe gehört nicht zur aktuellen Runde.");
    if (round.orders?.[playerId])
      throw new GameError("Deine Antwort ist bereits abgegeben.");
    const ids = round.tiles!.map((t) => t.id);
    if (
      action.tiles.length !== ids.length ||
      new Set(action.tiles).size !== ids.length ||
      action.tiles.some((id) => !ids.includes(id))
    )
      throw new GameError("Bitte jeden Baustein genau einmal verwenden.", 422);
    (round.orders ??= {})[playerId] = action.tiles.map(
      (id) => round.tiles!.find((t) => t.id === id)!.sourceId,
    );
    settleVotes(game);
    return;
  }
  if (action.action === "performed" || action.action === "rate") {
    const performance = round.pronunciation;
    const speaker = performance
      ? game.players[performance.speakerIndex]
      : undefined;
    if (game.mode !== "tongue-twisters" || !performance || !speaker)
      throw new GameError("Hier wird gerade nicht vorgelesen.");
    if (
      action.matchId !== (game.matchId ?? game.code) ||
      action.roundNumber !== game.roundIndex + 1 ||
      action.speakerId !== speaker.id
    )
      throw new GameError(
        "Diese Bewertung gehört nicht zum aktuellen Vortrag.",
      );
    if (action.action === "performed") {
      if (game.phase !== "speaking")
        throw new GameError("Der Vortrag wurde bereits beendet.");
      if (playerId !== speaker.id)
        throw new GameError(
          "Nur die Person, die gerade dran ist, kann den Vortrag beenden.",
          403,
        );
      game.phase = "rating";
      return;
    }
    if (game.phase !== "rating")
      throw new GameError("Es wird gerade nicht bewertet.");
    if (playerId === speaker.id)
      throw new GameError(
        "Du kannst deine eigene Aussprache nicht bewerten.",
        403,
      );
    const scores = ratingScores.safeParse(action);
    if (!scores.success)
      throw new GameError("Bitte jedes Kriterium mit 1 bis 5 bewerten.", 422);
    const ratings = (performance.ratings[speaker.id] ??= {});
    if (ratings[playerId])
      throw new GameError("Deine Bewertung ist bereits abgegeben.");
    ratings[playerId] = scores.data;
    settleRatings(game);
    return;
  }
  if (["call", "question", "reply", "mission"].includes(action.action))
    throw new GameError("Diese Aktion passt nicht zum Spiel.", 422);
  if (action.action === "answer") {
    if (game.phase !== "writing")
      throw new GameError("Die Schreibphase ist vorbei.");
    if (round.answers[playerId])
      throw new GameError("Deine Erklärung ist bereits abgegeben.");
    round.answers[playerId] = action.text;
    settleVotes(game);
  } else if (action.action === "vote") {
    if (round.team?.callerId === playerId)
      throw new GameError("Die ansagende Person stimmt nicht ab.", 403);
    if (game.phase !== "voting")
      throw new GameError("Es wird gerade nicht abgestimmt.");
    if (round.votes[playerId])
      throw new GameError("Deine Stimme ist bereits abgegeben.");
    const option = round.options.find((o) => o.id === action.optionId);
    if (!option || option.authorId === playerId)
      throw new GameError("Bitte eine fremde Erklärung wählen.", 422);
    round.votes[playerId] = option.id;
    settleVotes(game);
  } else if (action.action === "next") {
    if (playerId !== game.hostId)
      throw new GameError(
        "Nur der Gastgeber kann die nächste Runde starten.",
        403,
      );
    if (game.phase !== "reveal")
      throw new GameError("Die Runde ist noch nicht abgeschlossen.");
    game.roundIndex++;
    if (game.roundIndex >= game.totalRounds) game.phase = "finished";
    else newRound(game);
  }
}
// Only explicitly listed fields and aggregate ratings leave the server.
export function viewGame(game: Omit<Game, "prompts">, playerId: string) {
  const round = game.round;
  const revealed = game.phase === "reveal" || game.phase === "finished";
  const quiz = isQuizMode(game.mode) || isTeamMode(game.mode);
  const c = round?.entry.challenge;
  const team = viewTeam(game, playerId);
  const hidden = !!team && !team.briefing;
  const order = c?.type === "order" ? c : null;
  const textVisible = !!round && hasText(round.entry);
  const audioVisible = !!round && hasAudio(round.entry) && !hidden;
  const performance = round?.pronunciation;
  const speaker = performance
    ? game.players[performance.speakerIndex]
    : undefined;
  const activeRatings = speaker ? (performance?.ratings[speaker.id] ?? {}) : {};
  return {
    hint:
      round?.entry.kind === "dialect" &&
      round.entry.hint &&
      game.phase === "voting"
        ? {
            text: round.entry.hint,
            sourceLocale: round.entry.sourceLocale ?? "de",
            status: translationStatus(
              {
                hint: round.entry.hint,
                sourceLocale: round.entry.sourceLocale,
                translations: round.entry.translations,
              },
              game.locale,
            ),
          }
        : null,
    meaningCategory: game.meaningCategory ?? "all",
    outsider:
      c?.type === "outsider"
        ? {
            rule: challengeText(c.rule, game.locale),
            ...(revealed
              ? { explanation: challengeText(c.explanation, game.locale) }
              : {}),
          }
        : null,
    chain: round?.chain
      ? {
          words: round.chain.words,
          turn: round.chain.turn,
          activePlayerId: round.chain.queue[0] ?? null,
          requiredLetter: edgeLetter(round.chain.words.at(-1)!.text, "last"),
          choices:
            game.phase === "linking" && round.chain.queue[0] === playerId
              ? round.chain.choices
              : [],
          results: round.chain.results,
        }
      : null,
    team,
    pronunciationCategory: game.pronunciationCategory ?? "both",
    pronunciationLanguage: game.pronunciationLanguage ?? "",
    attributionCategory: game.attributionCategory ?? "both",
    challengeFallback: c ? challengeHasFallback(c, game.locale) : false,
    attributionType: c?.type === "attribution" ? c.category : null,
    pronunciationType:
      round?.entry.kind === "sound_pair"
        ? ("sound" as const)
        : ("twister" as const),
    soundWords:
      c?.type === "sound" && (textVisible || revealed)
        ? c.words.map((w) => ({
            ...w,
            meaning: challengeText(w.meaning, game.locale),
          }))
        : null,
    friends:
      c?.type === "friends"
        ? {
            otherWord: textVisible || revealed ? c.otherWord : "",
            otherLanguage: c.otherLanguage,
            context: challengeText(c.context, game.locale),
            ...(revealed
              ? {
                  firstMeaning: challengeText(c.firstMeaning, game.locale),
                  secondMeaning: challengeText(c.secondMeaning, game.locale),
                }
              : {}),
          }
        : null,
    wordOrder: order
      ? {
          targetLanguage: order.targetLanguage,
          source: textVisible || revealed ? order.source[game.locale] : "",
          tiles: round?.tiles?.map((t) => ({ id: t.id, text: t.text })) ?? [],
          submitted: !!round?.orders?.[playerId],
          ownOrder:
            round?.orders?.[playerId]?.map(
              (id) => round.tiles!.find((t) => t.sourceId === id)!.id,
            ) ?? null,
          ...(revealed
            ? {
                solution: order.accepted[0]
                  .map((id) => order.tiles.find((t) => t.id === id)!.text)
                  .join(" "),
                correct: order.accepted.some(
                  (a) => a.join("|") === round?.orders?.[playerId]?.join("|"),
                ),
              }
            : {}),
        }
      : null,
    matchId: game.matchId ?? game.code,
    maxRounds: maximumRounds(game),
    notice: game.notice,
    code: game.code,
    locale: game.locale ?? "de",
    mode: game.mode ?? "idiom-bluff",
    hostId: game.hostId,
    phase: game.phase,
    playerId,
    roundNumber: Math.min(game.roundIndex + 1, game.totalRounds),
    totalRounds: game.totalRounds,
    players: game.players.map((p) => ({
      id: p.id,
      name: p.name,
      score: p.score,
      answered:
        !!round?.answers[p.id] ||
        !!round?.team?.paths[p.id] ||
        !!round?.orders?.[p.id],
      voted: !!round?.votes[p.id],
      rated: !!activeRatings[p.id],
    })),
    prompt: round
      ? {
          presentation: presentationOf(round.entry),
          phrase:
            hidden || !textVisible
              ? ""
              : order
                ? order.source[game.locale]
                : round.entry.phrase,
          ...(audioVisible && round.entry.audioId
            ? { audioId: round.entry.audioId }
            : {}),
          ...(!hidden &&
          (!quiz ||
            game.mode === "everyday-language" ||
            game.mode === "false-friends")
            ? {
                language: round.entry.language,
                languageNames: round.entry.languageNames,
                literal:
                  revealed && !order && textVisible ? round.entry.literal : "",
              }
            : {}),
        }
      : null,
    options:
      round && ["voting", "reveal", "finished"].includes(game.phase)
        ? round.options.map((option) => ({
            id: option.id,
            text: option.text,
            isOwn: option.authorId === playerId,
            ...(option.language ? { language: option.language } : {}),
            ...(option.categoryId
              ? {
                  categoryId: option.categoryId,
                  categoryKind: option.categoryKind,
                }
              : {}),
            ...(revealed
              ? {
                  correct: correctOption(game, option),
                  authorName: quiz
                    ? ""
                    : (game.players.find((p) => p.id === option.authorId)
                        ?.name ?? "Die echte Bedeutung"),
                  voters: Object.entries(round.votes)
                    .filter(([, id]) => id === option.id)
                    .map(([id]) => game.players.find((p) => p.id === id)?.name)
                    .filter((name): name is string => !!name),
                }
              : {}),
          }))
        : [],
    selectedOptionId: round?.votes[playerId] ?? null,
    pronunciation:
      performance && speaker
        ? {
            speaker: { id: speaker.id, name: speaker.name },
            speakerNumber: performance.speakerIndex + 1,
            totalSpeakers: game.players.length,
            ratingCount: Object.keys(activeRatings).length,
            requiredRatings: game.players.length - 1,
            hasRated: !!activeRatings[playerId],
            results: revealed ? pronunciationResults(game) : [],
          }
        : null,
    revelation:
      revealed && round
        ? {
            language: round.entry.language,
            languageNames: round.entry.languageNames,
            region: round.entry.region,
            regionId: round.entry.regionId,
            context: round.entry.context,
            contextId: round.entry.contextId,
            meaning:
              c?.type === "meaning"
                ? challengeText(c.choices[c.correctIndex], game.locale)
                : c?.type === "outsider"
                  ? challengeText(c.explanation, game.locale)
                  : round.entry.meaning || round.entry.literal,
            example: round.entry.example,
            culturalNote: round.entry.culturalNote,
            sourceUrl: round.entry.sourceUrl,
            status: round.entry.status,
            authorName: round.entry.creditName || "",
            sourceLocale: round.entry.sourceLocale ?? "de",
            translationStatus:
              round.entry.status === "curated"
                ? ("original" as const)
                : translationStatus(round.entry, game.locale),
          }
        : null,
  };
}
export type GameView = ReturnType<typeof viewGame>;
