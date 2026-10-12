-- One row per sign-in code email actually sent, for the per-address limit in lib/auth-options.ts.
-- Separate from better-auth's "verification" table on purpose: that row is deleted after 5 wrong
-- guesses, so counting it would let someone reset the limit by guessing badly.
create table sign_in_code_sends (
  id bigint generated always as identity primary key,
  email text not null,
  sent_at timestamptz not null default now()
);
create index sign_in_code_sends_email_sent_at_idx on sign_in_code_sends (email, sent_at);
