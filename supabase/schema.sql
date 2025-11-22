-- Cities
create table if not exists public.cities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

-- Schools
create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities (id) on delete cascade,
  name text not null,
  address text,
  description text,
  logo_url text,
  banner_url text,
  school_admin_id uuid references public.users (id),
  is_premium boolean not null default false,
  created_at timestamptz default now()
);

-- Users
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  telegram_id text not null unique,
  username text,
  first_name text,
  last_name text,
  photo_url text,
  current_school_id uuid references public.schools (id),
  class_name text,
  is_global_admin boolean not null default false,
  premium_until timestamptz,
  created_at timestamptz default now()
);

-- School Requests
create table if not exists public.school_requests (
  id uuid primary key default gen_random_uuid(),
  requested_by_user_id uuid not null references public.users (id) on delete cascade,
  city_name text not null,
  school_name text not null,
  address text,
  status text not null default 'pending',
  decision_by_admin_id uuid references public.users (id),
  decision_comment text,
  created_at timestamptz default now()
);

-- Posts (упрощённо)
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  author_user_id uuid references public.users (id),
  title text not null,
  content text,
  status text not null default 'pending',
  is_pinned boolean not null default false,
  created_at timestamptz default now()
);

-- Row Level Security можно включить и настроить позже.
