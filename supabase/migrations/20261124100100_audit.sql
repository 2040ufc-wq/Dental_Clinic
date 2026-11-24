-- =============================================================================
-- 02 · Audit log (H1) — append-only record of who did what and when
-- Created early so every later table can attach its audit trigger.
-- =============================================================================

create table public.audit_logs (
  id          bigint generated always as identity primary key,
  branch_id   uuid,
  occurred_at timestamptz not null default now(),
  actor_type  text not null check (actor_type in ('staff', 'patient', 'system')),
  actor_id    uuid,
  actor_role  text,
  action      text not null,
  entity_type text not null,
  entity_id   uuid,
  before      jsonb,
  after       jsonb,
  reason      text,
  ip          inet
);

create index audit_logs_entity_idx   on public.audit_logs (entity_type, entity_id);
create index audit_logs_actor_idx    on public.audit_logs (actor_id, occurred_at desc);
create index audit_logs_occurred_idx on public.audit_logs (occurred_at desc);
create index audit_logs_action_idx   on public.audit_logs (action);

comment on table public.audit_logs is
  'Append-only audit trail (AUD-01..04). Updates and deletes are rejected by trigger and privileges.';

-- ---- Immutability: nobody (not even the app) may change or remove history ----
create or replace function private.block_audit_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform private.raise_business_error('AUDIT_LOG_IMMUTABLE');
  return null;
end;
$$;

create trigger audit_logs_no_update_delete
  before update or delete on public.audit_logs
  for each row execute function private.block_audit_mutation();

create trigger audit_logs_no_truncate
  before truncate on public.audit_logs
  for each statement execute function private.block_audit_mutation();

revoke insert, update, delete, truncate on public.audit_logs from anon, authenticated, service_role;

-- ---- Writer: resolves the actor from the logged-in user ----
-- The server sets app.client_ip per transaction; it is optional.
create or replace function private.write_audit(
  p_action      text,
  p_entity_type text,
  p_entity_id   uuid,
  p_branch_id   uuid,
  p_before      jsonb,
  p_after       jsonb,
  p_reason      text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid  uuid := auth.uid();
  v_role text;
  v_type text := 'system';
begin
  if v_uid is not null then
    select sp.role into v_role from public.staff_profiles sp where sp.id = v_uid;
    if found then
      v_type := 'staff';
    elsif exists (select 1 from public.patients p where p.auth_user_id = v_uid) then
      v_type := 'patient';
      v_role := 'patient';
    end if;
  end if;

  insert into public.audit_logs
    (branch_id, actor_type, actor_id, actor_role, action, entity_type, entity_id, before, after, reason, ip)
  values
    (p_branch_id, v_type, v_uid, v_role, p_action, p_entity_type, p_entity_id, p_before, p_after, p_reason,
     nullif(current_setting('app.client_ip', true), '')::inet);
end;
$$;

-- ---- Generic row trigger ----
-- Usage: audit_row('<entity>')  or  audit_row('<entity>', 'redact')
-- 'redact' keeps field names but hides values (medical info, clinical notes).
create or replace function private.audit_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_entity text    := tg_argv[0];
  v_redact boolean := coalesce(tg_argv[1] = 'redact', false);
  v_old    jsonb   := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  v_new    jsonb   := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  v_row    jsonb   := coalesce(v_new, v_old);
  v_before jsonb;
  v_after  jsonb;
  v_action text;
  k        text;
begin
  if tg_op = 'UPDATE' then
    v_before := '{}'::jsonb;
    v_after  := '{}'::jsonb;
    for k in select jsonb_object_keys(v_new) loop
      -- bookkeeping columns are not "changes" worth auditing
      continue when k in ('updated_at', 'updated_by', 'version', 'no_show_count');
      if v_old -> k is distinct from v_new -> k then
        v_before := v_before || jsonb_build_object(k, v_old -> k);
        v_after  := v_after  || jsonb_build_object(k, v_new -> k);
      end if;
    end loop;
    if v_after = '{}'::jsonb then
      return null; -- nothing meaningful changed
    end if;
    v_action := v_entity || '.update';
    if v_entity = 'appointment' then
      if v_after ? 'status' then
        v_action := 'appointment.status_change';
      elsif v_after ?| array['starts_at', 'ends_at', 'dentist_id', 'chair_id'] then
        v_action := 'appointment.reschedule';
      end if;
    end if;
  elsif tg_op = 'INSERT' then
    v_after  := v_new;
    v_action := v_entity || '.create';
    if v_entity = 'appointment' and (v_new ->> 'is_override')::boolean then
      v_action := 'appointment.override';
    end if;
  else
    v_before := v_old;
    v_action := v_entity || '.delete';
  end if;

  if v_redact then
    v_before := (select jsonb_object_agg(key, to_jsonb('[redacted]'::text)) from jsonb_each(v_before));
    v_after  := (select jsonb_object_agg(key, to_jsonb('[redacted]'::text)) from jsonb_each(v_after));
  end if;

  perform private.write_audit(
    v_action,
    v_entity,
    coalesce(v_row ->> 'id', v_row ->> 'patient_id', v_row ->> 'staff_id')::uuid,
    (v_row ->> 'branch_id')::uuid,
    v_before,
    v_after,
    coalesce(v_after ->> 'status_reason', v_after ->> 'cancel_reason', v_after ->> 'override_reason',
             v_after ->> 'void_reason', v_after ->> 'reason')
  );
  return null;
end;
$$;
