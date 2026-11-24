-- =============================================================================
-- 10 · Who-is-asking helpers + the only doors to restricted data
-- All helpers read auth.uid() (the logged-in user). SECURITY DEFINER lets them look
-- up roles without being blocked by the row rules they are used in.
-- =============================================================================

-- Role of the logged-in staff member (null for patients, anonymous or inactive staff)
create or replace function private.staff_role()
returns text language sql stable security definer set search_path = '' as $$
  select role from public.staff_profiles where id = auth.uid() and is_active
$$;

create or replace function private.has_perm(p_permission text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.staff_permissions sp
      join public.staff_profiles s on s.id = sp.staff_id and s.is_active
     where sp.staff_id = auth.uid() and sp.permission = p_permission)
$$;

-- Dentist profile of the logged-in dentist
create or replace function private.my_dentist_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select d.id from public.dentists d
    join public.staff_profiles s on s.id = d.staff_id and s.is_active
   where d.staff_id = auth.uid()
$$;

-- Dentists the logged-in assistant works with
create or replace function private.my_linked_dentist_ids()
returns setof uuid language sql stable security definer set search_path = '' as $$
  select ad.dentist_id from public.assistant_dentists ad
    join public.staff_profiles s on s.id = ad.assistant_id and s.is_active
   where ad.assistant_id = auth.uid()
$$;

-- Patient records a logged-in patient may act for: themselves + their dependents
create or replace function private.my_patient_ids()
returns setof uuid language sql stable security definer set search_path = '' as $$
  with me as (select id from public.patients where auth_user_id = auth.uid())
  select id from me
  union
  select g.dependent_patient_id from public.patient_guardians g where g.guardian_patient_id in (select id from me)
$$;

-- Can the logged-in user see this patient at all? (docs/03 §5)
create or replace function private.can_see_patient(p_patient_id uuid)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare v_role text := private.staff_role();
begin
  if v_role in ('admin', 'receptionist') then
    return true;
  elsif v_role = 'dentist' then
    return exists (select 1 from public.appointments
                    where patient_id = p_patient_id and dentist_id = private.my_dentist_id());
  elsif v_role = 'assistant' then
    return exists (select 1 from public.appointments
                    where patient_id = p_patient_id
                      and dentist_id in (select private.my_linked_dentist_ids()));
  elsif v_role is null and auth.uid() is not null then
    return p_patient_id in (select private.my_patient_ids());
  end if;
  return false;
end;
$$;

-- Medical info: Admin, the patient's dentists, receptionists with 'medical.view' (Q-09, Q-11 defaults)
create or replace function private.can_view_medical(p_patient_id uuid)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare v_role text := private.staff_role();
begin
  return v_role = 'admin'
      or (v_role = 'dentist' and private.can_see_patient(p_patient_id))
      or (v_role = 'receptionist' and private.has_perm('medical.view'));
end;
$$;

create or replace function private.can_edit_medical(p_patient_id uuid)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare v_role text := private.staff_role();
begin
  return v_role = 'admin' or (v_role = 'dentist' and private.can_see_patient(p_patient_id));
end;
$$;

-- Hours a dentist may still edit their own clinical note (Q-22 default 24)
create or replace function private.note_edit_hours(p_appointment_id uuid)
returns int language sql stable security definer set search_path = '' as $$
  select coalesce(cs.clinical_note_edit_hours, 24)
    from public.appointments a
    left join public.clinic_settings cs on cs.branch_id = a.branch_id
   where a.id = p_appointment_id
$$;

-- Receptionist discount limit check (BIL-02) — used by the discounts row rule
create or replace function private.discount_within_limit(p_bill_id uuid, p_type text, p_value numeric)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare
  v_limit    numeric;
  v_subtotal numeric;
begin
  select cs.receptionist_max_discount_pct into v_limit
    from public.bills b join public.clinic_settings cs on cs.branch_id = b.branch_id
   where b.id = p_bill_id;
  if p_type = 'percent' then
    return p_value <= coalesce(v_limit, 0);
  end if;
  select coalesce(sum(line_total), 0) into v_subtotal from public.bill_lines where bill_id = p_bill_id;
  return p_value <= round(v_subtotal * coalesce(v_limit, 0) / 100, 2);
end;
$$;

-- =============================================================================
-- Public doors (called by the server on behalf of the user)
-- =============================================================================

-- Read medical info — checks permission and records every view (AUD-01 "medical.view")
create or replace function public.get_patient_medical(p_patient_id uuid)
returns setof public.patient_medical_info
language plpgsql security definer set search_path = '' as $$
begin
  if not private.can_view_medical(p_patient_id) then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;
  perform private.write_audit('medical.view', 'patient', p_patient_id,
    (select branch_id from public.patients where id = p_patient_id), null, null, null);
  return query select * from public.patient_medical_info where patient_id = p_patient_id;
end;
$$;

-- Create or update medical info (Admin or the patient's dentist)
create or replace function public.save_patient_medical(
  p_patient_id          uuid,
  p_allergies           text,
  p_medical_conditions  text,
  p_current_medications text,
  p_medical_notes       text
)
returns setof public.patient_medical_info
language plpgsql security definer set search_path = '' as $$
begin
  if not private.can_edit_medical(p_patient_id) then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;
  return query
  insert into public.patient_medical_info
    (patient_id, allergies, medical_conditions, current_medications, medical_notes)
  values
    (p_patient_id, nullif(btrim(p_allergies), ''), nullif(btrim(p_medical_conditions), ''),
     nullif(btrim(p_current_medications), ''), nullif(btrim(p_medical_notes), ''))
  on conflict (patient_id) do update set
    allergies           = excluded.allergies,
    medical_conditions  = excluded.medical_conditions,
    current_medications = excluded.current_medications,
    medical_notes       = excluded.medical_notes
  returning *;
end;
$$;

-- Busy times only — NO patient data — for the public availability calculation
create or replace function public.busy_intervals(p_branch_id uuid, p_from timestamptz, p_to timestamptz)
returns table (dentist_id uuid, chair_id uuid, starts_at timestamptz, ends_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if p_to <= p_from or p_to - p_from > interval '100 days' then
    raise exception using errcode = '22023', message = 'VALIDATION_ERROR', detail = 'Range must be 1 to 100 days';
  end if;
  return query
    select a.dentist_id, a.chair_id, a.starts_at, a.ends_at
      from public.appointments a
     where a.branch_id = p_branch_id
       and a.status not in ('cancelled', 'no_show')
       and a.starts_at < p_to and a.ends_at > p_from;
end;
$$;

-- ---- Execute rights: nothing is callable unless granted here ----
revoke execute on all functions in schema private from public;
grant execute on all functions in schema private to authenticated, service_role;

revoke execute on function public.get_patient_medical(uuid)                         from public, anon;
revoke execute on function public.save_patient_medical(uuid, text, text, text, text) from public, anon;
revoke execute on function public.busy_intervals(uuid, timestamptz, timestamptz)     from public;
grant  execute on function public.get_patient_medical(uuid)                         to authenticated, service_role;
grant  execute on function public.save_patient_medical(uuid, text, text, text, text) to authenticated, service_role;
grant  execute on function public.busy_intervals(uuid, timestamptz, timestamptz)     to anon, authenticated, service_role;
