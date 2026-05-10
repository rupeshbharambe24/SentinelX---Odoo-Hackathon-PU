
-- profiles
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  email text,
  phone text,
  city text,
  country text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);

-- trips
create table public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  title text not null,
  description text,
  destination text,
  cover_image text,
  start_date date,
  end_date date,
  budget numeric default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.trips enable row level security;
create policy "trips_owner_all" on public.trips for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index trips_user_idx on public.trips(user_id);

-- sections (cities/stops within a trip)
create table public.trip_sections (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips on delete cascade,
  name text not null,
  city text,
  start_date date,
  end_date date,
  budget numeric default 0,
  position int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.trip_sections enable row level security;
create policy "sections_owner_all" on public.trip_sections for all
  using (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid()))
  with check (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid()));
create index sections_trip_idx on public.trip_sections(trip_id);

-- activities
create table public.activities (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.trip_sections on delete cascade,
  title text not null,
  category text,
  description text,
  cost numeric default 0,
  duration_hours numeric default 1,
  scheduled_date date,
  scheduled_time time,
  position int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.activities enable row level security;
create policy "activities_owner_all" on public.activities for all
  using (exists (
    select 1 from public.trip_sections s
    join public.trips t on t.id = s.trip_id
    where s.id = section_id and t.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.trip_sections s
    join public.trips t on t.id = s.trip_id
    where s.id = section_id and t.user_id = auth.uid()
  ));
create index activities_section_idx on public.activities(section_id);

-- packing items
create table public.packing_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips on delete cascade,
  category text not null default 'General',
  name text not null,
  packed boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.packing_items enable row level security;
create policy "packing_owner_all" on public.packing_items for all
  using (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid()))
  with check (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid()));

-- notes
create table public.trip_notes (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips on delete cascade,
  title text not null,
  content text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.trip_notes enable row level security;
create policy "notes_owner_all" on public.trip_notes for all
  using (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid()))
  with check (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid()));

-- profile auto-create trigger
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at trigger
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger trips_touch before update on public.trips for each row execute function public.touch_updated_at();
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger notes_touch before update on public.trip_notes for each row execute function public.touch_updated_at();
