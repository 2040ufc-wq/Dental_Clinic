-- =============================================================================
-- 08 · Billing (F1–F5): bills, lines, discounts, payments, refunds
-- The database keeps every total correct and refuses impossible money movements.
-- =============================================================================

create table public.bills (
  id                 uuid primary key default gen_random_uuid(),
  branch_id          uuid not null references public.branches (id),
  bill_no            text not null unique,
  appointment_id     uuid unique references public.appointments (id),
  patient_id         uuid not null references public.patients (id),
  subtotal           numeric(10,2) not null default 0,
  discount_amount    numeric(10,2) not null default 0,
  vat_rate           numeric(5,2)  not null default 0 check (vat_rate between 0 and 100),
  -- snapshot of the VAT mode when the bill was created (needed to recompute correctly)
  prices_include_vat boolean       not null default false,
  vat_amount         numeric(10,2) not null default 0,
  total              numeric(10,2) not null default 0,
  paid_amount        numeric(10,2) not null default 0,
  refunded_amount    numeric(10,2) not null default 0,
  balance            numeric(10,2) not null default 0,
  status             text not null default 'unpaid' check (status in ('unpaid', 'partially_paid', 'paid', 'void')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  created_by         uuid default auth.uid(),
  updated_by         uuid,
  -- money actually kept by the clinic can never exceed the bill total
  check (paid_amount - refunded_amount <= total)
);
create index bills_patient_idx     on public.bills (patient_id);
create index bills_status_idx      on public.bills (status);
create index bills_outstanding_idx on public.bills (branch_id) where balance > 0;

create table public.bill_lines (
  id             uuid primary key default gen_random_uuid(),
  bill_id        uuid not null references public.bills (id) on delete cascade,
  service_id     uuid references public.services (id),
  description_ar text not null,
  description_en text not null,
  quantity       int not null default 1 check (quantity > 0),
  unit_price     numeric(10,2) not null check (unit_price >= 0),
  line_total     numeric(10,2) generated always as (quantity * unit_price) stored,
  added_by       uuid default auth.uid(),
  created_at     timestamptz not null default now()
);
create index bill_lines_bill_idx on public.bill_lines (bill_id);

create table public.bill_discounts (
  id            uuid primary key default gen_random_uuid(),
  bill_id       uuid not null references public.bills (id) on delete cascade,
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  value         numeric(10,2) not null check (value > 0),
  amount        numeric(10,2) not null default 0, -- SAR value when requested (informational)
  reason        text not null check (char_length(btrim(reason)) between 2 and 500),
  status        text not null check (status in ('pending', 'approved', 'rejected')),
  requested_by  uuid default auth.uid(),
  requested_at  timestamptz not null default now(),
  decided_by    uuid,
  decided_at    timestamptz,
  check (discount_type <> 'percent' or value <= 100)
);
-- One active (pending or approved) discount per bill
create unique index bill_discounts_one_active_uq on public.bill_discounts (bill_id) where status in ('pending', 'approved');

create table public.payments (
  id              uuid primary key default gen_random_uuid(),
  bill_id         uuid not null references public.bills (id),
  receipt_no      text not null unique,
  method          text not null check (method in ('cash', 'card', 'bank_transfer')),
  amount          numeric(10,2) not null check (amount > 0),
  reference       text check (char_length(reference) <= 100),
  received_at     timestamptz not null default now(),
  received_by     uuid default auth.uid(),
  idempotency_key text unique,
  is_voided       boolean not null default false,
  void_reason     text check (char_length(void_reason) <= 500),
  voided_by       uuid,
  voided_at       timestamptz,
  check (not is_voided or void_reason is not null)
);
create index payments_bill_idx          on public.payments (bill_id);
create index payments_received_idx      on public.payments (received_at);
create index payments_method_received_idx on public.payments (method, received_at);

create table public.refunds (
  id           uuid primary key default gen_random_uuid(),
  bill_id      uuid not null references public.bills (id),
  payment_id   uuid references public.payments (id),
  refund_no    text not null unique,
  amount       numeric(10,2) not null check (amount > 0),
  method       text not null check (method in ('cash', 'card', 'bank_transfer')),
  reason       text not null check (char_length(btrim(reason)) between 2 and 500),
  status       text not null check (status in ('requested', 'approved', 'rejected')),
  requested_by uuid default auth.uid(),
  requested_at timestamptz not null default now(),
  decided_by   uuid,
  decided_at   timestamptz
);
create index refunds_bill_idx   on public.refunds (bill_id);
create index refunds_status_idx on public.refunds (status) where status = 'requested';

-- =============================================================================
-- Totals: recalculated after any change to lines, discounts, payments or refunds
-- =============================================================================
create or replace function private.recalc_bill(p_bill_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  b          public.bills%rowtype;
  v_subtotal numeric(10,2);
  v_discount numeric(10,2) := 0;
  v_taxable  numeric(10,2);
  v_vat      numeric(10,2);
  v_total    numeric(10,2);
  v_paid     numeric(10,2);
  v_refunded numeric(10,2);
  v_net      numeric(10,2);
  v_balance  numeric(10,2);
  d          record;
begin
  select * into b from public.bills where id = p_bill_id for update;
  if not found then return; end if;

  select coalesce(sum(line_total), 0) into v_subtotal from public.bill_lines where bill_id = p_bill_id;

  select discount_type, value into d from public.bill_discounts
   where bill_id = p_bill_id and status = 'approved';
  if found then
    v_discount := least(v_subtotal,
      case d.discount_type when 'percent' then round(v_subtotal * d.value / 100, 2) else d.value end);
  end if;

  v_taxable := v_subtotal - v_discount;
  if b.prices_include_vat then
    v_total := v_taxable;
    v_vat   := round(v_total - v_total / (1 + b.vat_rate / 100), 2);
  else
    v_vat   := round(v_taxable * b.vat_rate / 100, 2);
    v_total := v_taxable + v_vat;
  end if;

  select coalesce(sum(amount), 0) into v_paid     from public.payments where bill_id = p_bill_id and not is_voided;
  select coalesce(sum(amount), 0) into v_refunded from public.refunds  where bill_id = p_bill_id and status = 'approved';

  v_net     := v_paid - v_refunded;
  v_balance := v_total - v_net;

  update public.bills set
    subtotal        = v_subtotal,
    discount_amount = v_discount,
    vat_amount      = v_vat,
    total           = v_total,
    paid_amount     = v_paid,
    refunded_amount = v_refunded,
    balance         = v_balance,
    status = case
      when b.status = 'void' then 'void'
      when v_balance <= 0    then 'paid'
      when v_net > 0         then 'partially_paid'
      else 'unpaid'
    end
  where id = p_bill_id;
end;
$$;

create or replace function private.recalc_bill_trigger()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    perform private.recalc_bill(old.bill_id);
  else
    perform private.recalc_bill(new.bill_id);
  end if;
  return null;
end;
$$;

-- ---- Bills: number + VAT snapshot from settings ----
create or replace function private.bills_before_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
declare s public.clinic_settings%rowtype;
begin
  if new.bill_no is null then
    new.bill_no := private.next_number(new.branch_id, 'bill');
  end if;
  select * into s from public.clinic_settings where branch_id = new.branch_id;
  if found then
    new.vat_rate           := case when s.vat_enabled then s.vat_rate else 0 end;
    new.prices_include_vat := s.prices_include_vat;
  end if;
  return new;
end;
$$;
create trigger bills_before_insert before insert on public.bills
  for each row execute function private.bills_before_insert();
create trigger bills_touch before update on public.bills
  for each row execute function private.touch_row();

-- ---- Lines are locked once money has been received (correct via refund) ----
-- security definer: must see payments even when the caller (e.g. a dentist) cannot
create or replace function private.bill_lines_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_bill uuid;
begin
  if tg_op = 'DELETE' then v_bill := old.bill_id; else v_bill := new.bill_id; end if;
  if exists (select 1 from public.payments where bill_id = v_bill and not is_voided) then
    perform private.raise_business_error('BILL_LOCKED', 'Lines cannot change after a payment; use a refund');
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
create trigger bill_lines_guard before insert or update or delete on public.bill_lines
  for each row execute function private.bill_lines_guard();

-- ---- Discounts: store the SAR amount at request time ----
create or replace function private.bill_discounts_before_write()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_subtotal numeric(10,2);
begin
  select coalesce(sum(line_total), 0) into v_subtotal from public.bill_lines where bill_id = new.bill_id;
  new.amount := least(v_subtotal,
    case new.discount_type when 'percent' then round(v_subtotal * new.value / 100, 2) else new.value end);
  if tg_op = 'UPDATE' and new.status is distinct from old.status and new.status <> 'pending' then
    new.decided_by := auth.uid();
    new.decided_at := now();
  end if;
  return new;
end;
$$;
create trigger bill_discounts_before_write before insert or update on public.bill_discounts
  for each row execute function private.bill_discounts_before_write();

-- ---- Payments: receipt number, never more than the balance, otherwise immutable ----
create or replace function private.payments_before_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_balance numeric(10,2);
  v_branch  uuid;
  v_status  text;
begin
  -- lock the bill so two simultaneous payments are checked one after the other
  select balance, branch_id, status into v_balance, v_branch, v_status
    from public.bills where id = new.bill_id for update;
  if v_status = 'void' then
    perform private.raise_business_error('BILL_LOCKED', 'Bill is void');
  end if;
  if new.amount > v_balance then
    perform private.raise_business_error('AMOUNT_EXCEEDS_BALANCE');
  end if;
  if new.receipt_no is null then
    new.receipt_no := private.next_number(v_branch, 'receipt');
  end if;
  return new;
end;
$$;
create trigger payments_before_insert before insert on public.payments
  for each row execute function private.payments_before_insert();

-- Only "void" may change on a payment; payments are never deleted (BIL-08)
create or replace function private.payments_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    perform private.raise_business_error('PAYMENT_IMMUTABLE', 'Payments cannot be deleted; void instead');
  end if;
  if (to_jsonb(new) - array['is_voided', 'void_reason', 'voided_by', 'voided_at'])
     is distinct from (to_jsonb(old) - array['is_voided', 'void_reason', 'voided_by', 'voided_at'])
     or (old.is_voided and not new.is_voided) then
    perform private.raise_business_error('PAYMENT_IMMUTABLE', 'Only voiding is allowed on a payment');
  end if;
  if new.is_voided and not old.is_voided then
    new.voided_by := auth.uid();
    new.voided_at := now();
  end if;
  return new;
end;
$$;
create trigger payments_guard before update or delete on public.payments
  for each row execute function private.payments_guard();

-- ---- Refunds: number; an approved refund can't exceed what was actually kept ----
create or replace function private.refunds_before_write()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_paid     numeric(10,2);
  v_refunded numeric(10,2);
  v_branch   uuid;
begin
  select paid_amount, refunded_amount, branch_id into v_paid, v_refunded, v_branch
    from public.bills where id = new.bill_id for update;

  if tg_op = 'INSERT' and new.refund_no is null then
    new.refund_no := private.next_number(v_branch, 'refund');
  end if;

  if new.status = 'approved' and (tg_op = 'INSERT' or old.status <> 'approved') then
    if new.amount > v_paid - v_refunded then
      perform private.raise_business_error('REFUND_EXCEEDS_PAID');
    end if;
    new.decided_by := coalesce(new.decided_by, auth.uid());
    new.decided_at := coalesce(new.decided_at, now());
  elsif tg_op = 'UPDATE' and new.status = 'rejected' and old.status <> 'rejected' then
    new.decided_by := auth.uid();
    new.decided_at := now();
  end if;

  if tg_op = 'UPDATE' and old.status in ('approved', 'rejected') and new.status <> old.status then
    perform private.raise_business_error('REFUND_ALREADY_DECIDED');
  end if;
  return new;
end;
$$;
create trigger refunds_before_write before insert or update on public.refunds
  for each row execute function private.refunds_before_write();

-- ---- Recalculate totals after every money-related change ----
create trigger bill_lines_recalc     after insert or update or delete on public.bill_lines     for each row execute function private.recalc_bill_trigger();
create trigger bill_discounts_recalc after insert or update or delete on public.bill_discounts for each row execute function private.recalc_bill_trigger();
create trigger payments_recalc       after insert or update            on public.payments       for each row execute function private.recalc_bill_trigger();
create trigger refunds_recalc        after insert or update            on public.refunds        for each row execute function private.recalc_bill_trigger();

-- ---- Audit ----
create trigger bill_discounts_audit after insert or update on public.bill_discounts for each row execute function private.audit_row('discount');
create trigger payments_audit       after insert or update on public.payments       for each row execute function private.audit_row('payment');
create trigger refunds_audit        after insert or update on public.refunds        for each row execute function private.audit_row('refund');
