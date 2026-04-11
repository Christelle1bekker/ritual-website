-- Waitlist table for landing page email capture
-- Run this in Supabase SQL editor (dashboard → SQL Editor → New query)

create table if not exists waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text default 'landing_page',
  created_at timestamptz default now()
);

-- Prevent duplicate emails (case-insensitive)
create unique index if not exists waitlist_email_unique
  on waitlist (lower(email));

-- Enable RLS
alter table waitlist enable row level security;

-- Allow anonymous inserts only (server-side function uses anon key)
drop policy if exists "Allow anonymous insert" on waitlist;
create policy "Allow anonymous insert"
  on waitlist for insert
  with check (true);

-- Allow reads only via service_role (for admin/export later)
drop policy if exists "Allow service role select" on waitlist;
create policy "Allow service role select"
  on waitlist for select
  using (auth.role() = 'service_role');
