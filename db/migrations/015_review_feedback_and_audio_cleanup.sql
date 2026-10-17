ALTER TABLE entry_suggestions ADD COLUMN review_feedback text NOT NULL DEFAULT '' CHECK(length(review_feedback)<=1000);
ALTER TABLE entry_suggestions ADD COLUMN audio_id uuid REFERENCES pronunciation_audio(id);
UPDATE entry_suggestions s SET audio_id=a.id FROM pronunciation_audio a WHERE s.status='pending' AND s.payload->>'audioId'=a.id::text;
CREATE INDEX entry_suggestions_audio ON entry_suggestions(audio_id) WHERE audio_id IS NOT NULL;
CREATE INDEX entry_suggestions_author ON entry_suggestions(author_id,created_at DESC,id);
CREATE TABLE audio_deletion_queue(storage_key text PRIMARY KEY,queued_at timestamptz NOT NULL DEFAULT now());
