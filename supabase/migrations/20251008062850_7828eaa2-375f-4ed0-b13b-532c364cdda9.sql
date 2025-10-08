-- Create profiles table for app users
create table if not exists public.profiles (
  id uuid primary key,
  email text unique,
  full_name text,
  business_name text,
  role text default 'owner',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Timestamp updater function
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql set search_path = public;

-- Trigger for updated_at
drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.update_updated_at_column();

-- Security definer function to check user role
create or replace function public.get_user_role(_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = _user_id limit 1;
$$;

-- Policies
-- Users can view their own profile
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

-- Admins/Owners can view all profiles
drop policy if exists "Admins can view profiles" on public.profiles;
create policy "Admins can view profiles"
  on public.profiles for select
  to authenticated
  using (public.get_user_role(auth.uid()) in ('owner','super_admin'));

-- Users can insert their own profile
drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- Users can update their own profile
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);
