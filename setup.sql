-- ===== OrbitLabs onboarding tracker — run once in Supabase → SQL Editor =====
-- Before running: change the admin email at the bottom to your own.

-- One row per staff member, updated as they go through the deck.
create table if not exists public.progress (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  email         text not null,
  current_slide int  not null default 0,
  max_slide     int  not null default 0,
  visited       int[] not null default '{}',
  quiz          jsonb not null default '{}'::jsonb,
  started_at    timestamptz not null default now(),
  last_active   timestamptz not null default now()
);

-- People allowed to open the dashboard.
create table if not exists public.admins (
  email text primary key
);

alter table public.progress enable row level security;
alter table public.admins   enable row level security;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins a
                 where lower(a.email) = lower(auth.jwt() ->> 'email'));
$$;

-- Staff: read and write only their own row. Admins: read everyone.
drop policy if exists "progress read"   on public.progress;
drop policy if exists "progress insert" on public.progress;
drop policy if exists "progress update" on public.progress;
drop policy if exists "admins read"     on public.admins;

create policy "progress read"   on public.progress for select to authenticated
  using (auth.uid() = user_id or public.is_admin());
create policy "progress insert" on public.progress for insert to authenticated
  with check (auth.uid() = user_id);
create policy "progress update" on public.progress for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "admins read"     on public.admins for select to authenticated
  using (public.is_admin());

grant select, insert, update on public.progress to authenticated;
grant select on public.admins to authenticated;

drop function if exists public.admin_roster();

-- Full staff list for the dashboard (includes people who haven't started yet).
create or replace function public.admin_roster()
returns table (user_id uuid, email text, created_at timestamptz, last_sign_in_at timestamptz, is_admin boolean)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;
  return query
    select u.id, u.email::text, u.created_at, u.last_sign_in_at,
           exists (select 1 from public.admins a where lower(a.email) = lower(u.email))
    from auth.users u
    order by u.created_at desc;
end;
$$;

revoke execute on function public.admin_roster() from public, anon;
grant  execute on function public.admin_roster() to authenticated;

-- >>> CHANGE THIS to your own email (add more lines for other admins) <<<
insert into public.admins (email) values ('your.name@orbitlabs.global')
on conflict do nothing;
