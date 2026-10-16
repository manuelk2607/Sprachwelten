CREATE TABLE app_admins (user_id uuid PRIMARY KEY, granted_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE content_entries ADD COLUMN deleted_at timestamptz;
ALTER TABLE content_entries ADD COLUMN updated_at timestamptz;
ALTER TABLE content_entries ADD COLUMN revision integer NOT NULL DEFAULT 0;
DROP INDEX content_entries_identity;
DROP INDEX content_entries_audio_identity;
CREATE UNIQUE INDEX content_entries_identity ON content_entries (kind,lower(language),content_phrase_key(phrase),(CASE WHEN kind='dialect' THEN coalesce(region_id,region) WHEN kind='situation' THEN coalesce(context_id,context) WHEN kind='attribution' THEN coalesce(challenge->>'category','') WHEN kind='false_friend' THEN coalesce(challenge->>'otherLanguage','') || ':' || content_phrase_key(coalesce(challenge->>'otherWord','')) WHEN kind='word_order' THEN coalesce(challenge->>'targetLanguage','') ELSE '' END)) WHERE presentation<>'audio' AND deleted_at IS NULL;
CREATE UNIQUE INDEX content_entries_audio_identity ON content_entries (kind,lower(language),audio_hash,(CASE WHEN kind='dialect' THEN coalesce(region_id,region) WHEN kind='situation' THEN coalesce(context_id,context) WHEN kind='attribution' THEN coalesce(challenge->>'category','') WHEN kind='false_friend' THEN coalesce(challenge->>'otherLanguage','') || ':' || content_phrase_key(coalesce(challenge->>'otherWord','')) WHEN kind='word_order' THEN coalesce(challenge->>'targetLanguage','') ELSE '' END)) WHERE audio_hash IS NOT NULL AND deleted_at IS NULL;
CREATE TABLE moderation_events (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, admin_id uuid NOT NULL, entry_id uuid NOT NULL, action text NOT NULL CHECK (action IN ('edit','remove','restore')), created_at timestamptz NOT NULL DEFAULT now());
