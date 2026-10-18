import type {Entry} from './content';
import type {Game} from './game';
import {modeInfo} from './modes';
import {categoryId} from './quiz-categories';
import {normalizedAnswer} from './challenges';
import {prepareMeaningEntries} from './meaning-quiz';

export type PoolSettings = Pick<Game, 'mode' | 'locale' | 'meaningCategory' | 'pronunciationCategory' | 'attributionCategory'>;
export const poolKey = (game: PoolSettings) => JSON.stringify([game.mode, game.locale,
  game.mode === 'meaning-quiz' ? game.meaningCategory ?? 'all' : null,
  game.mode === 'tongue-twisters' ? game.pronunciationCategory ?? 'both' : null,
  game.mode === 'who-said-it' ? game.attributionCategory ?? 'both' : null]);

export function promptIdentity(entry: Entry) {
  const c=entry.challenge;
  return JSON.stringify([entry.kind, entry.language,
    entry.phrase ? normalizedAnswer(entry.phrase) : entry.audioId,
    normalizedAnswer(entry.sense ?? ''), entry.kind === 'dialect' ? entry.regionId ?? entry.region : '',
    entry.kind === 'situation' ? entry.contextId ?? entry.context : '',
    c?.type==='attribution'?c.category:c?.type==='order'?c.targetLanguage:c?.type==='friends'?[c.otherLanguage,normalizedAnswer(c.otherWord)]:null]);
}

export function playablePrompts(game: PoolSettings, prompts: Entry[]) {
  const candidates = game.mode === 'meaning-quiz'
    ? prepareMeaningEntries(prompts, game.locale, game.meaningCategory ?? 'all') : prompts;
  const eligible = candidates.filter(entry =>
    (game.mode === 'meaning-quiz' ? true : game.mode === 'word-chain' ? entry.language === game.locale
      : game.mode === 'tongue-twisters'
        ? entry.kind === 'tongue_twister' && game.pronunciationCategory !== 'sound' || entry.kind === 'sound_pair' && game.pronunciationCategory !== 'twister'
        : entry.kind === modeInfo(game.mode).kind)
    && (game.mode !== 'who-said-it' || !game.attributionCategory || game.attributionCategory === 'both' || entry.challenge?.type === 'attribution' && entry.challenge.category === game.attributionCategory)
    && (game.mode !== 'dialect-detective' || categoryId('region', entry.regionId ?? entry.region))
    && (game.mode !== 'everyday-language' || categoryId('context', entry.contextId ?? entry.context)));
  return [...new Map(eligible.map(entry => [promptIdentity(entry), entry])).values()];
}

export function updateAvailability(game: Game, prompts: Entry[]) {
  game.availableRounds = playablePrompts(game, prompts).length;
  game.totalRounds = Math.max(1, Math.min(game.totalRounds, maximumRounds(game)));
}

export const maximumRounds = (game: Pick<Game, 'players' | 'availableRounds'>) =>
  Math.min(game.players.length * 2, game.availableRounds ?? Infinity);
