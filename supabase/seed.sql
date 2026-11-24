-- =============================================================================
-- SYNTHETIC DEMO DATA — fictional people only (requirement: no real patient data)
-- Loaded automatically by `supabase db reset`.
-- All staff passwords: Demo@1234   ·   docs/03 §6
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Staff logins (Supabase Auth)
-- ---------------------------------------------------------------------------
create function pg_temp.seed_user(p_id uuid, p_email text) returns void language sql as $$
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                          confirmation_token, recovery_token, email_change_token_new, email_change)
  values ('00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated', p_email,
          extensions.crypt('Demo@1234', extensions.gen_salt('bf')), now(),
          '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), p_id, p_id::text,
          jsonb_build_object('sub', p_id::text, 'email', p_email, 'email_verified', true),
          'email', now(), now(), now());
$$;

select pg_temp.seed_user('a0000000-0000-4000-8000-000000000001', 'admin@smile-clinic.test');
select pg_temp.seed_user('a0000000-0000-4000-8000-000000000002', 'newadmin@smile-clinic.test');
select pg_temp.seed_user('a0000000-0000-4000-8000-000000000003', 'reception@smile-clinic.test');
select pg_temp.seed_user('a0000000-0000-4000-8000-000000000004', 'reception2@smile-clinic.test');
select pg_temp.seed_user('a0000000-0000-4000-8000-000000000005', 'dentist@smile-clinic.test');
select pg_temp.seed_user('a0000000-0000-4000-8000-000000000006', 'dentist2@smile-clinic.test');
select pg_temp.seed_user('a0000000-0000-4000-8000-000000000007', 'dentist3@smile-clinic.test');
select pg_temp.seed_user('a0000000-0000-4000-8000-000000000008', 'assistant@smile-clinic.test');
select pg_temp.seed_user('a0000000-0000-4000-8000-000000000009', 'inactive@smile-clinic.test');

-- ---------------------------------------------------------------------------
-- Clinic, branch, settings, hours, holidays
-- ---------------------------------------------------------------------------
insert into public.clinics (id, name_ar, name_en, legal_name, vat_registration_no)
values ('c1000000-0000-4000-8000-000000000001', 'عيادة الابتسامة لطب الأسنان', 'Smile Dental Clinic',
        'Smile Dental Clinic (Demo)', '300000000000003');

insert into public.branches (id, clinic_id, name_ar, name_en, address_ar, address_en, phone, whatsapp, email)
values ('b1000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001',
        'الفرع الرئيسي', 'Main Branch', 'حي النموذج، الرياض', 'Demo District, Riyadh',
        '+966110000000', '+966500000000', 'info@smile-clinic.test');

insert into public.clinic_settings (branch_id) values ('b1000000-0000-4000-8000-000000000001');

-- Sun–Thu split shifts, Saturday evening, Friday closed (assumption A-01)
insert into public.clinic_hours (branch_id, weekday, start_time, end_time)
select 'b1000000-0000-4000-8000-000000000001'::uuid, d, s, e
  from generate_series(0, 4) d, (values ('09:00'::time, '13:00'::time), ('16:00', '22:00')) h(s, e)
union all
select 'b1000000-0000-4000-8000-000000000001', 6, '16:00', '22:00';

insert into public.clinic_holidays (branch_id, date_from, date_to, name_ar, name_en)
values ('b1000000-0000-4000-8000-000000000001', '2027-02-22', '2027-02-22', 'يوم التأسيس', 'Founding Day');

-- ---------------------------------------------------------------------------
-- Staff profiles
-- ---------------------------------------------------------------------------
insert into public.staff_profiles (id, branch_id, full_name_ar, full_name_en, email, role, is_active) values
  ('a0000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', 'نورة القحطاني',  'Noura Alqahtani',  'admin@smile-clinic.test',      'admin',        true),
  ('a0000000-0000-4000-8000-000000000002', 'b1000000-0000-4000-8000-000000000001', 'فهد العتيبي',    'Fahad Alotaibi',   'newadmin@smile-clinic.test',   'admin',        true),
  ('a0000000-0000-4000-8000-000000000003', 'b1000000-0000-4000-8000-000000000001', 'ريم الشهري',     'Reem Alshehri',    'reception@smile-clinic.test',  'receptionist', true),
  ('a0000000-0000-4000-8000-000000000004', 'b1000000-0000-4000-8000-000000000001', 'خالد الغامدي',   'Khalid Alghamdi',  'reception2@smile-clinic.test', 'receptionist', true),
  ('a0000000-0000-4000-8000-000000000005', 'b1000000-0000-4000-8000-000000000001', 'د. سارة الحربي', 'Dr. Sara Alharbi', 'dentist@smile-clinic.test',    'dentist',      true),
  ('a0000000-0000-4000-8000-000000000006', 'b1000000-0000-4000-8000-000000000001', 'د. عمر الزهراني','Dr. Omar Alzahrani','dentist2@smile-clinic.test',  'dentist',      true),
  ('a0000000-0000-4000-8000-000000000007', 'b1000000-0000-4000-8000-000000000001', 'د. هدى السبيعي', 'Dr. Huda Alsubaie','dentist3@smile-clinic.test',   'dentist',      true),
  ('a0000000-0000-4000-8000-000000000008', 'b1000000-0000-4000-8000-000000000001', 'منى الدوسري',    'Mona Aldosari',    'assistant@smile-clinic.test',  'assistant',    true),
  ('a0000000-0000-4000-8000-000000000009', 'b1000000-0000-4000-8000-000000000001', 'حساب موقوف',     'Inactive Account', 'inactive@smile-clinic.test',   'receptionist', false);

-- ---------------------------------------------------------------------------
-- Chairs, dentists, services, schedules
-- ---------------------------------------------------------------------------
insert into public.chairs (id, branch_id, name_ar, name_en) values
  ('c2000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', 'كرسي 1', 'Chair 1'),
  ('c2000000-0000-4000-8000-000000000002', 'b1000000-0000-4000-8000-000000000001', 'كرسي 2', 'Chair 2'),
  ('c2000000-0000-4000-8000-000000000003', 'b1000000-0000-4000-8000-000000000001', 'كرسي 3', 'Chair 3');

insert into public.dentists (id, branch_id, staff_id, name_ar, name_en, specialization_ar, specialization_en, display_order) values
  ('d0000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000005',
   'د. سارة الحربي', 'Dr. Sara Alharbi', 'طب الأسنان العام', 'General Dentistry', 1),
  ('d0000000-0000-4000-8000-000000000002', 'b1000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000006',
   'د. عمر الزهراني', 'Dr. Omar Alzahrani', 'علاج العصب', 'Endodontics', 2),
  ('d0000000-0000-4000-8000-000000000003', 'b1000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000007',
   'د. هدى السبيعي', 'Dr. Huda Alsubaie', 'طب أسنان الأطفال', 'Pediatric Dentistry', 3);

insert into public.dentist_chairs (dentist_id, chair_id, is_preferred) values
  ('d0000000-0000-4000-8000-000000000001', 'c2000000-0000-4000-8000-000000000001', true),
  ('d0000000-0000-4000-8000-000000000001', 'c2000000-0000-4000-8000-000000000003', false),
  ('d0000000-0000-4000-8000-000000000002', 'c2000000-0000-4000-8000-000000000002', true),
  ('d0000000-0000-4000-8000-000000000002', 'c2000000-0000-4000-8000-000000000003', false),
  ('d0000000-0000-4000-8000-000000000003', 'c2000000-0000-4000-8000-000000000003', true),
  ('d0000000-0000-4000-8000-000000000003', 'c2000000-0000-4000-8000-000000000001', false);

insert into public.assistant_dentists (assistant_id, dentist_id)
values ('a0000000-0000-4000-8000-000000000008', 'd0000000-0000-4000-8000-000000000001');

insert into public.services (id, branch_id, code, name_ar, name_en, duration_minutes, price, color, is_online_bookable, display_order) values
  ('e5000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', 'CONSULT',  'استشارة عامة', 'General Consultation', 30,  150, '#0d7c8c', true,  1),
  ('e5000000-0000-4000-8000-000000000002', 'b1000000-0000-4000-8000-000000000001', 'CLEAN',    'تنظيف الأسنان', 'Dental Cleaning',     45,  250, '#1d4ed8', true,  2),
  ('e5000000-0000-4000-8000-000000000003', 'b1000000-0000-4000-8000-000000000001', 'FILL',     'حشوة',          'Filling',             45,  350, '#6d28d9', true,  3),
  ('e5000000-0000-4000-8000-000000000004', 'b1000000-0000-4000-8000-000000000001', 'RCT',      'علاج العصب',    'Root Canal',          60, 1200, '#be185d', true,  4),
  ('e5000000-0000-4000-8000-000000000005', 'b1000000-0000-4000-8000-000000000001', 'EXTRACT',  'خلع سن',        'Tooth Extraction',    45,  400, '#b45309', true,  5),
  ('e5000000-0000-4000-8000-000000000006', 'b1000000-0000-4000-8000-000000000001', 'EMERG',    'زيارة طارئة',   'Emergency Visit',     30,  200, '#b91c1c', false, 6),
  ('e5000000-0000-4000-8000-000000000007', 'b1000000-0000-4000-8000-000000000001', 'FOLLOWUP', 'مراجعة',        'Follow-up',           20,  100, '#15803d', true,  7);

-- Weekly hours (0 = Sunday … 6 = Saturday)
insert into public.dentist_shifts (dentist_id, weekday, start_time, end_time)
select 'd0000000-0000-4000-8000-000000000001'::uuid, d, s, e
  from generate_series(0, 4) d, (values ('09:00'::time, '13:00'::time), ('16:00', '21:00')) h(s, e)
union all
select 'd0000000-0000-4000-8000-000000000002', d, '16:00', '22:00' from unnest(array[0, 1, 2, 3, 4, 6]) d
union all
select 'd0000000-0000-4000-8000-000000000003', d, '09:00', '13:00' from unnest(array[0, 2, 4]) d
union all
select 'd0000000-0000-4000-8000-000000000003', d, '16:00', '22:00' from unnest(array[1, 3]) d
union all
select 'd0000000-0000-4000-8000-000000000003', 6, '16:00', '20:00';

-- Dr. Huda on leave for two days next week; an emergency reserve for Dr. Sara tomorrow
insert into public.schedule_blocks (branch_id, dentist_id, block_type, starts_at, ends_at, reason, created_by) values
  ('b1000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000003', 'leave',
   ((current_date + 7)::timestamp) at time zone 'Asia/Riyadh', ((current_date + 9)::timestamp) at time zone 'Asia/Riyadh',
   'إجازة اعتيادية / Annual leave', 'a0000000-0000-4000-8000-000000000001'),
  ('b1000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'emergency_reserve',
   ((current_date + 1) + time '12:00') at time zone 'Asia/Riyadh', ((current_date + 1) + time '13:00') at time zone 'Asia/Riyadh',
   'وقت محجوز للطوارئ / Reserved for emergencies', 'a0000000-0000-4000-8000-000000000001');

-- ---------------------------------------------------------------------------
-- Patients (60 + families + one possible duplicate)
-- ---------------------------------------------------------------------------
do $$
declare
  male_ar   text[] := array['عبدالله','محمد','فهد','خالد','سلطان','تركي','ناصر','سعود','ماجد','بندر','فيصل','يوسف','عمر','أحمد','سامي'];
  female_ar text[] := array['نورة','سارة','ريم','هيا','لمى','منيرة','العنود','جواهر','دانة','رغد','أمل','مها','لطيفة','شهد','غادة'];
  family_ar text[] := array['المطيري','العتيبي','القحطاني','الشهري','الغامدي','الزهراني','الحربي','الدوسري','العنزي','الشمري','السبيعي','البقمي','الرشيدي','العمري','الجهني'];
  en_names  text[] := array['Layla Hassan','Ahmed Mansour','Sarah Williams','Omar Farouk','Fatima Khan','John Peterson','Aisha Rahman','Daniel Ortiz','Mariam Saleh','Ravi Kumar'];
  i int;
  v_name text;
  v_gender text;
  v_id uuid;
  v_guardian uuid;
  v_branch uuid := 'b1000000-0000-4000-8000-000000000001';
begin
  perform setseed(0.42);

  -- two patients that match the frontend mock logins
  insert into public.patients (branch_id, full_name, mobile, date_of_birth, gender, preferred_locale, created_at)
  values (v_branch, 'عبدالله المطيري', '+966501234567', '1988-03-14', 'male', 'ar', now() - interval '150 days'),
         (v_branch, 'Layla Hassan',    '+966551112233', '1993-09-02', 'female', 'en', now() - interval '120 days');

  for i in 1..58 loop
    if i % 6 = 0 then
      v_name := en_names[1 + (i / 6) % array_length(en_names, 1)] || ' ' || i;
      v_gender := case when i % 12 = 0 then 'male' else 'female' end;
    elsif i % 2 = 0 then
      v_name := female_ar[1 + i % 15] || ' ' || family_ar[1 + (i * 7) % 15];
      v_gender := 'female';
    else
      v_name := male_ar[1 + i % 15] || ' ' || family_ar[1 + (i * 5) % 15];
      v_gender := 'male';
    end if;

    insert into public.patients (branch_id, full_name, mobile, date_of_birth, gender, email, preferred_locale, created_at)
    values (v_branch, v_name,
            '+9665' || lpad(((i * 7919 + 1301) % 100000000)::text, 8, '0'),
            date '1960-01-01' + ((i * 4567) % 19000),
            v_gender,
            case when i % 3 = 0 then 'patient' || i || '@example.test' end,
            case when i % 6 = 0 then 'en' else 'ar' end,
            now() - ((i * 37) % 180) * interval '1 day');
  end loop;

  -- five families: each guardian gets one or two children (children have no own mobile)
  for v_guardian in select id from public.patients where gender = 'female' order by file_no limit 5 loop
    for i in 1..(1 + (abs(hashtext(v_guardian::text)) % 2)) loop
      insert into public.patients (branch_id, full_name, mobile, date_of_birth, gender, created_at)
      values (v_branch,
              (case when i = 1 then 'سلمان ' else 'جود ' end) ||
                split_part((select full_name from public.patients where id = v_guardian), ' ', 2),
              null,
              date '2012-01-01' + (abs(hashtext(v_guardian::text || i)) % 3000),
              case when i = 1 then 'male' else 'female' end,
              now() - interval '90 days')
      returning id into v_id;
      insert into public.patient_guardians (guardian_patient_id, dependent_patient_id, relationship)
      values (v_guardian, v_id, 'child');
    end loop;
  end loop;

  -- a possible duplicate (same mobile + date of birth as an existing patient) awaiting review
  insert into public.patients (branch_id, full_name, mobile, date_of_birth, gender, possible_duplicate_of, duplicate_review_status)
  select v_branch, full_name || ' (مكرر؟)', mobile, date_of_birth, gender, id, 'pending'
    from public.patients where mobile is not null order by file_no offset 9 limit 1;
end $$;

-- Restricted medical info for some patients
insert into public.patient_medical_info (patient_id, allergies, medical_conditions, current_medications)
select id,
       (array['بنسلين / Penicillin', 'لاتكس / Latex', null, 'أسبرين / Aspirin'])[1 + (row_number() over ()) % 4],
       (array['سكري النوع الثاني / Type 2 diabetes', 'ارتفاع ضغط الدم / Hypertension', 'ربو / Asthma', null])[1 + (row_number() over ()) % 4],
       (array['ميتفورمين / Metformin', null, 'فنتولين / Ventolin', null])[1 + (row_number() over ()) % 4]
  from public.patients
 where mobile is not null
 order by file_no
 limit 18;

-- ---------------------------------------------------------------------------
-- Appointments: past 60 days and next 30 days, all statuses
-- Each dentist uses their preferred chair, so seed data never double-books.
-- ---------------------------------------------------------------------------
do $$
declare
  v_branch  uuid := 'b1000000-0000-4000-8000-000000000001';
  v_day     date;
  v_dentist record;
  v_shift   record;
  v_svc     record;
  v_start   timestamptz;
  v_end     timestamptz;
  v_shift_end timestamptz;
  v_channel text;
  v_status  text;
  v_patient uuid;
  v_booker  uuid;
  v_staff   uuid;
  v_count   int;
  r         float;
begin
  perform setseed(0.17);

  for v_day in select generate_series(current_date - 60, current_date + 30, interval '1 day')::date loop
    continue when exists (select 1 from public.clinic_holidays where v_day between date_from and date_to);

    for v_dentist in
      select d.id, dc.chair_id from public.dentists d
        join public.dentist_chairs dc on dc.dentist_id = d.id and dc.is_preferred
    loop
      for v_shift in
        select start_time, end_time from public.dentist_shifts
         where dentist_id = v_dentist.id and weekday = extract(dow from v_day)::int
      loop
        v_start     := ((v_day + v_shift.start_time) at time zone 'Asia/Riyadh') + (floor(random() * 3) * interval '15 minutes');
        v_shift_end := (v_day + v_shift.end_time) at time zone 'Asia/Riyadh';
        v_count     := 0;

        while v_count < 3 and random() < 0.8 loop
          -- skip time covered by leave / blocks
          exit when exists (select 1 from public.schedule_blocks b
                             where b.dentist_id = v_dentist.id and b.block_type <> 'emergency_reserve'
                               and tstzrange(b.starts_at, b.ends_at) && tstzrange(v_start, v_shift_end));

          r := random();
          v_channel := case when r < 0.40 then 'online' when r < 0.85 then 'phone'
                            when r < 0.95 then 'walk_in' else 'emergency' end;
          if v_channel = 'emergency' then
            select * into v_svc from public.services where code = 'EMERG';
          else
            select * into v_svc from public.services where code <> 'EMERG' order by random() limit 1;
          end if;

          v_end := v_start + make_interval(mins => v_svc.duration_minutes);
          exit when v_end > v_shift_end;
          -- online bookings can't be walk-ins in the future or emergencies
          if v_channel in ('walk_in', 'emergency') and v_start > now() then
            v_channel := 'phone';
          end if;

          select id into v_patient from public.patients where is_active order by random() limit 1;
          v_booker := coalesce((select guardian_patient_id from public.patient_guardians
                                 where dependent_patient_id = v_patient limit 1), v_patient);
          v_staff  := case when random() < 0.5 then 'a0000000-0000-4000-8000-000000000003'::uuid
                           else 'a0000000-0000-4000-8000-000000000004'::uuid end;

          r := random();
          if v_end <= now() then
            v_status := case when r < 0.80 then 'completed' when r < 0.90 then 'cancelled' else 'no_show' end;
          elsif v_start <= now() then
            v_status := 'in_treatment';
          elsif v_day = current_date then
            v_status := 'booked';
          else
            v_status := case when r < 0.93 then 'booked' else 'cancelled' end;
          end if;

          insert into public.appointments (
            branch_id, patient_id, booked_by_patient_id, booked_by_staff_id, channel,
            dentist_id, chair_id, service_id, service_name_ar, service_name_en, duration_minutes, price,
            starts_at, ends_at, status, cancel_reason, cancelled_by_type,
            checked_in_at, treatment_started_at, completed_at, cancelled_at, no_show_at, created_at)
          values (
            v_branch, v_patient,
            case when v_channel = 'online' then v_booker end,
            case when v_channel <> 'online' then v_staff end,
            v_channel, v_dentist.id, v_dentist.chair_id, v_svc.id, v_svc.name_ar, v_svc.name_en,
            v_svc.duration_minutes, v_svc.price, v_start, v_end, v_status,
            case when v_status = 'cancelled' then 'طلب المريض / Patient request' end,
            case when v_status = 'cancelled' then (case when random() < 0.6 then 'patient' else 'staff' end) end,
            case when v_status in ('completed', 'in_treatment') then v_start - interval '10 minutes' end,
            case when v_status in ('completed', 'in_treatment') then v_start end,
            case when v_status = 'completed' then v_end end,
            case when v_status = 'cancelled' then least(v_start - interval '1 day', now()) end,
            case when v_status = 'no_show' then v_start + interval '15 minutes' end,
            least(v_start - interval '3 days', now()));

          v_count := v_count + 1;
          v_start := v_end + (floor(random() * 4) * interval '15 minutes');
        end loop;
      end loop;
    end loop;
  end loop;

  -- one visible Admin override (double-booking with a reason) tomorrow evening
  insert into public.appointments (
    branch_id, patient_id, booked_by_staff_id, channel, dentist_id, chair_id, service_id,
    service_name_ar, service_name_en, duration_minutes, price, starts_at, ends_at, is_override, override_reason)
  select v_branch, (select id from public.patients where mobile = '+966501234567'),
         'a0000000-0000-4000-8000-000000000001', 'emergency',
         'd0000000-0000-4000-8000-000000000002', 'c2000000-0000-4000-8000-000000000002', s.id,
         s.name_ar, s.name_en, s.duration_minutes, s.price,
         ((current_date + 1) + time '18:00') at time zone 'Asia/Riyadh',
         ((current_date + 1) + time '18:30') at time zone 'Asia/Riyadh',
         true, 'ألم شديد - موافقة المدير / Severe pain, approved by admin'
    from public.services s where s.code = 'EMERG';
end $$;

-- ---------------------------------------------------------------------------
-- Bills, discounts, payments, refunds for completed visits
-- ---------------------------------------------------------------------------
do $$
declare
  a record;
  v_bill uuid;
  v_balance numeric;
  r float;
  v_method text;
begin
  perform setseed(0.73);
  for a in select * from public.appointments where status = 'completed' order by starts_at loop
    insert into public.bills (branch_id, appointment_id, patient_id, created_at)
    values (a.branch_id, a.id, a.patient_id, a.ends_at)
    returning id into v_bill;

    insert into public.bill_lines (bill_id, service_id, description_ar, description_en, unit_price, created_at)
    values (v_bill, a.service_id, a.service_name_ar, a.service_name_en, a.price, a.ends_at);

    if random() < 0.10 then
      insert into public.bill_discounts (bill_id, discount_type, value, reason, status, requested_by, requested_at)
      values (v_bill, 'percent', 10, 'خصم ولاء / Loyalty discount', 'approved',
              'a0000000-0000-4000-8000-000000000003', a.ends_at);
    end if;

    select balance into v_balance from public.bills where id = v_bill;
    r := random();
    v_method := (array['cash', 'card', 'card', 'bank_transfer'])[1 + floor(random() * 4)::int];

    if r < 0.75 then
      insert into public.payments (bill_id, method, amount, reference, received_at, received_by)
      values (v_bill, v_method, v_balance, case when v_method <> 'cash' then 'DEMO-' || left(v_bill::text, 6) end,
              a.ends_at + interval '10 minutes', 'a0000000-0000-4000-8000-000000000003');
    elsif r < 0.90 then
      insert into public.payments (bill_id, method, amount, received_at, received_by)
      values (v_bill, 'cash', round(v_balance / 2, 2), a.ends_at + interval '10 minutes',
              'a0000000-0000-4000-8000-000000000004');
    end if; -- else: unpaid
  end loop;

  -- three approved refunds on fully paid bills
  insert into public.refunds (bill_id, amount, method, reason, status, requested_by, decided_by)
  select id, 50, 'cash', 'استرداد جزئي / Partial refund', 'approved',
         'a0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001'
    from public.bills where status = 'paid' and total >= 100 order by bill_no limit 3;

  -- items waiting for the Admin ("Needs attention" on the dashboard)
  insert into public.bill_discounts (bill_id, discount_type, value, reason, status, requested_by)
  select id, 'percent', 25, 'ظروف خاصة / Special circumstances', 'pending', 'a0000000-0000-4000-8000-000000000003'
    from public.bills b where status = 'unpaid'
     and not exists (select 1 from public.bill_discounts d where d.bill_id = b.id)
   order by bill_no limit 1;

  insert into public.refunds (bill_id, amount, method, reason, status, requested_by)
  select id, 100, 'card', 'خدمة لم تُقدَّم / Service not provided', 'requested', 'a0000000-0000-4000-8000-000000000004'
    from public.bills where status = 'paid' and total >= 150 order by bill_no desc limit 1;
end $$;

-- ---------------------------------------------------------------------------
-- Notification log (simulated) and staff alerts
-- ---------------------------------------------------------------------------
insert into public.notification_outbox
  (branch_id, appointment_id, patient_id, channel, recipient, template_key, locale, dedupe_key,
   scheduled_for, status, attempts, provider, sent_at)
select a.branch_id, a.id, a.patient_id, 'whatsapp', coalesce(p.mobile, '+966500000000'), 'booking_confirmed',
       p.preferred_locale, 'booking_confirmed:' || a.id, a.created_at, 'simulated', 1, 'simulated', a.created_at
  from public.appointments a join public.patients p on p.id = a.patient_id
 where a.starts_at > now() and a.status = 'booked'
 order by a.starts_at limit 20;

insert into public.notification_outbox
  (branch_id, appointment_id, patient_id, channel, recipient, template_key, dedupe_key, status, attempts, provider, last_error)
select a.branch_id, a.id, a.patient_id, 'whatsapp', '+966500000001', 'reminder_24h',
       'reminder_24h:' || a.id || ':demo-failed', 'failed', 3, 'simulated', 'Simulated provider error (demo)'
  from public.appointments a where a.starts_at > now() and a.status = 'booked' order by a.starts_at limit 1;

insert into public.staff_alerts (branch_id, alert_type, target_role, appointment_id, message_ar, message_en)
select a.branch_id, 'new_online_booking', 'receptionist', a.id,
       'حجز إلكتروني جديد ' || a.reference_no, 'New online booking ' || a.reference_no
  from public.appointments a where a.channel = 'online' and a.starts_at > now() order by a.created_at desc limit 3;

insert into public.staff_alerts (branch_id, alert_type, target_role, message_ar, message_en)
values ('b1000000-0000-4000-8000-000000000001', 'discount_pending', 'admin',
        'طلب خصم بانتظار الموافقة', 'Discount awaiting approval'),
       ('b1000000-0000-4000-8000-000000000001', 'refund_requested', 'admin',
        'طلب استرداد بانتظار الموافقة', 'Refund awaiting approval');
