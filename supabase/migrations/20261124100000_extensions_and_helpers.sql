-- =============================================================================
-- 01 · Extensions and shared helpers
-- Source of truth: docs/03-database-design.md
-- =============================================================================

-- btree_gist: lets one constraint combine "same dentist" (=) with "time overlaps" (&&)
create extension if not exists btree_gist with schema extensions;
-- pg_trgm: fast partial-name search in Arabic and English
create extension if not exists pg_trgm with schema extensions;

-- Internal helpers live in a schema that is never exposed as an API.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

-- Keeps updated_at / updated_by current on every UPDATE.
create or replace function private.touch_row()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

-- Raises a business error whose message is the API error code (docs/04 §1.5).
create or replace function private.raise_business_error(p_code text, p_detail text default null)
returns void
language plpgsql
set search_path = ''
as $$
begin
  raise exception using errcode = 'P0001', message = p_code, detail = coalesce(p_detail, p_code);
end;
$$;
