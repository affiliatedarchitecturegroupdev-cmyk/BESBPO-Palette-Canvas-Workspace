-- N1.1/N1.2: transactional mail transport + credential-token lifetime.
--
-- email_outbox previously held only the token; there was no record of whether
-- a message was actually handed to a provider, because no provider existed.
-- The send-outcome columns make the outbox an audit trail rather than a queue
-- of intent, which is what lets an operator answer "was the verification mail
-- delivered?" without reading application logs.
--
-- expires_at gives credential tokens a lifetime. Until N1.1 a token was valid
-- forever until used, so a leaked verification link stayed live indefinitely.

ALTER TABLE email_outbox ADD COLUMN IF NOT EXISTS delivered_at   TIMESTAMPTZ;
ALTER TABLE email_outbox ADD COLUMN IF NOT EXISTS send_error     TEXT;
ALTER TABLE email_outbox ADD COLUMN IF NOT EXISTS transport      TEXT;
ALTER TABLE email_outbox ADD COLUMN IF NOT EXISTS send_attempts  INTEGER NOT NULL DEFAULT 0;
ALTER TABLE email_outbox ADD COLUMN IF NOT EXISTS expires_at     TIMESTAMPTZ;

-- Token lookup by kind + hash is the hot path for verify/reset.
CREATE INDEX IF NOT EXISTS email_outbox_token_idx ON email_outbox (kind, token_hash);

-- N1.3 password reset: track the last credential change so a reset can revoke
-- older sessions without revoking the one it just issued.
ALTER TABLE person ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;
