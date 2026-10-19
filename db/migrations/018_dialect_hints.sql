ALTER TABLE content_entries ADD COLUMN hint text NOT NULL DEFAULT '' CHECK (length(hint)<=300);
