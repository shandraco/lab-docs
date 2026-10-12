-- The caller's address per send, so the tight limit is per (email, caller) and one caller cannot
-- use up someone else's allowance and lock them out. See lib/sign-in-limit.ts.
alter table sign_in_code_sends add column ip text not null default '';
create index sign_in_code_sends_email_ip_sent_at_idx on sign_in_code_sends (email, ip, sent_at);
