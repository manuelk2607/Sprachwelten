ALTER TABLE moderation_events DROP CONSTRAINT moderation_events_action_check;
ALTER TABLE moderation_events ADD CONSTRAINT moderation_events_action_check CHECK (action IN ('edit','remove','restore','edit-own','bulk'));
CREATE TABLE entry_suggestions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),entry_id uuid NOT NULL REFERENCES content_entries(id),author_id text NOT NULL,author_name text NOT NULL,base_revision integer NOT NULL,payload jsonb NOT NULL,note text NOT NULL DEFAULT '' CHECK (length(note)<=1000),status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),admin_note text NOT NULL DEFAULT '',reviewer_id uuid,created_at timestamptz NOT NULL DEFAULT now(),reviewed_at timestamptz,revision integer NOT NULL DEFAULT 0);
CREATE INDEX entry_suggestions_pending ON entry_suggestions(status,created_at DESC);
CREATE UNIQUE INDEX entry_suggestion_author_pending ON entry_suggestions(entry_id,author_id) WHERE status='pending';
CREATE TABLE admin_inbox_seen (user_id uuid PRIMARY KEY,last_seen_at timestamptz NOT NULL DEFAULT now());
