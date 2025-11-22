-- Очистка (для нового проекта, если нет прод-данных)
drop table if exists public.votes cascade;
drop table if exists public.elections cascade;
drop table if exists public.admin_candidates cascade;
drop table if exists public.posts cascade;
drop table if exists public.school_requests cascade;
drop table if exists public.schools cascade;
drop table if exists public.users cascade;
drop table if exists public.cities cascade;

create extension if not exists "pgcrypto";

-- Города
create table if not exists public.cities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

-- Пользователи
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  telegram_id text not null unique,
  username text,
  first_name text,
  last_name text,
  photo_url text,
  current_school_id uuid,
  class_name text,
  is_global_admin boolean not null default false,
  premium_until timestamptz,
  created_at timestamptz default now()
);

-- Школы
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

-- Заявки на подключение школ
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

-- Посты (новости)
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  author_user_id uuid references public.users (id),
  title text not null,
  content text,
  status text not null default 'pending', -- pending / published / rejected
  is_pinned boolean not null default false,
  created_at timestamptz default now()
);

-- Кандидаты в админы школы
create table if not exists public.admin_candidates (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  display_name text,
  class_name text,
  photo_url text,
  status text not null default 'approved',
  created_at timestamptz default now()
);

-- Выборы админа школы
create table if not exists public.elections (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  status text not null default 'active', -- active / finished
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  winner_candidate_id uuid references public.admin_candidates (id),
  created_at timestamptz default now()
);

-- Голоса
create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  election_id uuid not null references public.elections (id) on delete cascade,
  voter_user_id uuid not null references public.users (id) on delete cascade,
  candidate_id uuid not null references public.admin_candidates (id) on delete cascade,
  created_at timestamptz default now(),
  unique (election_id, voter_user_id)
);


-- Предложенные новости (от обычных пользователей)
create table if not exists public.post_suggestions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  author_user_id uuid not null references public.users (id) on delete cascade,
  title text not null,
  content text,
  status text not null default 'pending', -- pending / approved / rejected
  reviewed_by_user_id uuid references public.users (id),
  reviewed_at timestamptz,
  review_comment text,
  created_at timestamptz default now()
);

-- Баны внутри школы
create table if not exists public.school_bans (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  reason text,
  active boolean not null default true,
  created_at timestamptz default now(),
  unbanned_at timestamptz
);

