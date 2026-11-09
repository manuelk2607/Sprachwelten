-- Application-owned profiles: central sign-in never requires another native Auth account.
-- Historical UUIDs remain unchanged, including contribution owners and local admin grants.
CREATE TABLE public.worlds_project_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('legacy','worlds')),
  legacy_user_id uuid UNIQUE REFERENCES neon_auth."user"(id) ON DELETE SET NULL,
  display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 120),
  disabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (kind='legacy' OR legacy_user_id IS NULL)
);
INSERT INTO public.worlds_project_accounts(id,kind,legacy_user_id,display_name)
SELECT id,'legacy',id,left(coalesce(nullif(btrim(name),''),'Worlds'),120) FROM neon_auth."user";
ALTER TABLE public.worlds_identity_links DROP CONSTRAINT worlds_identity_links_local_user_id_fkey;
ALTER TABLE public.worlds_identity_links ADD CONSTRAINT worlds_identity_links_local_user_id_fkey
  FOREIGN KEY (local_user_id) REFERENCES public.worlds_project_accounts(id) ON DELETE CASCADE;
REVOKE ALL ON public.worlds_project_accounts FROM PUBLIC;
