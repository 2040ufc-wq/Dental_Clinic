-- Billing safety nets (BIL-01..08): totals, VAT, overpayment, locked lines, refunds, voids.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(12);

create temp table t_patient as select id from public.patients order by file_no limit 1;

-- A bill with one 200.00 SAR line; seed settings: VAT 15%, prices exclusive of VAT → total 230.00
create temp table t_bill as
  with b as (
    insert into public.bills (branch_id, patient_id)
    values ('b1000000-0000-4000-8000-000000000001', (select id from t_patient))
    returning id, bill_no
  ) select * from b;

insert into public.bill_lines (bill_id, description_ar, description_en, unit_price)
values ((select id from t_bill), 'تنظيف', 'Cleaning', 200);

select matches((select bill_no from t_bill), '^B-[0-9]{6}$', 'bill number is generated');
select is((select total from public.bills where id = (select id from t_bill)), 230.00::numeric,
          'total = 200 + 15% VAT = 230.00');

insert into public.payments (bill_id, method, amount) values ((select id from t_bill), 'cash', 100);

select is((select balance from public.bills where id = (select id from t_bill)), 130.00::numeric,
          'partial payment leaves 130.00');
select is((select status from public.bills where id = (select id from t_bill)), 'partially_paid',
          'status becomes partially_paid');
select matches((select receipt_no from public.payments where bill_id = (select id from t_bill)),
               '^R-[0-9]{6}$', 'receipt number is generated');

select throws_ok(
  $$ insert into public.payments (bill_id, method, amount)
     values ((select id from t_bill), 'card', 200) $$,
  'P0001', 'AMOUNT_EXCEEDS_BALANCE', 'paying more than the balance → rejected');

select throws_ok(
  $$ insert into public.bill_lines (bill_id, description_ar, description_en, unit_price)
     values ((select id from t_bill), 'حشوة', 'Filling', 300) $$,
  'P0001', 'BILL_LOCKED', 'lines are locked after a payment');

select throws_ok(
  $$ insert into public.refunds (bill_id, amount, method, reason, status)
     values ((select id from t_bill), 150, 'cash', 'Test refund', 'approved') $$,
  'P0001', 'REFUND_EXCEEDS_PAID', 'refund larger than amount paid → rejected');

insert into public.refunds (bill_id, amount, method, reason, status)
values ((select id from t_bill), 50, 'cash', 'Partial refund', 'approved');

select is((select balance from public.bills where id = (select id from t_bill)), 180.00::numeric,
          'approved refund of 50 raises the balance to 180.00');

select throws_ok(
  $$ update public.payments set amount = 1 where bill_id = (select id from t_bill) $$,
  'P0001', 'PAYMENT_IMMUTABLE', 'a recorded payment cannot be edited');

select throws_ok(
  $$ delete from public.payments where bill_id = (select id from t_bill) $$,
  'P0001', 'PAYMENT_IMMUTABLE', 'a recorded payment cannot be deleted');

-- Voiding requires a reason and updates totals; first remove the refund effect by checking paid only
update public.payments set is_voided = true, void_reason = 'Entered twice'
 where bill_id = (select id from t_bill);
select is((select paid_amount from public.bills where id = (select id from t_bill)), 0.00::numeric,
          'voided payment no longer counts as paid');

select * from finish();
rollback;
