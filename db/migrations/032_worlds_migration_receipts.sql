ALTER TABLE public.worlds_link_audit
  ADD COLUMN receipt_eligible boolean NOT NULL DEFAULT false,
  ADD COLUMN receipt_reported_at timestamptz,
  ADD COLUMN receipt_conflict_at timestamptz;

-- Only a current legacy link with an existing audit entry is eligible.
-- Historical links removed before this migration cannot be re-announced.
UPDATE public.worlds_link_audit audit
SET receipt_eligible=true
FROM public.worlds_identity_links link
JOIN public.worlds_project_accounts account ON account.id=link.local_user_id
WHERE account.kind='legacy' AND audit.event='linked'
  AND (audit.issuer,audit.subject,audit.local_user_id)=(link.issuer,link.subject,link.local_user_id)
  AND audit.id=(
    SELECT max(previous.id)
    FROM public.worlds_link_audit previous
    WHERE (previous.issuer,previous.subject,previous.local_user_id)=(link.issuer,link.subject,link.local_user_id)
  );

CREATE INDEX worlds_link_audit_pending_receipt ON public.worlds_link_audit(issuer,id)
 WHERE receipt_eligible AND receipt_reported_at IS NULL AND receipt_conflict_at IS NULL;

CREATE FUNCTION public.worlds_classify_link_receipt() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
BEGIN
  IF NEW.event='linked' THEN
    NEW.receipt_eligible := EXISTS (
      SELECT 1 FROM public.worlds_project_accounts
      WHERE id=NEW.local_user_id AND kind='legacy'
    );
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.worlds_classify_link_receipt() FROM PUBLIC;
CREATE TRIGGER worlds_classify_link_receipt BEFORE INSERT ON public.worlds_link_audit
FOR EACH ROW EXECUTE FUNCTION public.worlds_classify_link_receipt();

CREATE FUNCTION public.worlds_record_legacy_unlink() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.worlds_link_audit
    WHERE (issuer,subject,local_user_id)=(OLD.issuer,OLD.subject,OLD.local_user_id)
      AND event='linked' AND receipt_eligible
  ) THEN
    INSERT INTO public.worlds_link_audit(issuer,subject,local_user_id,event,receipt_eligible)
    VALUES (OLD.issuer,OLD.subject,OLD.local_user_id,'unlinked',true);
    DELETE FROM public.worlds_auth_sessions WHERE issuer=OLD.issuer AND subject=OLD.subject;
  END IF;
  RETURN OLD;
END;
$$;
REVOKE ALL ON FUNCTION public.worlds_record_legacy_unlink() FROM PUBLIC;
CREATE TRIGGER worlds_record_legacy_unlink AFTER DELETE ON public.worlds_identity_links
FOR EACH ROW EXECUTE FUNCTION public.worlds_record_legacy_unlink();
