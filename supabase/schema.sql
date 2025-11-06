-- Supabase schema for Chromatotec intranet
-- Run this script in the Supabase SQL editor to provision all required tables and policies.

-- Extensions
create extension if not exists "pgcrypto";

-- Table: news
create table if not exists public.news (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    content text not null,
    author text,
    category text default 'Général',
    published_at timestamptz default timezone('utc', now()),
    created_at timestamptz default timezone('utc', now()),
    updated_at timestamptz default timezone('utc', now())
);

create index if not exists news_published_at_idx on public.news (published_at desc);

-- Table: announcements
create table if not exists public.announcements (
    id uuid primary key default gen_random_uuid(),
    title text,
    message text not null,
    author text,
    tags text,
    created_at timestamptz default timezone('utc', now())
);

create index if not exists announcements_created_at_idx on public.announcements (created_at desc);

-- Table: documents
create table if not exists public.documents (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    description text,
    category text,
    url text not null,
    created_at timestamptz default timezone('utc', now()),
    updated_at timestamptz default timezone('utc', now())
);

create index if not exists documents_updated_at_idx on public.documents (coalesce(updated_at, created_at) desc);

-- Table: reservations
create table if not exists public.reservations (
    id uuid primary key default gen_random_uuid(),
    resource text not null,
    team text,
    start_time timestamptz not null,
    end_time timestamptz not null,
    notes text,
    created_at timestamptz default timezone('utc', now())
);

create index if not exists reservations_start_time_idx on public.reservations (start_time asc);

-- Table: tasks (for dashboard widgets)
create table if not exists public.tasks (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    description text,
    priority text default 'normale' check (priority in ('basse', 'normale', 'moyenne', 'haute')),
    due_date date,
    assigned_to text,
    completed boolean default false,
    created_at timestamptz default timezone('utc', now())
);

create index if not exists tasks_due_date_idx on public.tasks (due_date asc nulls last);

-- Table: plannings
create table if not exists public.plannings (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    team text,
    start_date date not null,
    end_date date,
    location text,
    description text,
    created_at timestamptz default timezone('utc', now())
);

create index if not exists plannings_start_date_idx on public.plannings (start_date asc);

-- Table: absences
create table if not exists public.absences (
    id uuid primary key default gen_random_uuid(),
    employee text not null,
    team text,
    start_date date not null,
    end_date date,
    reason text,
    created_at timestamptz default timezone('utc', now())
);

create index if not exists absences_start_date_idx on public.absences (start_date asc);

-- Table: resources
create table if not exists public.resources (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    status text default 'disponible',
    next_available date,
    notes text,
    created_at timestamptz default timezone('utc', now())
);

create index if not exists resources_name_idx on public.resources (name asc);

-- Table: time entries for the punch clock
create table if not exists public.time_entries (
    id uuid primary key default gen_random_uuid(),
    employee text not null,
    email text not null,
    type text not null check (type in ('arrivee', 'depart', 'pause', 'retour_pause', 'teletravail')),
    note text,
    timestamp timestamptz not null default timezone('utc', now()),
    created_at timestamptz default timezone('utc', now())
);

create index if not exists time_entries_timestamp_idx on public.time_entries (timestamp desc);
create index if not exists time_entries_email_idx on public.time_entries (email asc);

-- Enable Row Level Security (RLS)
alter table public.news enable row level security;
alter table public.announcements enable row level security;
alter table public.documents enable row level security;
alter table public.reservations enable row level security;
alter table public.tasks enable row level security;
alter table public.plannings enable row level security;
alter table public.absences enable row level security;
alter table public.resources enable row level security;
alter table public.time_entries enable row level security;

-- Policies: allow anon role full access (adjust for production as needed)
create policy if not exists "Allow anon read news" on public.news
    for select using (true);
create policy if not exists "Allow anon insert news" on public.news
    for insert with check (true);
create policy if not exists "Allow anon update news" on public.news
    for update using (true);
create policy if not exists "Allow anon delete news" on public.news
    for delete using (true);

create policy if not exists "Allow anon read announcements" on public.announcements
    for select using (true);
create policy if not exists "Allow anon write announcements" on public.announcements
    for all using (true) with check (true);

create policy if not exists "Allow anon read documents" on public.documents
    for select using (true);
create policy if not exists "Allow anon write documents" on public.documents
    for all using (true) with check (true);

create policy if not exists "Allow anon read reservations" on public.reservations
    for select using (true);
create policy if not exists "Allow anon write reservations" on public.reservations
    for all using (true) with check (true);

create policy if not exists "Allow anon read tasks" on public.tasks
    for select using (true);
create policy if not exists "Allow anon write tasks" on public.tasks
    for all using (true) with check (true);

create policy if not exists "Allow anon read plannings" on public.plannings
    for select using (true);
create policy if not exists "Allow anon write plannings" on public.plannings
    for all using (true) with check (true);

create policy if not exists "Allow anon read absences" on public.absences
    for select using (true);
create policy if not exists "Allow anon write absences" on public.absences
    for all using (true) with check (true);

create policy if not exists "Allow anon read resources" on public.resources
    for select using (true);
create policy if not exists "Allow anon write resources" on public.resources
    for all using (true) with check (true);

create policy if not exists "Allow anon read time entries" on public.time_entries
    for select using (true);
create policy if not exists "Allow anon write time entries" on public.time_entries
    for all using (true) with check (true);

-- Optional helper view for dashboard metrics (counts per table)
create or replace view public.dashboard_metrics as
select
    (select count(*) from public.news) as news_count,
    (select count(*) from public.announcements) as announcements_count,
    (select count(*) from public.documents) as documents_count,
    (select count(*) from public.reservations) as reservations_count;

