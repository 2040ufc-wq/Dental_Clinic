-- =============================================================================
-- 04 · Staff & access (B1–B2)
-- Passwords, 2FA and sessions live in Supabase Auth (auth.users); this table adds
-- the clinic-specific profile and role.
-- =============================================================================

create table public.staff_profiles (
  id               uuid primary key references auth.users (id) on delete cascade,
  branch_id        uuid not null references public.branches (id),
  full_name_ar     text not null check (char_length(full_name_ar) between 2 and 150),
  full_name_en     text not null check (char_length(full_name_en) between 2 and 150),
  email            text not null,
  phone            text check (phone ~ '^\+[0-9]{8,15}$'),
  role             text not null check (role in ('admin', 'receptionist', 'dentist', 'assistant')),
  preferred_locale text not null default 'ar' check (preferred_locale in ('ar', 'en')),
  is_active        boolean not null default true,
  last_login_at    timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  created_by       uuid default auth.uid(),
  updated_by       uuid
);
create unique index staff_profiles_email_uq on public.staff_profiles (lower(email));
create index staff_profiles_branch_role_idx on public.staff_profiles (branch_id, role);

-- Extra switches on top of the role (ADM-03)
create table public.staff_permissions (
  staff_id   uuid not null references public.staff_profiles (id) on delete cascade,
  permission text not null check (permission in
               ('medical.view', 'discount.approve', 'refund.approve', 'reports.financial', 'schedule.block')),
  granted_by uuid references public.staff_profiles (id),
  granted_at timestamptz not null default now(),
  primary key (staff_id, permission)
);

create trigger staff_profiles_touch before update on public.staff_profiles
  for each row execute function private.touch_row();

create trigger staff_profiles_audit after insert or update on public.staff_profiles
  for each row execute function private.audit_row('staff');
create trigger staff_permissions_audit after insert or delete on public.staff_permissions
  for each row execute function private.audit_row('staff_permission');
