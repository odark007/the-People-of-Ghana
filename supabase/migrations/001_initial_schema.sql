-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 001_initial_schema
-- People of Ghana — Core schema with anonymization architecture
-- ─────────────────────────────────────────────────────────────────────────────
-- Run via: supabase db push
-- ─────────────────────────────────────────────────────────────────────────────

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";       -- for fuzzy search
create extension if not exists "unaccent";       -- for accent-insensitive search

-- ─────────────────────────────────────────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────────────────────────────────────────

create type district_type as enum ('district', 'municipal', 'metropolitan');
create type official_role as enum ('regional_minister', 'mp', 'mmdce', 'assembly_member');
create type verification_status as enum ('verified', 'unverified', 'pending');
create type report_category as enum (
  'road', 'water', 'sanitation', 'electricity',
  'health', 'education', 'security', 'environment', 'other'
);
create type content_status as enum ('pending', 'published', 'in_progress', 'resolved', 'rejected');
create type content_type as enum ('report', 'post', 'official');
create type user_role as enum ('user', 'admin', 'superadmin');

-- Anonymization tiers (core to the platform)
-- L1: Full anonymous — no identifier shown, GPS rounded to ~100m
-- L2: Pseudonym    — system-assigned stable name (e.g. "RedEagle_42")
-- L3: Display name — user-chosen, shown as-is
create type anonymity_level as enum ('L1', 'L2', 'L3');

-- ─────────────────────────────────────────────────────────────────────────────
-- NOTE ON PII / PHONE DATA
-- ─────────────────────────────────────────────────────────────────────────────
-- Supabase Auth owns the user's phone number in the auth.users table.
-- We NEVER copy or store phone numbers in our public schema.
-- auth.users is only accessible via the service role key (server-side only).
-- Our public.users table links to auth.users via the same UUID primary key.
-- Phone lookup for moderation is done by superadmin via Supabase dashboard
-- or a dedicated server-side admin function — never exposed in public queries.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- USERS TABLE
-- ─────────────────────────────────────────────────────────────────────────────

create table users (
  -- id matches auth.users.id — this is the authoritative link.
  -- Supabase Auth owns the phone number; we own the profile.
  id                uuid primary key,

  -- Anonymization
  anonymity_level   anonymity_level not null default 'L1',
  pseudonym         text unique,
  display_name      text,
  -- Denormalized display value — updated by trigger on level/name change.
  -- L1 → "Anonymous Citizen", L2 → pseudonym, L3 → display_name
  public_name       text not null default 'Anonymous Citizen',

  -- Auth / status
  is_verified       boolean not null default false,
  role              user_role not null default 'user',

  -- Consent — must be completed before accessing the platform
  consent_given_at  timestamptz,
  consent_version   integer default 1,

  -- Soft delete — never hard-delete; anonymize in place
  deleted_at        timestamptz,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint display_name_length check (
    display_name is null or (length(display_name) >= 2 and length(display_name) <= 50)
  ),
  constraint pseudonym_format check (
    pseudonym is null or pseudonym ~ '^[A-Za-z]+_[0-9]+$'
  )
);

-- public.users links to auth.users via matching UUID primary key.
-- No FK constraint needed — Supabase Auth manages auth.users independently.

-- OTP table intentionally omitted.
-- Supabase Auth manages OTP lifecycle entirely in the auth schema.
-- Configure OTP settings in: Supabase Dashboard → Authentication → Providers → Phone

-- ─────────────────────────────────────────────────────────────────────────────
-- GOVERNANCE HIERARCHY
-- ─────────────────────────────────────────────────────────────────────────────

create table regions (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null unique,
  code        text not null unique,  -- e.g. "GAR", "ASH", "NR"
  created_at  timestamptz not null default now()
);

create table constituencies (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  region_id   uuid not null references regions(id) on delete restrict,
  created_at  timestamptz not null default now(),
  unique(name, region_id)
);

create table districts (
  id               uuid primary key default uuid_generate_v4(),
  name             text not null,
  constituency_id  uuid not null references constituencies(id) on delete restrict,
  type             district_type not null default 'district',
  created_at       timestamptz not null default now(),
  unique(name, constituency_id)
);

create table electoral_areas (
  id           uuid primary key default uuid_generate_v4(),
  name         text not null,
  district_id  uuid not null references districts(id) on delete restrict,
  created_at   timestamptz not null default now(),
  unique(name, district_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- OFFICIALS
-- ─────────────────────────────────────────────────────────────────────────────

create table officials (
  id                   uuid primary key default uuid_generate_v4(),
  full_name            text not null,
  role                 official_role not null,
  -- Jurisdiction — only the relevant FKs are non-null per role
  region_id            uuid references regions(id),
  constituency_id      uuid references constituencies(id),
  district_id          uuid references districts(id),
  electoral_area_id    uuid references electoral_areas(id),
  -- Contact
  phone                text,
  email                text,
  office_address       text,
  photo_url            text,
  -- Status
  verification_status  verification_status not null default 'unverified',
  -- Term
  term_start           date,
  term_end             date,
  -- Meta
  created_by           uuid references users(id),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index idx_officials_region    on officials(region_id);
create index idx_officials_district  on officials(district_id);
create index idx_officials_electoral on officials(electoral_area_id);
create index idx_officials_role      on officials(role);

-- ─────────────────────────────────────────────────────────────────────────────
-- REPORTS
-- ─────────────────────────────────────────────────────────────────────────────

create table reports (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid not null references users(id) on delete restrict,

  title             text not null,
  description       text not null,
  category          report_category not null,

  -- Image: required. Stored in Supabase Storage, EXIF stripped before upload
  image_url         text not null,

  -- Location: GPS rounded to 3dp (~111m precision) for L1/L2 users.
  -- L3 users may opt into exact location — stored in separate column.
  latitude          numeric(8, 5) not null,   -- rounded
  longitude         numeric(8, 5) not null,   -- rounded
  -- Jurisdiction auto-linked from GPS on submission
  region_id         uuid references regions(id),
  constituency_id   uuid references constituencies(id),
  district_id       uuid references districts(id),
  electoral_area_id uuid references electoral_areas(id),

  -- The anonymity level at time of submission — immutable after creation
  -- Ensures historical anonymity even if user upgrades their level later
  reporter_anonymity_level  anonymity_level not null,
  -- The public label shown on this report (snapshot of user.public_name at submit time)
  reporter_public_name      text not null,

  status            content_status not null default 'pending',

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint title_length    check (length(title) between 10 and 120),
  constraint desc_length     check (length(description) between 20 and 2000),
  constraint valid_latitude  check (latitude between -90 and 90),
  constraint valid_longitude check (longitude between -180 and 180)
);

create index idx_reports_region    on reports(region_id);
create index idx_reports_district  on reports(district_id);
create index idx_reports_status    on reports(status);
create index idx_reports_category  on reports(category);
create index idx_reports_created   on reports(created_at desc);
-- Full-text search index
create index idx_reports_fts on reports using gin(
  to_tsvector('english', title || ' ' || description)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- POSTS (Community Feed)
-- ─────────────────────────────────────────────────────────────────────────────

create table posts (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid not null references users(id) on delete restrict,

  content           text not null,
  image_url         text,

  -- Optional location scoping
  region_id         uuid references regions(id),
  district_id       uuid references districts(id),

  -- Same anonymity snapshot pattern as reports
  poster_anonymity_level  anonymity_level not null,
  poster_public_name      text not null,

  status            content_status not null default 'pending',

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint content_length check (length(content) between 10 and 1000)
);

create index idx_posts_status  on posts(status);
create index idx_posts_created on posts(created_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- MODERATION QUEUE
-- ─────────────────────────────────────────────────────────────────────────────

create table moderation_queue (
  id             uuid primary key default uuid_generate_v4(),
  content_type   content_type not null,
  content_id     uuid not null,
  status         content_status not null default 'pending',
  reviewed_by    uuid references users(id),
  reviewed_at    timestamptz,
  review_notes   text,
  created_at     timestamptz not null default now()
);

create index idx_mod_status on moderation_queue(status);
create index idx_mod_type   on moderation_queue(content_type, content_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- AUDIT LOG — PII access logging (append-only)
-- ─────────────────────────────────────────────────────────────────────────────

create table pii_access_log (
  id            uuid primary key default uuid_generate_v4(),
  accessed_by   uuid not null references users(id),
  target_user   uuid not null references users(id),
  access_reason text not null,
  -- Hash of IP for accountability without full exposure
  ip_hash       text,
  created_at    timestamptz not null default now()
);

-- No UPDATE or DELETE on this table — enforced by RLS
comment on table pii_access_log is
  'Append-only audit trail. Records every superadmin access to auth.users phone data. '
  'Phone numbers stay in Supabase Auth — this table records who accessed them and why.';

-- ─────────────────────────────────────────────────────────────────────────────
-- TRIGGERS
-- ─────────────────────────────────────────────────────────────────────────────

-- Auto-update updated_at columns
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_users_updated_at
  before update on users
  for each row execute function update_updated_at();

create trigger trg_reports_updated_at
  before update on reports
  for each row execute function update_updated_at();

create trigger trg_posts_updated_at
  before update on posts
  for each row execute function update_updated_at();

create trigger trg_officials_updated_at
  before update on officials
  for each row execute function update_updated_at();

-- Sync public_name when anonymity_level or names change
create or replace function sync_public_name()
returns trigger language plpgsql as $$
begin
  new.public_name =
    case new.anonymity_level
      when 'L3' then coalesce(new.display_name, 'Citizen')
      when 'L2' then coalesce(new.pseudonym, 'Anonymous Citizen')
      else 'Anonymous Citizen'
    end;
  return new;
end;
$$;

create trigger trg_sync_public_name
  before insert or update of anonymity_level, display_name, pseudonym
  on users
  for each row execute function sync_public_name();

-- ─────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS)
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable RLS on all tables
alter table users             enable row level security;
alter table pii_access_log    enable row level security;
alter table regions           enable row level security;
alter table constituencies    enable row level security;
alter table districts         enable row level security;
alter table electoral_areas   enable row level security;
alter table officials         enable row level security;
alter table reports           enable row level security;
alter table posts             enable row level security;
alter table moderation_queue  enable row level security;

-- ── Governance: read-only for everyone ───────────────────────────────────────
create policy "public_read_regions"        on regions           for select using (true);
create policy "public_read_constituencies" on constituencies    for select using (true);
create policy "public_read_districts"      on districts         for select using (true);
create policy "public_read_electoral"      on electoral_areas   for select using (true);
create policy "public_read_officials"      on officials         for select using (true);

-- ── Users: read own row only ──────────────────────────────────────────────────
create policy "users_read_own"
  on users for select
  using (auth.uid() = id);

create policy "users_update_own"
  on users for update
  using (auth.uid() = id)
  with check (
    -- Users cannot promote their own role
    role = (select role from users where id = auth.uid())
  );

-- ── PII audit log: superadmin insert only ────────────────────────────────────
-- Phone numbers live only in auth.users (Supabase-managed).
-- This log records when superadmins access auth data, for accountability.
create policy "pii_log_insert_superadmin"
  on pii_access_log for insert
  with check (
    exists (
      select 1 from users
      where id = auth.uid() and role = 'superadmin'
    )
  );

-- ── Reports: approved ones are public ────────────────────────────────────────
create policy "reports_public_read"
  on reports for select
  using (status in ('published', 'in_progress', 'resolved'));

create policy "reports_owner_read"
  on reports for select
  using (auth.uid() = user_id);

create policy "reports_insert_authenticated"
  on reports for insert
  with check (auth.uid() = user_id and auth.uid() is not null);

-- ── Posts: approved ones are public ──────────────────────────────────────────
create policy "posts_public_read"
  on posts for select
  using (status = 'published');

create policy "posts_owner_read"
  on posts for select
  using (auth.uid() = user_id);

create policy "posts_insert_authenticated"
  on posts for insert
  with check (auth.uid() = user_id and auth.uid() is not null);

-- ── Moderation: admin/superadmin only ────────────────────────────────────────
create policy "moderation_admin_only"
  on moderation_queue for all
  using (
    exists (
      select 1 from users
      where id = auth.uid() and role in ('admin', 'superadmin')
    )
  );
