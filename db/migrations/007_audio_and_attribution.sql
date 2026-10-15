CREATE TABLE pronunciation_audio (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 owner_id text NOT NULL,
 storage_key text NOT NULL UNIQUE,
 byte_size integer NOT NULL CHECK (byte_size BETWEEN 46 AND 640044),
 duration_ms integer NOT NULL CHECK (duration_ms BETWEEN 1 AND 20000),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX pronunciation_audio_owner ON pronunciation_audio(owner_id,created_at);
CREATE TABLE audio_upload_budget (
 key text PRIMARY KEY,
 clips integer NOT NULL CHECK (clips>=0 AND clips<=500)
);
ALTER TABLE content_entries ADD COLUMN credit_name text NOT NULL DEFAULT '' CHECK (length(credit_name)<=80);
ALTER TABLE content_entries ADD COLUMN audio_id uuid REFERENCES pronunciation_audio(id);
CREATE INDEX content_audio ON content_entries(audio_id) WHERE audio_id IS NOT NULL;
ALTER TABLE explanations ADD COLUMN credit_name text NOT NULL DEFAULT '' CHECK (length(credit_name)<=80);
