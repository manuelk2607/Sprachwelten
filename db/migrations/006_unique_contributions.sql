CREATE FUNCTION content_phrase_key(value text) RETURNS text
LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
RETURN lower(btrim(regexp_replace(normalize(value, NFKC), '[[:space:]]+', ' ', 'g'), ' .!?…。！？'));
CREATE UNIQUE INDEX content_entries_identity ON content_entries (
  kind,
  lower(language),
  content_phrase_key(phrase),
  (CASE WHEN kind='dialect' THEN coalesce(region_id,region) WHEN kind='situation' THEN coalesce(context_id,context) ELSE '' END)
);
