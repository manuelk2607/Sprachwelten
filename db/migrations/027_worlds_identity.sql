-- Isolated Worlds OIDC pilot storage. Existing account and content keys stay in place.
CREATE TABLE public.worlds_identity_links (
  issuer text NOT NULL CHECK (length(issuer) BETWEEN 1 AND 2048),
  subject text NOT NULL CHECK (length(subject) BETWEEN 1 AND 512),
  local_user_id uuid NOT NULL REFERENCES neon_auth."user"(id) ON DELETE CASCADE,
  linked_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (issuer, subject),
  UNIQUE (local_user_id)
);

CREATE TABLE public.worlds_link_proofs (
  proof_hash text PRIMARY KEY,
  issuer text NOT NULL,
  subject text NOT NULL,
  local_user_id uuid NOT NULL REFERENCES neon_auth."user"(id) ON DELETE CASCADE,
  session_hash text NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE INDEX worlds_link_proofs_expiry ON public.worlds_link_proofs(expires_at);
CREATE INDEX worlds_link_proofs_account ON public.worlds_link_proofs(local_user_id);

CREATE TABLE public.worlds_link_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  issuer text NOT NULL,
  subject text NOT NULL,
  local_user_id uuid NOT NULL,
  event text NOT NULL CHECK (event IN ('linked', 'unlinked')),
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.worlds_auth_transactions (
  id text PRIMARY KEY,
  payload jsonb NOT NULL,
  expires bigint NOT NULL
);
CREATE INDEX worlds_auth_transactions_expiry ON public.worlds_auth_transactions(expires);

CREATE TABLE public.worlds_auth_sessions (
  id text PRIMARY KEY,
  issuer text NOT NULL,
  subject text NOT NULL,
  sid text,
  payload jsonb NOT NULL,
  expires bigint NOT NULL
);
CREATE INDEX worlds_auth_sessions_identity ON public.worlds_auth_sessions(issuer, subject, sid);
CREATE INDEX worlds_auth_sessions_expiry ON public.worlds_auth_sessions(expires);

CREATE TABLE public.worlds_auth_replays (
  id text PRIMARY KEY,
  expires bigint NOT NULL
);
CREATE INDEX worlds_auth_replays_expiry ON public.worlds_auth_replays(expires);

REVOKE ALL ON public.worlds_identity_links, public.worlds_link_proofs, public.worlds_link_audit,
  public.worlds_auth_transactions, public.worlds_auth_sessions, public.worlds_auth_replays FROM PUBLIC;
