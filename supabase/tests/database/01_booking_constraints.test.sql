-- Core guarantee tests: no double-booking (APT-08), overrides (APT-09), numbering.
-- Run with: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(10);

-- Fixed demo records from seed.sql (d…01 = Dr. Sara, c…01 = Chair 1).
-- A far-future Sunday avoids clashing with seed appointments.

create temp table t_patient as select id from public.patients order by file_no limit 1;

-- helper to insert an appointment quickly
create function pg_temp.book(p_dentist uuid, p_chair uuid, p_start text, p_end text,
                             p_override boolean default false, p_reason text default null)
returns uuid language sql as $$
  insert into public.appointments
    (branch_id, patient_id, booked_by_staff_id, channel, dentist_id, chair_id, service_id,
     service_name_ar, service_name_en, duration_minutes, price, starts_at, ends_at, is_override, override_reason)
  values
    ('b1000000-0000-4000-8000-000000000001', (select id from t_patient), 'a0000000-0000-4000-8000-000000000003',
     'phone', p_dentist, p_chair, 'e5000000-0000-4000-8000-000000000001', 'استشارة', 'Consultation', 30, 150,
     p_start::timestamptz, p_end::timestamptz, p_override, p_reason)
  returning id
$$;

create temp table t_first as
  select pg_temp.book('d0000000-0000-4000-8000-000000000001', 'c2000000-0000-4000-8000-000000000001',
                      '2030-01-06 10:00+03', '2030-01-06 10:30+03') as id;

select matches(
  (select reference_no from public.appointments where id = (select id from t_first)),
  '^A-[0-9]{6}$', 'reference number is generated (A-000123)');

select throws_ok(
  $$ select pg_temp.book('d0000000-0000-4000-8000-000000000001', 'c2000000-0000-4000-8000-000000000002',
                         '2030-01-06 10:15+03', '2030-01-06 10:45+03') $$,
  '23P01', null, 'same dentist, overlapping time → rejected');

select throws_ok(
  $$ select pg_temp.book('d0000000-0000-4000-8000-000000000002', 'c2000000-0000-4000-8000-000000000001',
                         '2030-01-06 10:15+03', '2030-01-06 10:45+03') $$,
  '23P01', null, 'same chair, overlapping time → rejected');

select lives_ok(
  $$ select pg_temp.book('d0000000-0000-4000-8000-000000000001', 'c2000000-0000-4000-8000-000000000001',
                         '2030-01-06 10:30+03', '2030-01-06 11:00+03') $$,
  'back-to-back appointment (10:30 right after 10:30 end) → allowed');

select lives_ok(
  $$ select pg_temp.book('d0000000-0000-4000-8000-000000000002', 'c2000000-0000-4000-8000-000000000002',
                         '2030-01-06 10:00+03', '2030-01-06 10:30+03') $$,
  'different dentist and chair at the same time → allowed');

update public.appointments set status = 'cancelled', cancel_reason = 'test' where id = (select id from t_first);

select lives_ok(
  $$ select pg_temp.book('d0000000-0000-4000-8000-000000000001', 'c2000000-0000-4000-8000-000000000001',
                         '2030-01-06 10:00+03', '2030-01-06 10:30+03') $$,
  'cancelled appointment frees its time');

select throws_ok(
  $$ select pg_temp.book('d0000000-0000-4000-8000-000000000001', 'c2000000-0000-4000-8000-000000000001',
                         '2030-01-06 10:00+03', '2030-01-06 10:30+03', true, null) $$,
  '23514', null, 'override without a reason → rejected');

select lives_ok(
  $$ select pg_temp.book('d0000000-0000-4000-8000-000000000001', 'c2000000-0000-4000-8000-000000000001',
                         '2030-01-06 10:00+03', '2030-01-06 10:30+03', true, 'Urgent swelling') $$,
  'admin override with a reason → allowed');

select is(
  (select count(*)::int from public.appointment_status_history where appointment_id = (select id from t_first)),
  2, 'status history records booked → cancelled');

select ok(
  exists (select 1 from public.audit_logs
           where entity_id = (select id from t_first) and action = 'appointment.status_change'),
  'status change is written to the audit log');

select * from finish();
rollback;
