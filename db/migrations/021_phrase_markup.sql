-- Presentation metadata never changes the canonical expression or its uniqueness key.
ALTER TABLE content_entries ADD COLUMN IF NOT EXISTS phrase_markup text NOT NULL DEFAULT '';
ALTER TABLE content_entries ADD CONSTRAINT content_entries_phrase_markup_length CHECK (length(phrase_markup) <= 900);
