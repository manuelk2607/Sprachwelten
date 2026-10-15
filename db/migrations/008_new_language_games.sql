ALTER TABLE content_entries DROP CONSTRAINT content_entries_kind_check;
ALTER TABLE content_entries ADD CONSTRAINT content_entries_kind_check CHECK (kind IN ('idiom','dialect','situation','word','tongue_twister','gaming_mission','youth_chat','academic','sound_pair','attribution'));
ALTER TABLE content_entries ADD COLUMN challenge jsonb;
ALTER TABLE content_entries ADD CONSTRAINT content_entries_challenge_object CHECK (challenge IS NULL OR jsonb_typeof(challenge)='object');
DROP INDEX content_entries_identity;
CREATE UNIQUE INDEX content_entries_identity ON content_entries (kind,lower(language),content_phrase_key(phrase),(CASE WHEN kind='dialect' THEN coalesce(region_id,region) WHEN kind='situation' THEN coalesce(context_id,context) WHEN kind='attribution' THEN coalesce(challenge->>'category','') ELSE '' END));
