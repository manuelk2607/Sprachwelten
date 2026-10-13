CREATE TABLE IF NOT EXISTS content_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('idiom','dialect','situation')),
  phrase text NOT NULL CHECK (length(phrase) BETWEEN 3 AND 180),
  language text NOT NULL,
  literal text NOT NULL DEFAULT '',
  meaning text NOT NULL,
  example text NOT NULL DEFAULT '',
  region text NOT NULL DEFAULT '',
  cultural_note text NOT NULL DEFAULT '',
  context text NOT NULL DEFAULT '',
  source_url text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'community' CHECK (status IN ('curated','community')),
  author_id text,
  author_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS content_filter ON content_entries(kind,language,created_at DESC);
CREATE INDEX IF NOT EXISTS content_author ON content_entries(author_id,created_at DESC);
CREATE TABLE IF NOT EXISTS explanations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES content_entries(id) ON DELETE CASCADE,
  author_id text NOT NULL,
  author_name text NOT NULL,
  body text NOT NULL CHECK (length(body) BETWEEN 10 AND 1500),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS explanations_entry ON explanations(entry_id,created_at);
CREATE INDEX IF NOT EXISTS explanations_author ON explanations(author_id,created_at DESC);
CREATE TABLE IF NOT EXISTS game_rooms (
  code text PRIMARY KEY CHECK (code ~ '^[A-Z0-9]{6}$'),
  state jsonb NOT NULL,
  version integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '24 hours'
);
CREATE INDEX IF NOT EXISTS game_rooms_expiration ON game_rooms(expires_at);
CREATE TABLE IF NOT EXISTS request_limits (
  key text PRIMARY KEY,
  hits integer NOT NULL,
  expires_at timestamptz NOT NULL
);
