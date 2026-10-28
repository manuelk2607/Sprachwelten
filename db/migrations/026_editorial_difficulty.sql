CREATE TABLE entry_difficulty_reviews (
 entry_id uuid PRIMARY KEY REFERENCES content_entries(id) ON DELETE CASCADE,
 content_revision integer NOT NULL CHECK(content_revision>=0),
 review_revision integer NOT NULL DEFAULT 1 CHECK(review_revision>0),
 level text NOT NULL CHECK(level IN ('introductory','intermediate','advanced')),
 reviewed boolean NOT NULL DEFAULT false,
 reviewed_at date NOT NULL,
 sources jsonb NOT NULL CHECK(jsonb_typeof(sources)='array' AND jsonb_array_length(sources) BETWEEN 1 AND 8),
 rationale text NOT NULL CHECK(length(trim(rationale)) BETWEEN 20 AND 1500),
 reviewer_id uuid NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE entry_difficulty_events (
 entry_id uuid NOT NULL REFERENCES content_entries(id) ON DELETE CASCADE,
 review_revision integer NOT NULL,
 actor_id uuid NOT NULL,
 data jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(entry_id,review_revision)
);
CREATE INDEX entry_difficulty_active ON entry_difficulty_reviews(level,entry_id) WHERE reviewed;
