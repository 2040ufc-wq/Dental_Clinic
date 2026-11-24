-- =============================================================================
-- 03 · Organisation (A1–A5) and document numbering (F6)
-- =============================================================================

create table public.clinics (
  id                  uuid primary key default gen_random_uuid(),
  name_ar             text not null,
  name_en             text not null,
  legal_name          text,
  vat_registration_no text check (vat_registration_no ~ '^[0-9]{15}$'),
  logo_path           text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  created_by          uuid default auth.uid(),
  updated_by          uuid
);

create table public.branches (
  id         uuid primary key default gen_random_uuid(),
  clinic_id  uuid not null references public.clinics (id),
  name_ar    text not null,
  name_en    text not null,
  address_ar text,
  address_en text,
  phone      text check (phone ~ '^\+[0-9]{8,15}$'),
  whatsapp   text check (whatsapp ~ '^\+[0-9]{8,15}$'),
  email      text,
  timezone   text not null default 'Asia/Riyadh',
  currency   text not null default 'SAR',
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_by uuid
);
create index branches_clinic_idx on public.branches (clinic_id);

-- Booking, billing and notification rules — one row per branch (A3)
create table public.clinic_settings (
  branch_id                       uuid primary key references public.branches (id),
  online_min_notice_minutes       int not null default 120 check (online_min_notice_minutes >= 0),
  online_max_advance_days         int not null default 90 check (online_max_advance_days between 1 and 365),
  online_change_cutoff_hours      int not null default 24 check (online_change_cutoff_hours >= 0),
  slot_interval_minutes           int not null default 15 check (slot_interval_minutes in (5, 10, 15, 20, 30)),
  buffer_minutes                  int not null default 0 check (buffer_minutes between 0 and 60),
  max_upcoming_online_per_patient int not null default 3 check (max_upcoming_online_per_patient >= 1),
  no_show_suggest_after_minutes   int not null default 15 check (no_show_suggest_after_minutes >= 0),
  vat_enabled                     boolean not null default true,
  vat_rate                        numeric(5,2) not null default 15.00 check (vat_rate between 0 and 100),
  prices_include_vat              boolean not null default false,
  receptionist_max_discount_pct   numeric(5,2) not null default 10.00 check (receptionist_max_discount_pct between 0 and 100),
  clinical_note_edit_hours        int not null default 24 check (clinical_note_edit_hours >= 0),
  staff_idle_timeout_minutes      int not null default 30 check (staff_idle_timeout_minutes between 5 and 480),
  reminder_24h_enabled            boolean not null default true,
  reminder_2h_enabled             boolean not null default true,
  default_channel                 text not null default 'whatsapp' check (default_channel in ('whatsapp', 'sms', 'email')),
  updated_at                      timestamptz not null default now(),
  updated_by                      uuid
);

-- Opening shifts per weekday; several rows per day = split shifts (A4)
create table public.clinic_hours (
  id         uuid primary key default gen_random_uuid(),
  branch_id  uuid not null references public.branches (id),
  weekday    smallint not null check (weekday between 0 and 6), -- 0 = Sunday
  start_time time not null,
  end_time   time not null,
  valid_from date,
  valid_to   date,
  check (end_time > start_time),
  check (valid_to is null or valid_from is null or valid_to >= valid_from)
);
create index clinic_hours_branch_weekday_idx on public.clinic_hours (branch_id, weekday);

create table public.clinic_holidays (
  id        uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id),
  date_from date not null,
  date_to   date not null,
  name_ar   text not null,
  name_en   text not null,
  check (date_to >= date_from)
);
create index clinic_holidays_range_idx on public.clinic_holidays (branch_id, date_from, date_to);

-- ---- Gap-free human-readable numbers (F6) ----
create table public.number_sequences (
  branch_id  uuid not null references public.branches (id),
  doc_type   text not null check (doc_type in ('patient', 'appointment', 'bill', 'receipt', 'refund')),
  prefix     text not null,
  next_value bigint not null default 1 check (next_value >= 1),
  primary key (branch_id, doc_type)
);

-- Locks the counter row, so two users can never get the same number, and a rolled-back
-- transaction gives its number back (no gaps).
create or replace function private.next_number(p_branch uuid, p_doc text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_prefix text;
  v_value  bigint;
begin
  insert into public.number_sequences (branch_id, doc_type, prefix)
  values (p_branch, p_doc,
          case p_doc when 'patient' then 'P-' when 'appointment' then 'A-' when 'bill' then 'B-'
                     when 'receipt' then 'R-' when 'refund' then 'RF-' end)
  on conflict (branch_id, doc_type) do nothing;

  update public.number_sequences
     set next_value = next_value + 1
   where branch_id = p_branch and doc_type = p_doc
  returning prefix, next_value - 1 into v_prefix, v_value;

  return v_prefix || lpad(v_value::text, 6, '0');
end;
$$;

-- ---- Triggers ----
create trigger clinics_touch  before update on public.clinics  for each row execute function private.touch_row();
create trigger branches_touch before update on public.branches for each row execute function private.touch_row();

create trigger clinic_settings_touch before update on public.clinic_settings
  for each row execute function private.touch_row();

create trigger clinics_audit         after insert or update on public.clinics         for each row execute function private.audit_row('clinic');
create trigger branches_audit        after insert or update on public.branches        for each row execute function private.audit_row('branch');
create trigger clinic_settings_audit after update             on public.clinic_settings for each row execute function private.audit_row('settings');
create trigger clinic_hours_audit    after insert or update or delete on public.clinic_hours    for each row execute function private.audit_row('clinic_hours');
create trigger clinic_holidays_audit after insert or update or delete on public.clinic_holidays for each row execute function private.audit_row('holiday');
