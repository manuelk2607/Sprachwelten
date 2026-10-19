import type { Entry, Explanation } from "../lib/content";
import type { GameView } from "../lib/game";
import type {
  SavedTranslation,
  TranslationTexts,
} from "../lib/content-translations";
import type { AdminUser } from "../lib/admin-types";
// Expected response shapes used after integration tests assert the HTTP status.
// Tests that inspect a round first assert its phase before using these fields.
export type TestEntry = Entry & {
  revision: number;
  authorId?:string;
  languageNames:NonNullable<Entry["languageNames"]>;
  translations: { de: SavedTranslation; en: SavedTranslation };
};
export type TestRoom = GameView & {
  prompt: NonNullable<GameView["prompt"]>;
  revelation: NonNullable<GameView["revelation"]>;
  pronunciation: NonNullable<GameView["pronunciation"]>;
};
export type TestPayload = {
  error?: string;
  id: string;
  token: string;
  room: TestRoom;
  entry: TestEntry;
  entries: TestEntry[];
  user: { id: string; name: string };
  users: AdminUser[];
  isAdmin: boolean;
  canEdit: boolean;
  canSuggest: boolean;
  translation: TranslationTexts;
  cached: boolean;
  available: boolean;
  duplicate: { id: string; phrase: string };
  explanations: Explanation[];
  audio: { id: string; durationMs: number };
  removed: boolean;
  more: boolean;
  unreadCount: number;
  languages: { code: string; label: string }[];
  regions: Record<string, { de: string; en: string }>;
  suggestions: { id: string; status: string; note: string; feedback: string }[];
  events: {
    id: string;
    phrase: string;
    kind: Entry["kind"];
    createdAt: string;
    unread: boolean;
  }[];
};
