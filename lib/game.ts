import type { Entry, RoomAction } from './content';
import type { Locale } from './translations';
import { localizeEntry } from './entry-localization';
import { languages } from './content';
import { prepareLanguageQuiz, type PlayableGameMode } from './modes';
import { shuffled } from './random';

export type Phase = 'lobby' | 'writing' | 'voting' | 'reveal' | 'finished';
export type Player = { id: string; name: string; tokenHash: string; score: number };
export type Option = { id: string; text: string; authorId: string | null; language?: string };
export type Round = { entry: Entry; answers: Record<string, string>; votes: Record<string, string>; options: Option[] };
export type Game = { code: string; locale: Locale; mode?: PlayableGameMode; hostId: string; phase: Phase; players: Player[]; prompts: Entry[]; roundIndex: number; round: Round | null; totalRounds: number };
export class GameError extends Error { constructor(message: string, public status = 409) { super(message); } }
export function createGame(code: string, player: Player, locale: Locale = 'de', mode: PlayableGameMode = 'idiom-bluff'): Game { return { code, locale, mode, hostId: player.id, phase: 'lobby', players: [player], prompts: [], roundIndex: 0, round: null, totalRounds: 5 }; }
export function joinGame(game: Game, player: Player) {
  if (game.phase !== 'lobby') throw new GameError('Diese Runde hat bereits begonnen.');
  if (game.players.length >= 10) throw new GameError('Der Raum ist voll (maximal 10 Personen).');
  if (game.players.some(p => p.name.toLowerCase() === player.name.toLowerCase())) throw new GameError('Dieser Name ist im Raum schon vergeben.');
  game.players.push(player);
}
function newRound(game: Game) {
  game.round = { entry: game.prompts[game.roundIndex], answers: {}, votes: {}, options: [] }; game.phase = 'writing';
  if (game.mode === 'language-quiz') {
    const quiz = prepareLanguageQuiz(game.round.entry.phrase, game.round.entry.language, Object.keys(languages));
    game.round.options = quiz.options.map(language => ({ id: crypto.randomUUID(), text: languages[language] ?? language, language, authorId: null }));
    game.phase = 'voting';
  }
}
const correctOption = (game: Omit<Game, 'prompts'>, option: Option) => game.mode === 'language-quiz' ? option.language === game.round?.entry.language : option.authorId === null;
export function act(game: Game, playerId: string, action: RoomAction, prompts: Entry[] = []) {
  const player = game.players.find(p => p.id === playerId);
  if (!player) throw new GameError('Du bist nicht Teil dieses Raums.', 403);
  if (action.action === 'start') {
    if (playerId !== game.hostId) throw new GameError('Nur die Gastgeberin oder der Gastgeber kann starten.', 403);
    if (game.phase !== 'lobby') throw new GameError('Das Spiel läuft bereits.');
    if (game.mode !== 'language-quiz' && game.players.length < 3) throw new GameError('Zum Start braucht ihr mindestens 3 Personen.');
    const kind = game.mode === 'language-quiz' ? 'word' : 'idiom';
    const unique = [...new Map(prompts.filter(entry => entry.kind === kind).map(entry => [entry.phrase.trim().toLocaleLowerCase(), entry])).values()];
    if (unique.length < game.totalRounds) throw new GameError('Es sind noch nicht genügend Spielkarten vorhanden.');
    game.prompts = shuffled(unique).slice(0, game.totalRounds).map(entry => localizeEntry(entry, game.locale ?? 'de')); newRound(game); return;
  }
  const round = game.round;
  if (!round) throw new GameError('Das Spiel hat noch nicht begonnen.');
  if (action.action === 'answer') {
    if (game.phase !== 'writing') throw new GameError('Die Schreibphase ist vorbei.');
    if (round.answers[playerId]) throw new GameError('Deine Erklärung ist bereits abgegeben.');
    round.answers[playerId] = action.text;
    if (Object.keys(round.answers).length === game.players.length) {
      round.options = shuffled([{ id: crypto.randomUUID(), text: round.entry.meaning, authorId: null }, ...game.players.map(p => ({ id: crypto.randomUUID(), text: round.answers[p.id], authorId: p.id }))]);
      game.phase = 'voting';
    }
  } else if (action.action === 'vote') {
    if (game.phase !== 'voting') throw new GameError('Es wird gerade nicht abgestimmt.');
    if (round.votes[playerId]) throw new GameError('Deine Stimme ist bereits abgegeben.');
    const option = round.options.find(o => o.id === action.optionId);
    if (!option || option.authorId === playerId) throw new GameError('Bitte eine fremde Erklärung wählen.', 422);
    round.votes[playerId] = option.id;
    if (Object.keys(round.votes).length === game.players.length) {
      for (const [voter, optionId] of Object.entries(round.votes)) {
        const choice = round.options.find(o => o.id === optionId)!;
        if (game.mode === 'language-quiz') {
          if (correctOption(game, choice)) game.players.find(p => p.id === voter)!.score += 2;
        } else {
          const winner = game.players.find(p => p.id === (choice.authorId ?? voter))!;
          winner.score += choice.authorId === null ? 2 : 1;
        }
      }
      game.phase = 'reveal';
    }
  } else if (action.action === 'next') {
    if (playerId !== game.hostId) throw new GameError('Nur der Gastgeber kann die nächste Runde starten.', 403);
    if (game.phase !== 'reveal') throw new GameError('Die Runde ist noch nicht abgeschlossen.');
    game.roundIndex++;
    if (game.roundIndex >= game.totalRounds) game.phase = 'finished'; else newRound(game);
  }
}
// An explicit allowlist keeps secrets, authors and future prompts off the wire.
export function viewGame(game: Omit<Game, 'prompts'>, playerId: string) {
  const round = game.round; const revealed = game.phase === 'reveal' || game.phase === 'finished';
  const quiz = game.mode === 'language-quiz';
  return { code: game.code, locale: game.locale ?? 'de', mode: game.mode ?? 'idiom-bluff', hostId: game.hostId, phase: game.phase, playerId, roundNumber: Math.min(game.roundIndex + 1, game.totalRounds), totalRounds: game.totalRounds,
    players: game.players.map(p => ({ id: p.id, name: p.name, score: p.score, answered: !!round?.answers[p.id], voted: !!round?.votes[p.id] })),
    prompt: round ? { phrase: round.entry.phrase, ...(!quiz ? { language: round.entry.language, literal: round.entry.literal } : {}) } : null,
    options: round && game.phase !== 'writing' ? round.options.map(o => ({ id: o.id, text: o.text, isOwn: o.authorId === playerId,
      ...(o.language ? { language: o.language } : {}),
      ...(revealed ? { correct: correctOption(game, o), authorName: quiz ? '' : game.players.find(p => p.id === o.authorId)?.name ?? 'Die echte Bedeutung', voters: Object.entries(round.votes).filter(([,v]) => v === o.id).map(([id]) => game.players.find(p => p.id === id)!.name) } : {}) })) : [],
    selectedOptionId: round?.votes[playerId] ?? null,
    revelation: revealed && round ? { language: round.entry.language, meaning: round.entry.meaning, example: round.entry.example, culturalNote: round.entry.culturalNote, sourceUrl: round.entry.sourceUrl, status: round.entry.status, authorName: round.entry.authorName } : null,
  };
}
export type GameView = ReturnType<typeof viewGame>;
