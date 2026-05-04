alter table public.profiles
  add column if not exists enrollment_no text;

alter table public.events
  add column if not exists participation_mode text not null default 'solo',
  add column if not exists max_team_members integer not null default 1;

alter table public.event_registrations
  add column if not exists registration_type text not null default 'solo',
  add column if not exists registration_data jsonb not null default '{}'::jsonb;