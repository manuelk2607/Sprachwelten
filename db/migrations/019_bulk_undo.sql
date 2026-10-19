ALTER TABLE moderation_events ADD COLUMN batch_id uuid;
ALTER TABLE moderation_events ADD COLUMN previous_data jsonb;
ALTER TABLE moderation_events ADD COLUMN expected_revision integer;
CREATE INDEX moderation_events_batch ON moderation_events(batch_id) WHERE batch_id IS NOT NULL;
ALTER TABLE moderation_events DROP CONSTRAINT moderation_events_action_check;
ALTER TABLE moderation_events ADD CONSTRAINT moderation_events_action_check CHECK(action IN ('edit','remove','restore','edit-own','remove-own','bulk','undo-bulk'));
