CREATE TABLE round_reports (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 fingerprint text NOT NULL UNIQUE,
 entry_id uuid REFERENCES content_entries(id) ON DELETE SET NULL,
 snapshot jsonb NOT NULL,
 mode text NOT NULL,
 reason text NOT NULL CHECK (reason IN ('answer','translation','audio','other')),
 note text NOT NULL DEFAULT '',
 status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
 revision integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now(),
 resolved_at timestamptz,
 resolved_by uuid
);
CREATE INDEX round_reports_open ON round_reports(created_at DESC,id) WHERE status='open';
