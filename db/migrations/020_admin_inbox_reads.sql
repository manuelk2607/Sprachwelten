CREATE TABLE admin_inbox_reads (
  user_id uuid NOT NULL,
  entry_id uuid NOT NULL REFERENCES content_entries(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, entry_id)
);
CREATE INDEX admin_inbox_reads_entry ON admin_inbox_reads(entry_id);
