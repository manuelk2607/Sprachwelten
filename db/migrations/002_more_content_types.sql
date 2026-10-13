ALTER TABLE content_entries DROP CONSTRAINT IF EXISTS content_entries_kind_check;
ALTER TABLE content_entries ADD CONSTRAINT content_entries_kind_check CHECK (kind IN ('idiom','dialect','situation','word','tongue_twister'));
