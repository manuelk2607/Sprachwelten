import type { GameView } from "./game";

export function roomPollDelay(room: GameView | null) {
  if (!room) return 1200;
  if (room.phase === "finished") return 8000;
  if (room.phase === "lobby") return 3000;
  if (room.phase === "reveal")
    return room.hostId === room.playerId ? 5000 : 2000;
  const me = room.players.find((player) => player.id === room.playerId);
  const waiting =
    room.phase === "voting"
      ? !!room.selectedOptionId
      : room.phase === "writing"
        ? !!me?.answered
        : room.phase === "ordering"
          ? !!room.wordOrder?.submitted
          : room.phase === "rating"
            ? !!room.pronunciation?.hasRated
            : room.phase === "speaking"
              ? room.pronunciation?.speaker.id !== room.playerId
              : room.phase === "linking"
                ? room.chain?.activePlayerId !== room.playerId
                : false;
  return waiting ? 2500 : 1500;
}
