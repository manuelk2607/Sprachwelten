-- The greatest verified central revocation time is retained for each mapped
-- identity. Removing a marker could restore a previously revoked fallback.
CREATE TABLE public.worlds_session_revocations (
  issuer text NOT NULL CHECK (length(issuer) BETWEEN 1 AND 2048),
  subject text NOT NULL CHECK (length(subject) BETWEEN 1 AND 512),
  revoked_through bigint NOT NULL CHECK (revoked_through > 0),
  PRIMARY KEY (issuer, subject)
);
REVOKE ALL ON public.worlds_session_revocations FROM PUBLIC;

-- Remove expired, unverified and older fallback grants for the affected link.
-- Keep a native grant only when its provider session is newer than the event.
CREATE FUNCTION public.revoke_worlds_native_grants() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
BEGIN
  DELETE FROM public.worlds_legacy_sessions g
  USING public.worlds_identity_links l
  WHERE l.issuer=NEW.issuer AND l.subject=NEW.subject AND g.local_user_id=l.local_user_id
    AND NOT EXISTS (
      SELECT 1 FROM neon_auth.session s
      WHERE s."userId"::text=g.local_user_id::text
        AND encode(sha256(convert_to(s.id::text,'UTF8')),'hex')=g.session_hash
        AND extract(epoch FROM s."createdAt")*1000>NEW.revoked_through
        AND s."expiresAt">statement_timestamp()
    );
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.revoke_worlds_native_grants() FROM PUBLIC;
CREATE TRIGGER worlds_revoke_native_grants
AFTER INSERT OR UPDATE ON public.worlds_session_revocations
FOR EACH ROW EXECUTE FUNCTION public.revoke_worlds_native_grants();

-- A later first link must not capture a session already covered by a revocation.
CREATE OR REPLACE FUNCTION public.capture_worlds_legacy_sessions() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
DECLARE captured uuid;
BEGIN
  UPDATE public.worlds_project_accounts SET legacy_cutover_at=statement_timestamp()
  WHERE id=NEW.local_user_id AND kind='legacy' AND legacy_cutover_at IS NULL
  RETURNING id INTO captured;
  IF captured IS NOT NULL AND EXISTS(SELECT 1 FROM public.worlds_project_accounts WHERE id=captured AND legacy_login_eligible) THEN
    INSERT INTO public.worlds_legacy_sessions(local_user_id,session_hash,expires_at)
    SELECT captured,encode(sha256(convert_to(s.id::text,'UTF8')),'hex'),s."expiresAt"
    FROM neon_auth.session s
    WHERE s."userId"::text=captured::text AND s."expiresAt">statement_timestamp()
      AND NOT EXISTS (
        SELECT 1 FROM public.worlds_session_revocations r
        WHERE r.issuer=NEW.issuer AND r.subject=NEW.subject
          AND r.revoked_through>=extract(epoch FROM s."createdAt")*1000
      );
  END IF;
  RETURN NEW;
END;
$$;
