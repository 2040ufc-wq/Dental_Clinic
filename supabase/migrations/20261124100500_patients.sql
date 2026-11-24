-- =============================================================================
-- 06 · Patients (D1–D3): patients, family links, restricted medical info
-- =============================================================================

create table public.patients (
  id                       uuid primary key default gen_random_uuid(),
  branch_id                uuid not null references public.branches (id),
  file_no                  text not null unique,
  full_name                text not null check (char_length(btrim(full_name)) between 2 and 150),
  mobile                   text check (mobile ~ '^\+9665[0-9]{8}$'),
  date_of_birth            date not null check (date_of_birth >= date '1900-01-01'),
  gender                   text check (gender in ('male', 'female')),
  email                    text check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  national_id              text check (national_id ~ '^[12][0-9]{9}$'),
  emergency_contact_name   text check (char_length(emergency_contact_name) <= 150),
  emergency_contact_mobile text check (emergency_contact_mobile ~ '^\+[0-9]{8,15}$'),
  preferred_locale         text not null default 'ar' check (preferred_locale in ('ar', 'en')),
  auth_user_id             uuid unique references auth.users (id) on delete set null,
  privacy_consent_at       timestamptz,
  possible_duplicate_of    uuid references public.patients (id),
  duplicate_review_status  text not null default 'none'
                           check (duplicate_review_status in ('none', 'pending', 'not_duplicate')),
  no_show_count            int not null default 0 check (no_show_count >= 0),
  is_active                boolean not null default true,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  created_by               uuid default auth.uid(),
  updated_by               uuid
);
create index patients_mobile_dob_idx on public.patients (mobile, date_of_birth); -- duplicate check (PAT-04)
create index patients_mobile_idx     on public.patients (mobile);
create index patients_name_trgm_idx  on public.patients using gin (full_name extensions.gin_trgm_ops);
create index patients_duplicates_idx on public.patients (duplicate_review_status) where duplicate_review_status = 'pending';

-- Family links (PAT-05): "dependent" is the guardian's child / spouse / parent …
create table public.patient_guardians (
  guardian_patient_id  uuid not null references public.patients (id),
  dependent_patient_id uuid not null references public.patients (id),
  relationship         text not null check (relationship in ('child', 'spouse', 'parent', 'sibling', 'other')),
  created_at           timestamptz not null default now(),
  created_by           uuid default auth.uid(),
  primary key (guardian_patient_id, dependent_patient_id),
  check (guardian_patient_id <> dependent_patient_id)
);
create index patient_guardians_dependent_idx on public.patient_guardians (dependent_patient_id);

-- RESTRICTED (PAT-09). No direct table access for anyone:
-- read via get_patient_medical() (audited), write via save_patient_medical().
create table public.patient_medical_info (
  patient_id          uuid primary key references public.patients (id),
  allergies           text check (char_length(allergies) <= 2000),
  medical_conditions  text check (char_length(medical_conditions) <= 2000),
  current_medications text check (char_length(current_medications) <= 2000),
  medical_notes       text check (char_length(medical_notes) <= 4000),
  updated_at          timestamptz not null default now(),
  updated_by          uuid
);

-- ---- Numbering: P-000123 ----
create or replace function private.patients_before_insert()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.file_no is null then
    new.file_no := private.next_number(new.branch_id, 'patient');
  end if;
  new.full_name := btrim(new.full_name);
  return new;
end;
$$;
create trigger patients_number before insert on public.patients
  for each row execute function private.patients_before_insert();

-- ---- A patient without a mobile must be a dependent of someone (checked at commit) ----
-- security definer: must see the row even if the caller can't yet (new dependent)
create or replace function private.check_patient_contact()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_patient uuid;
begin
  if tg_table_name = 'patients' then
    v_patient := new.id;
  else
    v_patient := old.dependent_patient_id;
  end if;

  if exists (select 1 from public.patients p where p.id = v_patient and p.mobile is null)
     and not exists (select 1 from public.patient_guardians g where g.dependent_patient_id = v_patient) then
    perform private.raise_business_error('PATIENT_MOBILE_REQUIRED',
      'A patient without a mobile number must be linked to a guardian');
  end if;
  return null;
end;
$$;
create constraint trigger patients_contact_check
  after insert or update of mobile on public.patients
  deferrable initially deferred
  for each row execute function private.check_patient_contact();
create constraint trigger patient_guardians_contact_check
  after delete on public.patient_guardians
  deferrable initially deferred
  for each row execute function private.check_patient_contact();

-- ---- Bookkeeping & audit ----
create trigger patients_touch before update on public.patients
  for each row execute function private.touch_row();

create or replace function private.touch_medical()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;
create trigger patient_medical_info_touch before insert or update on public.patient_medical_info
  for each row execute function private.touch_medical();

create trigger patients_audit after insert or update on public.patients
  for each row execute function private.audit_row('patient');
create trigger patient_guardians_audit after insert or delete on public.patient_guardians
  for each row execute function private.audit_row('patient_family_link');
create trigger patient_medical_info_audit after insert or update on public.patient_medical_info
  for each row execute function private.audit_row('medical', 'redact');
