ALTER TABLE content_entries DROP CONSTRAINT IF EXISTS content_entries_phrase_check;
ALTER TABLE content_entries ADD CONSTRAINT content_entries_phrase_check CHECK (length(phrase) BETWEEN 1 AND 180);
