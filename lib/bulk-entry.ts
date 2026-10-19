import { entryInput, storedEntryInput, type Entry } from "./content";
import type { bulkInput } from "./community-input";
import { categoryLabel } from "./quiz-categories";
import { GameError } from "./game";
import type { z } from "zod";

export function prepareBulkEntry(
  entry: Entry,
  patch: z.infer<typeof bulkInput>,
) {
  const changedKind = !!patch.kind && patch.kind !== entry.kind;
  const changed = {
    ...entry,
    kind: patch.kind ?? entry.kind,
    region: patch.regionId
      ? categoryLabel("region", patch.regionId, "de")
      : entry.region,
    context: patch.contextId
      ? categoryLabel("context", patch.contextId, "de")
      : entry.context,
    regionId: patch.regionId ?? entry.regionId ?? undefined,
    contextId: patch.contextId ?? entry.contextId ?? undefined,
    audioId: entry.audioId ?? undefined,
    challenge: entry.challenge ?? undefined,
  };
  // Validate the existing task against the destination kind instead of deleting it.
  const result = (changedKind ? entryInput : storedEntryInput).safeParse(
    changed,
  );
  if (!result.success)
    throw new GameError(
      "Die Sammeländerung passt nicht zu allen Beiträgen. Bitte bearbeite inkompatible Beiträge einzeln. Es wurde nichts geändert.",
      422,
    );
  return result.data;
}
