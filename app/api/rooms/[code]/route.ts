import { withRoomAudio } from "@/lib/room-audio";
import { roomAction, roomCode } from "@/lib/content";
import { body, playerToken, respond, safe } from "@/lib/http";
import { act, GameError, viewGame } from "@/lib/game";
import {
  gamePrompts,
  getRoom,
  readRoomConditional,
  mutateRoom,
} from "@/db/repository";
import { heartbeatRoom } from "@/db/room-presence";
import {
  unseenPrompts,
  poolKey,
  updateAvailability,
  type RoomPoolSettings,
} from "@/lib/game-pool";
import { roomVersion } from "@/lib/room-etag";
type Context = { params: Promise<{ code: string }> };
export const GET = (request: Request, ctx: Context) =>
  safe(async () => {
    const code = roomCode.parse((await ctx.params).code),
      token = await playerToken(request);
    const { state, version } = await readRoomConditional(
      code,
      token,
      roomVersion(request.headers.get("if-none-match")),
    );
    const player = state?.players.find((p) => p.tokenHash === token);
    const response =
      state && player
        ? respond({ room: viewGame(state, player.id) })
        : new Response(null, {
            status: 304,
            headers: { "Cache-Control": "private, no-store" },
          });
    response.headers.set("ETag", `"room-v${version}"`);
    response.headers.set("Vary", "Authorization");
    return withRoomAudio(response, request, code, token);
  });
export const POST = (request: Request, ctx: Context) =>
  safe(async () => {
    const code = roomCode.parse((await ctx.params).code);
    const token = await playerToken(request);
    const action = await body(request, roomAction);
    if (action.action === "heartbeat") {
      const room = await heartbeatRoom(code, token);
      return withRoomAudio(
        room
          ? respond({ room })
          : new Response(null, {
              status: 204,
              headers: { "Cache-Control": "no-store" },
            }),
        request,
        code,
        token,
      );
    }
    let prompts: Awaited<ReturnType<typeof gamePrompts>> = [];
    let expectedPool: string | undefined;
    const settings = (game: RoomPoolSettings) => ({
      ...game,
      ...(action.action === "configure"
        ? {
            ...(action.mode ? { mode: action.mode } : {}),
            ...(action.mode&&action.mode!==game.mode?{gameLanguages:undefined}:{}),
            ...(action.gameLanguages?{gameLanguages:action.gameLanguages}:{}),
            ...(action.meaningCategory
              ? { meaningCategory: action.meaningCategory }
              : {}),
            ...(action.pronunciationCategory
              ? { pronunciationCategory: action.pronunciationCategory }
              : {}),
            ...(action.pronunciationLanguage !== undefined
              ? { pronunciationLanguage: action.pronunciationLanguage,...(!action.gameLanguages?{gameLanguages:undefined}:{}) }
              : {}),
            ...(action.tabooLanguages ? {tabooLanguages:action.tabooLanguages}:{}),
            ...(action.sentenceLanguage ? {sentenceLanguage:action.sentenceLanguage}:{}),
            ...(action.attributionCategory
              ? { attributionCategory: action.attributionCategory }
              : {}),
          }
        : {}),
    });
    const refreshPool =
      action.action === "start" ||
      action.action === "restart" ||
      (action.action === "configure" &&
        [
          action.mode,
          action.gameLanguages,
          action.meaningCategory,
          action.pronunciationCategory,
          action.pronunciationLanguage,
          action.attributionCategory,
          action.tabooLanguages,
          action.sentenceLanguage,
        ].some((value) => value !== undefined));
    if (refreshPool) {
      const { state } = await getRoom(code, false);
      const player = state.players.find((p) => p.tokenHash === token);
      if (!player || player.id !== state.hostId)
        throw new GameError(
          "Nur die Gastgeberin oder der Gastgeber kann starten.",
          403,
        );
      const requested = settings(state);
      expectedPool = poolKey(requested);
      prompts = await gamePrompts(requested.mode, requested);
    }
    let id = "";
    const state = await mutateRoom(
      code,
      (game) => {
        const player = game.players.find((p) => p.tokenHash === token);
        if (!player)
          throw new GameError("Du bist nicht Teil dieses Raums.", 403);
        id = player.id;
        if (expectedPool) {
          const requested = settings(game);
          if (poolKey(requested) !== expectedPool)
            throw new GameError(
              "Die Auswahl wurde inzwischen geändert. Bitte lade die Liste neu.",
              409,
            );
          game.availableRounds = Math.floor(unseenPrompts(requested, prompts).length/(requested.mode==="taboo"?2:1));
        }
        act(game, id, action, prompts);
        if (action.action === "configure" && refreshPool)
          updateAvailability(game, prompts);
      },
      ["start", "restart", "next", "taboo"].includes(action.action),
    );
    return withRoomAudio(
      action.action === "leave"
        ? respond({ left: true })
        : respond({ room: viewGame(state, id) }),
      request,
      code,
      action.action === "leave" ? undefined : token,
    );
  });
