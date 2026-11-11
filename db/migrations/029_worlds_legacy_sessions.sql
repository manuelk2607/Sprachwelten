-- Application-owned transition records only. Native Auth remains read-only.
ALTER TABLE public.worlds_project_accounts ADD COLUMN legacy_cutover_at timestamptz;
ALTER TABLE public.worlds_project_accounts ADD COLUMN legacy_login_eligible boolean NOT NULL DEFAULT false;
-- Freeze the existing directory before activating the Worlds-only mode.
INSERT INTO public.worlds_project_accounts(id,kind,legacy_user_id,display_name)
SELECT id,'legacy',id,left(coalesce(nullif(btrim(name),''),'Worlds'),120) FROM neon_auth."user"
ON CONFLICT(id) DO NOTHING;
UPDATE public.worlds_project_accounts a SET legacy_login_eligible=true
FROM neon_auth."user" u WHERE a.kind='legacy' AND a.legacy_user_id=u.id;
-- Existing links have no trustworthy original session snapshot: do not invent one.
UPDATE public.worlds_project_accounts a SET legacy_cutover_at=l.linked_at
FROM public.worlds_identity_links l WHERE a.id=l.local_user_id AND a.kind='legacy';

CREATE TABLE public.worlds_legacy_sessions (
  local_user_id uuid NOT NULL REFERENCES public.worlds_project_accounts(id) ON DELETE CASCADE,
  session_hash text NOT NULL CHECK (session_hash ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz NOT NULL,
  PRIMARY KEY(local_user_id,session_hash)
);
CREATE INDEX worlds_legacy_sessions_expiry ON public.worlds_legacy_sessions(expires_at);
REVOKE ALL ON public.worlds_legacy_sessions FROM PUBLIC;

CREATE FUNCTION public.capture_worlds_legacy_sessions() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
DECLARE captured uuid;
BEGIN
  -- First link only: unlink/relink must never reopen password authentication.
  UPDATE public.worlds_project_accounts SET legacy_cutover_at=statement_timestamp()
  WHERE id=NEW.local_user_id AND kind='legacy' AND legacy_cutover_at IS NULL
  RETURNING id INTO captured;
  IF captured IS NOT NULL AND EXISTS(SELECT 1 FROM public.worlds_project_accounts WHERE id=captured AND legacy_login_eligible) THEN
    INSERT INTO public.worlds_legacy_sessions(local_user_id,session_hash,expires_at)
    SELECT captured,encode(sha256(convert_to(s.id::text,'UTF8')),'hex'),s."expiresAt"
    FROM neon_auth.session s
    WHERE s."userId"::text=captured::text AND s."expiresAt">statement_timestamp();
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.capture_worlds_legacy_sessions() FROM PUBLIC;
CREATE TRIGGER worlds_capture_legacy_sessions AFTER INSERT ON public.worlds_identity_links
FOR EACH ROW EXECUTE FUNCTION public.capture_worlds_legacy_sessions();

CREATE FUNCTION public.revoke_unlinked_legacy_sessions() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
BEGIN
  DELETE FROM public.worlds_legacy_sessions WHERE local_user_id=OLD.local_user_id;
  RETURN OLD;
END;
$$;
REVOKE ALL ON FUNCTION public.revoke_unlinked_legacy_sessions() FROM PUBLIC;
CREATE TRIGGER worlds_revoke_unlinked_sessions AFTER DELETE ON public.worlds_identity_links
FOR EACH ROW EXECUTE FUNCTION public.revoke_unlinked_legacy_sessions();
