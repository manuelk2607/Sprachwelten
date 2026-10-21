import type {Entry} from './content';
import type {Game} from './game';
import {modeInfo} from './modes';
import {categoryId} from './quiz-categories';
import {normalizedAnswer} from './challenges';
import {prepareMeaningEntries} from './meaning-quiz';

export type PoolSettings = Pick<Game, 'mode' | 'locale' | 'meaningCategory' | 'pronunciationCategory' | 'pronunciationLanguage' | 'attributionCategory' | 'tabooLanguages'>;
export const poolKey = (game: PoolSettings) => JSON.stringify([game.mode, game.locale,
  game.mode === 'meaning-quiz' ? game.meaningCategory ?? 'all' : null,
  game.mode === 'tongue-twisters' ? game.pronunciationCategory ?? 'both' : null,
  game.mode === 'tongue-twisters' ? game.pronunciationLanguage ?? '' : null,
  game.mode === 'taboo' ? [...(game.tabooLanguages??[game.locale])].sort() : null,
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
  const languageEligible=game.mode==='taboo'?eligible.filter(entry=>(game.tabooLanguages??[game.locale]).includes(entry.language)):eligible;
  const filtered=game.mode==='tongue-twisters'&&game.pronunciationLanguage?languageEligible.filter(entry=>entry.language===game.pronunciationLanguage):languageEligible;
  return [...new Map(filtered.map(entry => [promptIdentity(entry), entry])).values()];
}

export type RoomPoolSettings = PoolSettings & Pick<Game, 'playedPrompts'> & Partial<Pick<Game, 'round'>>;
export function unseenPrompts(game: RoomPoolSettings, prompts: Entry[]) {
  const played=[...(game.playedPrompts??[]),...(game.round?[{id:game.round.entry.id,key:promptIdentity(game.round.entry)}]:[])];
  const ids=new Set(played.map(prompt=>prompt.id)),keys=new Set(played.map(prompt=>prompt.key));
  return playablePrompts(game,prompts).filter(entry=>!ids.has(entry.id)&&!keys.has(promptIdentity(entry)));
}

export function updateAvailability(game: Game, prompts: Entry[]) {
  game.availableRounds = Math.floor(unseenPrompts(game, prompts).length/(game.mode==='taboo'?2:1));
  game.totalRounds = Math.max(1, Math.min(game.totalRounds, maximumRounds(game)));
}

export const maximumRounds = (game: Pick<Game, 'availableRounds'>) =>
  Math.min(10, game.availableRounds ?? Infinity);
