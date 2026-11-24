-- =============================================================================
-- 11 · Row-level security (docs/03 §5) — the database's "second lock"
-- Every table has RLS ON. Anything not explicitly allowed here is denied.
-- Pattern: (select private.fn()) is evaluated once per query, not once per row.
-- =============================================================================

do $$
declare t text;
begin
  foreach t in array array[
    'clinics', 'branches', 'clinic_settings', 'clinic_hours', 'clinic_holidays', 'number_sequences',
    'staff_profiles', 'staff_permissions',
    'dentists', 'assistant_dentists', 'chairs', 'dentist_chairs', 'services', 'dentist_shifts', 'schedule_blocks',
    'patients', 'patient_guardians', 'patient_medical_info',
    'appointments', 'appointment_status_history', 'clinical_notes',
    'bills', 'bill_lines', 'bill_discounts', 'payments', 'refunds',
    'notification_outbox', 'staff_alerts', 'staff_alert_reads',
    'audit_logs'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Organisation: public facts are readable by anyone; only Admin changes them
-- ---------------------------------------------------------------------------
create policy clinics_read  on public.clinics  for select to anon, authenticated using (true);
create policy clinics_admin on public.clinics  for update to authenticated
  using ((select private.staff_role()) = 'admin') with check ((select private.staff_role()) = 'admin');

create policy branches_read  on public.branches for select to anon, authenticated using (is_active);
create policy branches_admin on public.branches for update to authenticated
  using ((select private.staff_role()) = 'admin') with check ((select private.staff_role()) = 'admin');

create policy settings_read  on public.clinic_settings for select to authenticated
  using ((select private.staff_role()) is not null);
create policy settings_admin on public.clinic_settings for update to authenticated
  using ((select private.staff_role()) = 'admin') with check ((select private.staff_role()) = 'admin');

create policy clinic_hours_read  on public.clinic_hours for select to anon, authenticated using (true);
create policy clinic_hours_admin on public.clinic_hours for all to authenticated
  using ((select private.staff_role()) = 'admin') with check ((select private.staff_role()) = 'admin');

create policy holidays_read  on public.clinic_holidays for select to anon, authenticated using (true);
create policy holidays_admin on public.clinic_holidays for all to authenticated
  using ((select private.staff_role()) = 'admin') with check ((select private.staff_role()) = 'admin');

-- number_sequences: no policies — only private.next_number() touches it.

-- ---------------------------------------------------------------------------
-- Staff
-- ---------------------------------------------------------------------------
create policy staff_read on public.staff_profiles for select to authenticated
  using ((select private.staff_role()) is not null or id = (select auth.uid()));
create policy staff_admin_insert on public.staff_profiles for insert to authenticated
  with check ((select private.staff_role()) = 'admin');
create policy staff_admin_update on public.staff_profiles for update to authenticated
  using ((select private.staff_role()) = 'admin') with check ((select private.staff_role()) = 'admin');

create policy staff_permissions_read on public.staff_permissions for select to authenticated
  using ((select private.staff_role()) = 'admin' or staff_id = (select auth.uid()));
create policy staff_permissions_admin on public.staff_permissions for all to authenticated
  using ((select private.staff_role()) = 'admin') with check ((select private.staff_role()) = 'admin');

-- ---------------------------------------------------------------------------
-- Resources & scheduling
-- ---------------------------------------------------------------------------
create policy dentists_read_public on public.dentists for select to anon using (is_active);
create policy dentists_read on public.dentists for select to authenticated
  using (is_active or (select private.staff_role()) is not null);
create policy dentists_admin_insert on public.dentists for insert to authenticated
  with check ((select private.staff_role()) = 'admin');
create policy dentists_admin_update on public.dentists for update to authenticated
  using ((select private.staff_role()) = 'admin') with check ((select private.staff_role()) = 'admin');

create policy assistant_dentists_read on public.assistant_dentists for select to authenticated
  using ((select private.staff_role()) is not null);
create policy assistant_dentists_admin on public.assistant_dentists for all to authenticated
  using ((select private.staff_role()) = 'admin') with check ((select private.staff_role()) = 'admin');

create policy chairs_read on public.chairs for select to authenticated
  using ((select private.staff_role()) is not null);
create policy chairs_admin_insert on public.chairs for insert to authenticated
  with check ((select private.staff_role()) = 'admin');
create policy chairs_admin_update on public.chairs for update to authenticated
  using ((select private.staff_role()) = 'admin') with check ((select private.staff_role()) = 'admin');

create policy dentist_chairs_read on public.dentist_chairs for select to authenticated
  using ((select private.staff_role()) is not null);
create policy dentist_chairs_admin on public.dentist_chairs for all to authenticated
  using ((select private.staff_role()) = 'admin') with check ((select private.staff_role()) = 'admin');

create policy services_read_public on public.services for select to anon using (is_active);
create policy services_read on public.services for select to authenticated
  using (is_active or (select private.staff_role()) is not null);
create policy services_admin_insert on public.services for insert to authenticated
  with check ((select private.staff_role()) = 'admin');
create policy services_admin_update on public.services for update to authenticated
  using ((select private.staff_role()) = 'admin') with check ((select private.staff_role()) = 'admin');

-- Working hours are not sensitive and are needed for public availability
create policy dentist_shifts_read on public.dentist_shifts for select to anon, authenticated using (true);
create policy dentist_shifts_admin on public.dentist_shifts for all to authenticated
  using ((select private.staff_role()) = 'admin') with check ((select private.staff_role()) = 'admin');

create policy schedule_blocks_read on public.schedule_blocks for select to authenticated
  using (
    (select private.staff_role()) in ('admin', 'receptionist')
    or dentist_id = (select private.my_dentist_id())
    or dentist_id in (select private.my_linked_dentist_ids())
  );
create policy schedule_blocks_write on public.schedule_blocks for all to authenticated
  using ((select private.staff_role()) in ('admin', 'receptionist'))
  with check ((select private.staff_role()) in ('admin', 'receptionist'));

-- ---------------------------------------------------------------------------
-- Patients
-- ---------------------------------------------------------------------------
create policy patients_read on public.patients for select to authenticated
  using (private.can_see_patient(id));
create policy patients_insert on public.patients for insert to authenticated
  with check (
    (select private.staff_role()) in ('admin', 'receptionist')
    -- a logged-in patient may register themselves or add a dependent (API enforces the details)
    or ((select private.staff_role()) is null and (select auth.uid()) is not null)
  );
create policy patients_update on public.patients for update to authenticated
  using (
    (select private.staff_role()) in ('admin', 'receptionist')
    or ((select private.staff_role()) is null and id in (select private.my_patient_ids()))
  )
  with check (
    (select private.staff_role()) in ('admin', 'receptionist')
    or ((select private.staff_role()) is null and id in (select private.my_patient_ids()))
  );

create policy patient_guardians_read on public.patient_guardians for select to authenticated
  using (private.can_see_patient(guardian_patient_id) or private.can_see_patient(dependent_patient_id));
create policy patient_guardians_insert on public.patient_guardians for insert to authenticated
  with check (
    (select private.staff_role()) in ('admin', 'receptionist')
    or ((select private.staff_role()) is null
        and guardian_patient_id in (select id from public.patients where auth_user_id = (select auth.uid())))
  );
create policy patient_guardians_delete on public.patient_guardians for delete to authenticated
  using ((select private.staff_role()) in ('admin', 'receptionist'));

-- patient_medical_info: NO policies → no direct access at all.
-- Use get_patient_medical() / save_patient_medical().

-- ---------------------------------------------------------------------------
-- Appointments
-- ---------------------------------------------------------------------------
create policy appointments_read on public.appointments for select to authenticated
  using (
    (select private.staff_role()) in ('admin', 'receptionist')
    or dentist_id = (select private.my_dentist_id())
    or dentist_id in (select private.my_linked_dentist_ids())
    or ((select private.staff_role()) is null
        and (patient_id in (select private.my_patient_ids())
             or booked_by_patient_id in (select private.my_patient_ids())))
  );

create policy appointments_insert on public.appointments for insert to authenticated
  with check (
    (select private.staff_role()) in ('admin', 'receptionist')
    -- dentists create follow-ups for themselves (APT-22)
    or ((select private.staff_role()) = 'dentist' and dentist_id = (select private.my_dentist_id())
        and not is_override)
    -- patients book online for themselves / dependents (APT-07)
    or ((select private.staff_role()) is null
        and channel = 'online' and not is_override
        and patient_id in (select private.my_patient_ids())
        and booked_by_patient_id in (select private.my_patient_ids()))
  );

-- Only Admin may create a double-booking override (APT-09)
create policy appointments_override_admin_only on public.appointments as restrictive for insert to authenticated
  with check (not is_override or (select private.staff_role()) = 'admin');

create policy appointments_update on public.appointments for update to authenticated
  using (
    (select private.staff_role()) in ('admin', 'receptionist')
    or dentist_id = (select private.my_dentist_id())
    or dentist_id in (select private.my_linked_dentist_ids())
    or ((select private.staff_role()) is null and patient_id in (select private.my_patient_ids()))
  )
  with check (
    (select private.staff_role()) in ('admin', 'receptionist')
    or dentist_id = (select private.my_dentist_id())
    or dentist_id in (select private.my_linked_dentist_ids())
    or ((select private.staff_role()) is null and patient_id in (select private.my_patient_ids()))
  );
create policy appointments_update_override_admin_only on public.appointments as restrictive for update to authenticated
  using (true)
  with check (not is_override or (select private.staff_role()) = 'admin');

-- Visible whenever the appointment itself is visible (appointments RLS applies inside)
create policy status_history_read on public.appointment_status_history for select to authenticated
  using (exists (select 1 from public.appointments a where a.id = appointment_id));

create policy clinical_notes_read on public.clinical_notes for select to authenticated
  using (
    (select private.staff_role()) = 'admin'
    or ((select private.staff_role()) = 'dentist' and private.can_see_patient(patient_id))
  );
create policy clinical_notes_insert on public.clinical_notes for insert to authenticated
  with check (
    (select private.staff_role()) = 'dentist'
    and dentist_id = (select private.my_dentist_id())
    and created_by = (select auth.uid())
    and exists (select 1 from public.appointments a
                 where a.id = appointment_id and a.patient_id = clinical_notes.patient_id
                   and a.dentist_id = clinical_notes.dentist_id)
  );
-- Author only, within the edit window (Q-22); afterwards add an addendum instead
create policy clinical_notes_update on public.clinical_notes for update to authenticated
  using (created_by = (select auth.uid())
         and created_at > now() - make_interval(hours => private.note_edit_hours(appointment_id)))
  with check (created_by = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Billing: front desk only; approvals are Admin-only
-- ---------------------------------------------------------------------------
create policy bills_front on public.bills for select to authenticated
  using ((select private.staff_role()) in ('admin', 'receptionist'));
create policy bills_front_insert on public.bills for insert to authenticated
  with check ((select private.staff_role()) in ('admin', 'receptionist'));
create policy bills_admin_update on public.bills for update to authenticated
  using ((select private.staff_role()) = 'admin') with check ((select private.staff_role()) = 'admin');

create policy bill_lines_read on public.bill_lines for select to authenticated
  using ((select private.staff_role()) in ('admin', 'receptionist'));
create policy bill_lines_write on public.bill_lines for all to authenticated
  using ((select private.staff_role()) in ('admin', 'receptionist'))
  with check ((select private.staff_role()) in ('admin', 'receptionist'));
-- Dentists may add the services they performed to their own appointment's bill
create policy bill_lines_dentist_insert on public.bill_lines for insert to authenticated
  with check (
    (select private.staff_role()) = 'dentist'
    and exists (select 1 from public.bills b join public.appointments a on a.id = b.appointment_id
                 where b.id = bill_id and a.dentist_id = (select private.my_dentist_id()))
  );

create policy discounts_read on public.bill_discounts for select to authenticated
  using ((select private.staff_role()) in ('admin', 'receptionist'));
create policy discounts_insert on public.bill_discounts for insert to authenticated
  with check (
    (select private.staff_role()) = 'admin'
    or ((select private.staff_role()) = 'receptionist'
        and (status = 'pending'
             or (status = 'approved' and private.discount_within_limit(bill_id, discount_type, value))))
  );
create policy discounts_admin_update on public.bill_discounts for update to authenticated
  using ((select private.staff_role()) = 'admin' or private.has_perm('discount.approve'))
  with check ((select private.staff_role()) = 'admin' or private.has_perm('discount.approve'));

create policy payments_read on public.payments for select to authenticated
  using ((select private.staff_role()) in ('admin', 'receptionist'));
create policy payments_insert on public.payments for insert to authenticated
  with check ((select private.staff_role()) in ('admin', 'receptionist') and not is_voided);
create policy payments_void_admin on public.payments for update to authenticated
  using ((select private.staff_role()) = 'admin') with check ((select private.staff_role()) = 'admin');

create policy refunds_read on public.refunds for select to authenticated
  using ((select private.staff_role()) in ('admin', 'receptionist'));
create policy refunds_insert on public.refunds for insert to authenticated
  with check (
    (select private.staff_role()) = 'admin'
    or ((select private.staff_role()) = 'receptionist' and status = 'requested')
  );
create policy refunds_admin_update on public.refunds for update to authenticated
  using ((select private.staff_role()) = 'admin' or private.has_perm('refund.approve'))
  with check ((select private.staff_role()) = 'admin' or private.has_perm('refund.approve'));

-- ---------------------------------------------------------------------------
-- Notifications & alerts
-- ---------------------------------------------------------------------------
create policy outbox_admin_read on public.notification_outbox for select to authenticated
  using ((select private.staff_role()) = 'admin');

create policy staff_alerts_read on public.staff_alerts for select to authenticated
  using ((select private.staff_role()) = 'admin'
         or (select private.staff_role()) = target_role);

create policy staff_alert_reads_own on public.staff_alert_reads for all to authenticated
  using (staff_id = (select auth.uid())) with check (staff_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Audit: Admin reads; nobody writes directly (triggers do)
-- ---------------------------------------------------------------------------
create policy audit_admin_read on public.audit_logs for select to authenticated
  using ((select private.staff_role()) = 'admin');
