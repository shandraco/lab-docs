-- Lab Docs core schema.
-- The rule this schema exists to keep: a finalised document version never changes. The
-- trigger below enforces it in the database, so no code path (or bug) can rewrite a
-- document a client has already received. Edits after that start a new version.

alter table "user" add constraint user_role_check check (role in ('owner', 'staff', 'partner'));

-- The lab's own details, printed on every document. One row.
create table lab_settings (
  id smallint primary key default 1 check (id = 1),
  name text not null default '',
  legal_name text not null default '',
  entity_description text not null default '',
  address text not null default '',
  email text not null default '',
  phone text not null default '',
  website text not null default '',
  signer_name text not null default '',
  signer_title text not null default '',
  governing_law text not null default '',
  venue text not null default '',
  updated_at timestamptz not null default now(),
  updated_by text references "user" (id)
);
insert into lab_settings (id) values (1);

create table clients (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  legal_name text not null default '',
  entity_description text not null default '',
  address text not null default '',
  contact_name text not null default '',
  contact_title text not null default '',
  contact_email text not null default '',
  notes text not null default '',
  created_by text not null references "user" (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);
create index clients_name_idx on clients (lower(name)) where archived_at is null;

create table templates (
  id text primary key,
  kind text not null check (kind in ('msa', 'sow', 'outreach_email', 'capability')),
  name text not null,
  summary text not null,
  sort integer not null default 0
);

create table template_versions (
  id uuid primary key default gen_random_uuid(),
  template_id text not null references templates (id),
  number integer not null check (number > 0),
  definition jsonb not null,
  attorney_reviewed_at timestamptz,
  attorney_reviewed_by text references "user" (id),
  created_by text references "user" (id),
  created_at timestamptz not null default now(),
  unique (template_id, number)
);

create table documents (
  id uuid primary key default gen_random_uuid(),
  template_id text not null references templates (id),
  client_id uuid not null references clients (id),
  title text not null check (length(trim(title)) > 0),
  created_by text not null references "user" (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);
create index documents_recent_idx on documents (updated_at desc) where archived_at is null;
create index documents_client_idx on documents (client_id);

create table document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents (id),
  number integer not null check (number > 0),
  template_version_id uuid not null references template_versions (id),
  answers jsonb not null default '{}'::jsonb,
  -- Set together when the version is finalised: the fully worded document as sent, and its
  -- SHA-256, so a later dispute can prove which text the client received.
  snapshot jsonb,
  content_hash text,
  finalized_at timestamptz,
  finalized_by text references "user" (id),
  created_by text not null references "user" (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (document_id, number),
  check ((finalized_at is null) = (snapshot is null) and (snapshot is null) = (content_hash is null))
);
-- At most one draft per document.
create unique index document_versions_one_draft on document_versions (document_id) where finalized_at is null;

create function forbid_changing_final_versions() returns trigger language plpgsql as $$
begin
  if old.finalized_at is not null then
    raise exception 'document version % is final and cannot be changed', old.id
      using errcode = 'check_violation';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;

create trigger document_versions_final_is_final
  before update or delete on document_versions
  for each row execute function forbid_changing_final_versions();

-- Template wording is immutable once saved; a change is a new version. Only the review
-- stamp may be set afterwards.
create function forbid_changing_template_wording() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' or new.definition is distinct from old.definition
     or new.template_id is distinct from old.template_id or new.number is distinct from old.number then
    raise exception 'template version % is fixed; save a new version instead', old.id
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

create trigger template_versions_fixed
  before update or delete on template_versions
  for each row execute function forbid_changing_template_wording();

create table audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor_id text references "user" (id),
  action text not null,
  entity text not null,
  entity_id text not null,
  detail jsonb not null default '{}'::jsonb
);
create index audit_log_entity_idx on audit_log (entity, entity_id, at desc);
