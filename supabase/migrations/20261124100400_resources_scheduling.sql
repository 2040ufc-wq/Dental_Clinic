-- =============================================================================
-- 05 · Resources & scheduling (C1–C7): dentists, chairs, services, shifts, blocks
-- =============================================================================

create table public.dentists (
  id                     uuid primary key default gen_random_uuid(),
  branch_id              uuid not null references public.branches (id),
  staff_id               uuid unique references public.staff_profiles (id),
  name_ar                text not null check (char_length(name_ar) between 2 and 150),
  name_en                text not null check (char_length(name_en) between 2 and 150),
  specialization_ar      text,
  specialization_en      text,
  bio_ar                 text check (char_length(bio_ar) <= 2000),
  bio_en                 text check (char_length(bio_en) <= 2000),
  photo_path             text,
  phone                  text check (phone ~ '^\+[0-9]{8,15}$'),
  email                  text,
  display_order          int not null default 0,
  accepts_online_booking boolean not null default true,
  is_active              boolean not null default true,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  created_by             uuid default auth.uid(),
  updated_by             uuid
);
create index dentists_branch_idx on public.dentists (branch_id, is_active, display_order);

create table public.assistant_dentists (
  assistant_id uuid not null references public.staff_profiles (id) on delete cascade,
  dentist_id   uuid not null references public.dentists (id) on delete cascade,
  primary key (assistant_id, dentist_id)
);
create index assistant_dentists_dentist_idx on public.assistant_dentists (dentist_id);

-- Only staff with role 'assistant' can be linked as an assistant
create or replace function private.check_assistant_role()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.staff_profiles where id = new.assistant_id and role = 'assistant') then
    perform private.raise_business_error('INVALID_ASSISTANT', 'Linked staff member must have role assistant');
  end if;
  return new;
end;
$$;
create trigger assistant_dentists_role_check before insert or update on public.assistant_dentists
  for each row execute function private.check_assistant_role();

create table public.chairs (
  id         uuid primary key default gen_random_uuid(),
  branch_id  uuid not null references public.branches (id),
  name_ar    text not null,
  name_en    text not null,
  notes      text,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_by uuid,
  unique (branch_id, name_en)
);

create table public.dentist_chairs (
  dentist_id   uuid not null references public.dentists (id) on delete cascade,
  chair_id     uuid not null references public.chairs (id) on delete cascade,
  is_preferred boolean not null default false,
  primary key (dentist_id, chair_id)
);
-- At most one preferred chair per dentist
create unique index dentist_chairs_one_preferred_uq on public.dentist_chairs (dentist_id) where is_preferred;
create index dentist_chairs_chair_idx on public.dentist_chairs (chair_id);

create table public.services (
  id                 uuid primary key default gen_random_uuid(),
  branch_id          uuid not null references public.branches (id),
  code               text not null check (code ~ '^[A-Z0-9_]{2,20}$'),
  name_ar            text not null,
  name_en            text not null,
  description_ar     text,
  description_en     text,
  duration_minutes   int not null check (duration_minutes between 5 and 480),
  price              numeric(10,2) not null check (price >= 0),
  color              text not null default '#0d7c8c' check (color ~ '^#[0-9a-fA-F]{6}$'),
  is_online_bookable boolean not null default true,
  is_active          boolean not null default true,
  display_order      int not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  created_by         uuid default auth.uid(),
  updated_by         uuid,
  unique (branch_id, code)
);

-- Weekly working hours; gaps between shifts are breaks (C6)
create table public.dentist_shifts (
  id         uuid primary key default gen_random_uuid(),
  dentist_id uuid not null references public.dentists (id) on delete cascade,
  weekday    smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time   time not null,
  valid_from date,
  valid_to   date,
  check (end_time > start_time),
  check (valid_to is null or valid_from is null or valid_to >= valid_from)
);
create index dentist_shifts_dentist_weekday_idx on public.dentist_shifts (dentist_id, weekday);

-- Leave, blocked time, reserved emergency time (C7)
create table public.schedule_blocks (
  id         uuid primary key default gen_random_uuid(),
  branch_id  uuid not null references public.branches (id),
  dentist_id uuid not null references public.dentists (id) on delete cascade,
  block_type text not null check (block_type in ('leave', 'block', 'emergency_reserve')),
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  reason     text check (char_length(reason) <= 500),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid,
  check (ends_at > starts_at)
);
create index schedule_blocks_overlap_idx on public.schedule_blocks
  using gist (dentist_id, tstzrange(starts_at, ends_at, '[)'));

-- ---- Triggers ----
create trigger dentists_touch        before update on public.dentists        for each row execute function private.touch_row();
create trigger chairs_touch          before update on public.chairs          for each row execute function private.touch_row();
create trigger services_touch        before update on public.services        for each row execute function private.touch_row();
create trigger schedule_blocks_touch before update on public.schedule_blocks for each row execute function private.touch_row();

create trigger dentists_audit        after insert or update on public.dentists for each row execute function private.audit_row('dentist');
create trigger chairs_audit          after insert or update on public.chairs   for each row execute function private.audit_row('chair');
create trigger services_audit        after insert or update on public.services for each row execute function private.audit_row('service');
create trigger dentist_shifts_audit  after insert or update or delete on public.dentist_shifts  for each row execute function private.audit_row('dentist_shift');
create trigger schedule_blocks_audit after insert or update or delete on public.schedule_blocks for each row execute function private.audit_row('schedule_block');
