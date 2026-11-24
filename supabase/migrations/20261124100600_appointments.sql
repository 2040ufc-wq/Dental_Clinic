-- =============================================================================
-- 07 · Appointments & clinical (E1–E3)
-- Contains THE core guarantee: no double-booking of a dentist or a chair.
-- =============================================================================

create table public.appointments (
  id                    uuid primary key default gen_random_uuid(),
  branch_id             uuid not null references public.branches (id),
  reference_no          text not null unique,
  patient_id            uuid not null references public.patients (id),
  booked_by_patient_id  uuid references public.patients (id),
  booked_by_staff_id    uuid references public.staff_profiles (id),
  channel               text not null check (channel in ('online', 'phone', 'walk_in', 'emergency')),
  dentist_id            uuid not null references public.dentists (id),
  chair_id              uuid not null references public.chairs (id),
  service_id            uuid not null references public.services (id),
  -- snapshot of the service at booking time (APT-11)
  service_name_ar       text not null,
  service_name_en       text not null,
  duration_minutes      int not null check (duration_minutes between 5 and 480),
  price                 numeric(10,2) not null check (price >= 0),
  starts_at             timestamptz not null,
  ends_at               timestamptz not null,
  status                text not null default 'booked'
                        check (status in ('booked', 'checked_in', 'in_treatment', 'completed', 'cancelled', 'no_show')),
  -- reason for the latest status change (cancel, revert …); copied to status history
  status_reason         text check (char_length(status_reason) <= 500),
  is_override           boolean not null default false,
  override_reason       text check (char_length(override_reason) <= 500),
  frontdesk_note        text check (char_length(frontdesk_note) <= 500),
  cancel_reason         text check (char_length(cancel_reason) <= 500),
  cancelled_by_type     text check (cancelled_by_type in ('patient', 'staff')),
  checked_in_at         timestamptz,
  treatment_started_at  timestamptz,
  completed_at          timestamptz,
  cancelled_at          timestamptz,
  no_show_at            timestamptz,
  follow_up_of          uuid references public.appointments (id),
  version               int not null default 1,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  created_by            uuid default auth.uid(),
  updated_by            uuid,

  check (ends_at > starts_at),
  check (not is_override or override_reason is not null),
  check (booked_by_patient_id is not null or booked_by_staff_id is not null),

  -- ★ No double-booking (D1). '[)' = 10:00–10:30 and 10:30–11:00 do NOT clash.
  -- Cancelled / no-show appointments free their time. Admin overrides are excluded on purpose.
  constraint appointments_no_dentist_overlap exclude using gist (
    dentist_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status not in ('cancelled', 'no_show') and not is_override),
  constraint appointments_no_chair_overlap exclude using gist (
    chair_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status not in ('cancelled', 'no_show') and not is_override)
);
create index appointments_dentist_start_idx on public.appointments (dentist_id, starts_at);
create index appointments_chair_start_idx   on public.appointments (chair_id, starts_at);
create index appointments_patient_start_idx on public.appointments (patient_id, starts_at desc);
create index appointments_branch_start_idx  on public.appointments (branch_id, starts_at);
create index appointments_status_start_idx  on public.appointments (status, starts_at);
create index appointments_booked_by_idx     on public.appointments (booked_by_patient_id);

create table public.appointment_status_history (
  id                    bigint generated always as identity primary key,
  appointment_id        uuid not null references public.appointments (id),
  from_status           text,
  to_status             text not null,
  reason                text,
  changed_by_staff_id   uuid references public.staff_profiles (id),
  changed_by_patient_id uuid references public.patients (id),
  changed_at            timestamptz not null default now()
);
create index appointment_status_history_appt_idx on public.appointment_status_history (appointment_id, changed_at);

-- RESTRICTED clinical notes (PAT-10)
create table public.clinical_notes (
  id             uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments (id),
  patient_id     uuid not null references public.patients (id),
  dentist_id     uuid not null references public.dentists (id),
  note           text not null check (char_length(btrim(note)) between 1 and 10000),
  parent_note_id uuid references public.clinical_notes (id),
  created_by     uuid default auth.uid(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  updated_by     uuid
);
create index clinical_notes_patient_idx     on public.clinical_notes (patient_id, created_at desc);
create index clinical_notes_appointment_idx on public.clinical_notes (appointment_id);

-- ---- Before write: number, version, status timestamps ----
create or replace function private.appointments_before_write()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if new.reference_no is null then
      new.reference_no := private.next_number(new.branch_id, 'appointment');
    end if;
  else
    new.version    := old.version + 1;
    new.updated_at := now();
    new.updated_by := auth.uid();
  end if;

  if tg_op = 'INSERT' or new.status is distinct from old.status then
    case new.status
      when 'checked_in'   then new.checked_in_at        := coalesce(new.checked_in_at, now());
      when 'in_treatment' then new.treatment_started_at := coalesce(new.treatment_started_at, now());
      when 'completed'    then new.completed_at         := coalesce(new.completed_at, now());
      when 'cancelled'    then new.cancelled_at         := coalesce(new.cancelled_at, now());
      when 'no_show'      then new.no_show_at           := coalesce(new.no_show_at, now());
      else null;
    end case;
  end if;
  return new;
end;
$$;
create trigger appointments_before_write before insert or update on public.appointments
  for each row execute function private.appointments_before_write();

-- ---- After write: status history + patient no-show counter ----
create or replace function private.appointments_after_write()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_uid     uuid := auth.uid();
  v_staff   uuid;
  v_patient uuid;
begin
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then
    return null;
  end if;

  select id into v_staff from public.staff_profiles where id = v_uid;
  if v_staff is null then
    select id into v_patient from public.patients where auth_user_id = v_uid;
  end if;

  insert into public.appointment_status_history
    (appointment_id, from_status, to_status, reason, changed_by_staff_id, changed_by_patient_id)
  values
    (new.id, case when tg_op = 'UPDATE' then old.status end, new.status,
     coalesce(new.status_reason, case when new.status = 'cancelled' then new.cancel_reason end),
     v_staff, v_patient);

  if new.status = 'no_show' and (tg_op = 'INSERT' or old.status <> 'no_show') then
    update public.patients set no_show_count = no_show_count + 1 where id = new.patient_id;
  elsif tg_op = 'UPDATE' and old.status = 'no_show' and new.status <> 'no_show' then
    update public.patients set no_show_count = greatest(no_show_count - 1, 0) where id = new.patient_id;
  end if;
  return null;
end;
$$;
create trigger appointments_after_write after insert or update on public.appointments
  for each row execute function private.appointments_after_write();

create trigger clinical_notes_touch before update on public.clinical_notes
  for each row execute function private.touch_row();

create trigger appointments_audit after insert or update on public.appointments
  for each row execute function private.audit_row('appointment');
create trigger clinical_notes_audit after insert or update on public.clinical_notes
  for each row execute function private.audit_row('clinical_note', 'redact');
