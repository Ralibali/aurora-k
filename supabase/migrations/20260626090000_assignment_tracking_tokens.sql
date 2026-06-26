create extension if not exists pgcrypto;

alter table public.assignments
  add column if not exists tracking_token uuid not null default gen_random_uuid(),
  add column if not exists tracking_enabled boolean not null default true;

create unique index if not exists assignments_tracking_token_key
  on public.assignments (tracking_token);

comment on column public.assignments.tracking_token is
  'Unpredictable token used by the public read-only tracking endpoint.';

comment on column public.assignments.tracking_enabled is
  'Allows an administrator to disable the public tracking link.';
