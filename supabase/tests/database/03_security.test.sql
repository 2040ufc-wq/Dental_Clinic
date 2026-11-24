-- Security tests: row-level security per role, restricted medical data, immutable audit log.
-- Technique: switch to the "authenticated" role with a fake login (JWT claims) per user,
-- capture results into a temp table, switch back, then assert.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(13);

create temp table results (label text primary key, value text);
grant all on results to authenticated, anon;

-- Demo users from seed.sql
--   a…03 receptionist · a…05 dentist (d…01) · a…06 dentist (d…02) · a…01 admin
-- A brand-new patient has no appointments, so no dentist may see them
insert into public.patients (branch_id, full_name, mobile, date_of_birth)
values ('b1000000-0000-4000-8000-000000000001', 'Test Isolated Patient', '+966599999999', '1990-01-01');

create temp table t_ids as
select
  (select a.patient_id from public.appointments a
    where a.dentist_id = 'd0000000-0000-4000-8000-000000000001'
      and exists (select 1 from public.patient_medical_info m where m.patient_id = a.patient_id)
    limit 1) as d1_patient,
  (select id from public.patients where mobile = '+966599999999') as other_patient;
grant select on t_ids to authenticated, anon;

create function pg_temp.login_as(p_user uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;

-- ---------- Receptionist ----------
select pg_temp.login_as('a0000000-0000-4000-8000-000000000003');
insert into results values
  ('recp_patients',       (select count(*) from public.patients)::text),
  ('recp_medical_direct', (select count(*) from public.patient_medical_info)::text),
  ('recp_notes',          (select count(*) from public.clinical_notes)::text),
  ('recp_audit',          (select count(*) from public.audit_logs)::text);
do $$
begin
  perform public.get_patient_medical((select d1_patient from t_ids));
  insert into results values ('recp_medical_fn', 'allowed');
exception when insufficient_privilege then
  insert into results values ('recp_medical_fn', 'denied');
end $$;
reset role;

-- ---------- Dentist 1 (Dr. Sara) ----------
select pg_temp.login_as('a0000000-0000-4000-8000-000000000005');
insert into results values
  ('d1_foreign_appts', (select count(*) from public.appointments
                         where dentist_id <> 'd0000000-0000-4000-8000-000000000001')::text),
  ('d1_sees_other_patient', (select count(*) from public.patients where id = (select other_patient from t_ids))::text),
  ('d1_medical_rows', (select count(*) from public.get_patient_medical((select d1_patient from t_ids)))::text),
  ('d1_bills', (select count(*) from public.bills)::text);
reset role;

-- ---------- Anonymous visitor ----------
set local role anon;
insert into results values
  ('anon_patients', (select count(*) from public.patients)::text),
  ('anon_services', (select count(*) from public.services)::text);
reset role;

select ok((select value::int from results where label = 'recp_patients') > 0, 'receptionist sees patients');
select is((select value from results where label = 'recp_medical_direct'), '0', 'receptionist cannot read medical table directly');
select is((select value from results where label = 'recp_medical_fn'), 'denied', 'receptionist without permission is denied medical info');
select is((select value from results where label = 'recp_notes'), '0', 'receptionist cannot see clinical notes');
select is((select value from results where label = 'recp_audit'), '0', 'receptionist cannot see the audit log');
select is((select value from results where label = 'd1_foreign_appts'), '0', 'dentist sees only own appointments');
select is((select value from results where label = 'd1_sees_other_patient'), '0', 'dentist cannot see patients of other dentists');
select is((select value from results where label = 'd1_medical_rows'), '1', 'dentist reads medical info of own patient');
select is((select value from results where label = 'd1_bills'), '0', 'dentist cannot see bills');
select ok(exists (select 1 from public.audit_logs where action = 'medical.view'
                   and actor_id = 'a0000000-0000-4000-8000-000000000005'),
          'medical info view by the dentist is audited');
select is((select value from results where label = 'anon_patients'), '0', 'anonymous visitors see no patients');
select ok((select value::int from results where label = 'anon_services') > 0, 'anonymous visitors see active services');

select throws_ok($$ update public.audit_logs set action = 'tampered' $$,
                 'P0001', 'AUDIT_LOG_IMMUTABLE', 'audit log cannot be modified');

select * from finish();
rollback;
