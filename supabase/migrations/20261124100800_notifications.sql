-- =============================================================================
-- 09 · Notifications (G1–G3): message outbox/log and in-app staff alerts
-- =============================================================================

create table public.notification_outbox (
  id                  uuid primary key default gen_random_uuid(),
  branch_id           uuid not null references public.branches (id),
  appointment_id      uuid references public.appointments (id),
  patient_id          uuid references public.patients (id),
  channel             text not null check (channel in ('whatsapp', 'sms', 'email')),
  recipient           text not null,
  template_key        text not null check (template_key in
                        ('booking_confirmed', 'reminder_24h', 'reminder_2h', 'cancelled', 'rescheduled',
                         'dentist_absence', 'follow_up', 'otp')),
  locale              text not null default 'ar' check (locale in ('ar', 'en')),
  payload             jsonb not null default '{}'::jsonb,
  -- e.g. reminder_24h:<appointment id>:<starts_at> → each reminder is sent at most once
  dedupe_key          text unique,
  scheduled_for       timestamptz not null default now(),
  status              text not null default 'pending'
                      check (status in ('pending', 'sent', 'failed', 'simulated', 'skipped')),
  attempts            int not null default 0 check (attempts >= 0),
  provider            text,
  provider_message_id text,
  last_error          text,
  sent_at             timestamptz,
  created_at          timestamptz not null default now()
);
create index notification_outbox_due_idx         on public.notification_outbox (status, scheduled_for);
create index notification_outbox_appointment_idx on public.notification_outbox (appointment_id);
create index notification_outbox_created_idx     on public.notification_outbox (created_at desc);

create table public.staff_alerts (
  id             uuid primary key default gen_random_uuid(),
  branch_id      uuid not null references public.branches (id),
  alert_type     text not null check (alert_type in
                   ('new_online_booking', 'cancellation', 'reschedule', 'emergency_booking',
                    'discount_pending', 'refund_requested')),
  target_role    text not null check (target_role in ('receptionist', 'admin')),
  appointment_id uuid references public.appointments (id),
  message_ar     text not null,
  message_en     text not null,
  created_at     timestamptz not null default now()
);
create index staff_alerts_branch_created_idx on public.staff_alerts (branch_id, created_at desc);

create table public.staff_alert_reads (
  alert_id uuid not null references public.staff_alerts (id) on delete cascade,
  staff_id uuid not null references public.staff_profiles (id) on delete cascade,
  read_at  timestamptz not null default now(),
  primary key (alert_id, staff_id)
);
