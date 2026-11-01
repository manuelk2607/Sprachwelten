import { shuffled } from './random';

export const wheelDurationMs = 4000;
export type WheelSelection = {
  id: string;
  startedAt: number;
  endsAt: number;
  players: { id: string; name: string }[];
  selectedId: string;
  eligibleIds: string[];
};

// Rejection-sampled Fisher–Yates gives each eligible player the same chance.
// Excluding only the previous speaker avoids immediate repeats; no join-order bias.
export function drawSpeaker(players: {id:string;name:string}[], previousId?:string, now=Date.now()): WheelSelection {
  if (!players.length) throw new Error('A wheel needs at least one player.');
  const alternatives = players.filter(player => player.id !== previousId);
  const eligible = alternatives.length ? alternatives : players;
  return { id:crypto.randomUUID(), startedAt:now, endsAt:now+wheelDurationMs,
    players:players.map(({id,name})=>({id,name})),
    selectedId:shuffled(eligible)[0].id, eligibleIds:eligible.map(player=>player.id) };
}

export function wheelRotation(selection: WheelSelection) {
  const index=selection.players.findIndex(player=>player.id===selection.selectedId);
  return 360*5+360-(index+0.5)*360/selection.players.length;
}
