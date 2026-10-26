ALTER TABLE content_entries DROP CONSTRAINT content_entries_kind_check;
ALTER TABLE content_entries ADD CONSTRAINT content_entries_kind_check CHECK (kind IN ('idiom','dialect','situation','word','tongue_twister','gaming_mission','youth_chat','academic','sound_pair','attribution','false_friend','word_order','joke','word_group','loanword','taboo','vocabulary','grammar'));
CREATE TABLE learning_progress (
  owner_id text NOT NULL,
  entry_id uuid NOT NULL REFERENCES content_entries(id) ON DELETE CASCADE,
  question_id text NOT NULL,
  revision integer NOT NULL,
  streak integer NOT NULL DEFAULT 0,
  lapses integer NOT NULL DEFAULT 0,
  attempts integer NOT NULL DEFAULT 0,
  due_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id,entry_id,question_id)
);
CREATE INDEX learning_progress_due ON learning_progress(owner_id,due_at);
CREATE TABLE learning_attempts (
  id uuid PRIMARY KEY,
  owner_id text NOT NULL,
  entry_id uuid NOT NULL REFERENCES content_entries(id) ON DELETE CASCADE,
  question_id text NOT NULL,
  revision integer NOT NULL,
  question jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  correct boolean,
  persistent boolean NOT NULL DEFAULT false
);
CREATE INDEX learning_attempts_expiry ON learning_attempts(owner_id,expires_at);
CREATE UNIQUE INDEX learning_one_pending ON learning_attempts(owner_id,entry_id,question_id,revision) WHERE consumed_at IS NULL;
