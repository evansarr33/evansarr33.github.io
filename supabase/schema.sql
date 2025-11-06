-- Reset and seed the intranet schema for Supabase
-- ------------------------------------------------
-- The script is idempotent: it drops any existing objects, recreates the schema,
-- sets up row level security policies, then seeds baseline content so the
-- front-end works immediately after execution.

begin;

-- Required extensions -------------------------------------------------------
create extension if not exists "pgcrypto";

-- Tear down existing objects ------------------------------------------------
drop view if exists public.dashboard_metrics cascade;

drop table if exists public.time_entries cascade;
drop table if exists public.resources cascade;
drop table if exists public.absences cascade;
drop table if exists public.plannings cascade;
drop table if exists public.tasks cascade;
drop table if exists public.reservations cascade;
drop table if exists public.documents cascade;
drop table if exists public.announcements cascade;
drop table if exists public.news cascade;

-- Tables --------------------------------------------------------------------
create table public.news (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    content text not null,
    author text,
    category text default 'Général',
    published_at timestamptz default timezone('utc', now()),
    created_at timestamptz default timezone('utc', now()),
    updated_at timestamptz default timezone('utc', now())
);

create index news_published_at_idx on public.news (published_at desc);

create table public.announcements (
    id uuid primary key default gen_random_uuid(),
    title text,
    message text not null,
    author text,
    tags text,
    created_at timestamptz default timezone('utc', now())
);

create index announcements_created_at_idx on public.announcements (created_at desc);

create table public.documents (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    description text,
    category text,
    url text not null,
    created_at timestamptz default timezone('utc', now()),
    updated_at timestamptz default timezone('utc', now())
);

create index documents_updated_at_idx on public.documents (coalesce(updated_at, created_at));

create table public.reservations (
    id uuid primary key default gen_random_uuid(),
    resource text not null,
    team text,
    start_time timestamptz not null,
    end_time timestamptz not null,
    notes text,
    created_at timestamptz default timezone('utc', now())
);

create index reservations_start_time_idx on public.reservations (start_time);

create table public.tasks (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    description text,
    priority text default 'normale' check (priority in ('basse', 'normale', 'moyenne', 'haute')),
    due_date date,
    assigned_to text,
    completed boolean default false,
    created_at timestamptz default timezone('utc', now())
);

create index tasks_due_date_idx on public.tasks (due_date asc nulls last);

create table public.plannings (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    team text,
    start_date date not null,
    end_date date,
    location text,
    description text,
    created_at timestamptz default timezone('utc', now())
);

create index plannings_start_date_idx on public.plannings (start_date);

create table public.absences (
    id uuid primary key default gen_random_uuid(),
    employee text not null,
    team text,
    start_date date not null,
    end_date date,
    reason text,
    created_at timestamptz default timezone('utc', now())
);

create index absences_start_date_idx on public.absences (start_date);

create table public.resources (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    status text default 'disponible',
    next_available date,
    notes text,
    created_at timestamptz default timezone('utc', now())
);

create index resources_name_idx on public.resources (name);

create table public.time_entries (
    id uuid primary key default gen_random_uuid(),
    employee text not null,
    email text not null,
    type text not null check (type in ('arrivee', 'depart', 'pause', 'retour_pause', 'teletravail')),
    note text,
    timestamp timestamptz not null default timezone('utc', now()),
    created_at timestamptz default timezone('utc', now())
);

create index time_entries_timestamp_idx on public.time_entries (timestamp desc);
create index time_entries_email_idx on public.time_entries (email);

-- Row Level Security --------------------------------------------------------
alter table public.news enable row level security;
alter table public.announcements enable row level security;
alter table public.documents enable row level security;
alter table public.reservations enable row level security;
alter table public.tasks enable row level security;
alter table public.plannings enable row level security;
alter table public.absences enable row level security;
alter table public.resources enable row level security;
alter table public.time_entries enable row level security;

-- Helper procedure to drop a policy if it exists
create or replace function public._drop_policy_if_exists(
    p_table regclass,
    p_policy text
) returns void language plpgsql as
$$
begin
    if exists (
        select 1
        from pg_policy
        where polname = p_policy
          and polrelid = p_table
    ) then
        execute format('drop policy %I on %s', p_policy, p_table);
    end if;
end;
$$;

-- Policies ------------------------------------------------------------------
select public._drop_policy_if_exists('public.news', 'Allow anon read news');
create policy "Allow anon read news" on public.news for select using (true);
select public._drop_policy_if_exists('public.news', 'Allow anon insert news');
create policy "Allow anon insert news" on public.news for insert with check (true);
select public._drop_policy_if_exists('public.news', 'Allow anon update news');
create policy "Allow anon update news" on public.news for update using (true);
select public._drop_policy_if_exists('public.news', 'Allow anon delete news');
create policy "Allow anon delete news" on public.news for delete using (true);

select public._drop_policy_if_exists('public.announcements', 'Allow anon read announcements');
create policy "Allow anon read announcements" on public.announcements for select using (true);
select public._drop_policy_if_exists('public.announcements', 'Allow anon write announcements');
create policy "Allow anon write announcements" on public.announcements for all using (true) with check (true);

select public._drop_policy_if_exists('public.documents', 'Allow anon read documents');
create policy "Allow anon read documents" on public.documents for select using (true);
select public._drop_policy_if_exists('public.documents', 'Allow anon write documents');
create policy "Allow anon write documents" on public.documents for all using (true) with check (true);

select public._drop_policy_if_exists('public.reservations', 'Allow anon read reservations');
create policy "Allow anon read reservations" on public.reservations for select using (true);
select public._drop_policy_if_exists('public.reservations', 'Allow anon write reservations');
create policy "Allow anon write reservations" on public.reservations for all using (true) with check (true);

select public._drop_policy_if_exists('public.tasks', 'Allow anon read tasks');
create policy "Allow anon read tasks" on public.tasks for select using (true);
select public._drop_policy_if_exists('public.tasks', 'Allow anon write tasks');
create policy "Allow anon write tasks" on public.tasks for all using (true) with check (true);

select public._drop_policy_if_exists('public.plannings', 'Allow anon read plannings');
create policy "Allow anon read plannings" on public.plannings for select using (true);
select public._drop_policy_if_exists('public.plannings', 'Allow anon write plannings');
create policy "Allow anon write plannings" on public.plannings for all using (true) with check (true);

select public._drop_policy_if_exists('public.absences', 'Allow anon read absences');
create policy "Allow anon read absences" on public.absences for select using (true);
select public._drop_policy_if_exists('public.absences', 'Allow anon write absences');
create policy "Allow anon write absences" on public.absences for all using (true) with check (true);

select public._drop_policy_if_exists('public.resources', 'Allow anon read resources');
create policy "Allow anon read resources" on public.resources for select using (true);
select public._drop_policy_if_exists('public.resources', 'Allow anon write resources');
create policy "Allow anon write resources" on public.resources for all using (true) with check (true);

select public._drop_policy_if_exists('public.time_entries', 'Allow anon read time entries');
create policy "Allow anon read time entries" on public.time_entries for select using (true);
select public._drop_policy_if_exists('public.time_entries', 'Allow anon write time entries');
create policy "Allow anon write time entries" on public.time_entries for all using (true) with check (true);

-- Seed data -----------------------------------------------------------------
insert into public.news (id, title, content, author, category, published_at, created_at, updated_at)
values
    ('11111111-1111-4111-8111-111111111111', 'Bienvenue sur le nouvel intranet', 'Découvrez les nouvelles fonctionnalités : actualités, documents partagés et gestion des ressources.', 'Service Communication', 'Général', timezone('utc', now()) - interval '2 days', timezone('utc', now()) - interval '2 days', timezone('utc', now()) - interval '1 day'),
    ('11111111-1111-4111-8111-222222222222', 'Nouvelle machine Chromatotec', 'La nouvelle unité de chromatographie est installée au laboratoire 2. Les formations sont prévues la semaine prochaine.', 'Equipe Technique', 'Production', timezone('utc', now()) - interval '1 day', timezone('utc', now()) - interval '1 day', timezone('utc', now()) - interval '12 hours'),
    ('11111111-1111-4111-8111-333333333333', 'Afterwork mensuel', 'Rendez-vous jeudi prochain à 18h dans la salle de pause pour l''afterwork mensuel.', 'Comité Social', 'Événements', timezone('utc', now()), timezone('utc', now()), timezone('utc', now()))
on conflict (id) do update set
    title = excluded.title,
    content = excluded.content,
    author = excluded.author,
    category = excluded.category,
    published_at = excluded.published_at,
    updated_at = excluded.updated_at;

insert into public.announcements (id, title, message, author, tags, created_at)
values
    ('22222222-2222-4222-8222-111111111111', 'Maintenance réseau', 'Maintenance planifiée mercredi 22h-23h, coupure possible.', 'IT', 'maintenance,reseau', timezone('utc', now()) - interval '3 days'),
    ('22222222-2222-4222-8222-222222222222', 'Collecte de déchets chimiques', 'Merci de déposer les déchets chimiques dans les conteneurs rouges avant vendredi.', 'HSE', 'securite,laboratoire', timezone('utc', now()) - interval '1 day'),
    ('22222222-2222-4222-8222-333333333333', 'Formation ISO 9001', 'Inscrivez-vous à la session de recyclage ISO 9001 via le formulaire dédié.', 'Qualité', 'formation,qualite', timezone('utc', now()) - interval '6 hours')
on conflict (id) do update set
    title = excluded.title,
    message = excluded.message,
    author = excluded.author,
    tags = excluded.tags,
    created_at = excluded.created_at;

insert into public.documents (id, title, description, category, url, created_at, updated_at)
values
    ('33333333-3333-4333-8333-111111111111', 'Guide sécurité laboratoire', 'Procédures de sécurité et fiches réflexes.', 'Sécurité', 'https://example.com/documents/guide-securite.pdf', timezone('utc', now()) - interval '5 days', timezone('utc', now()) - interval '1 day'),
    ('33333333-3333-4333-8333-222222222222', 'Planning formations Q4', 'Toutes les sessions de formation prévues pour le trimestre.', 'Ressources humaines', 'https://example.com/documents/planning-formations.pdf', timezone('utc', now()) - interval '10 days', timezone('utc', now()) - interval '2 days'),
    ('33333333-3333-4333-8333-333333333333', 'Catalogue produits 2024', 'Dernière version du catalogue produits Chromatotec.', 'Commercial', 'https://example.com/documents/catalogue-2024.pdf', timezone('utc', now()) - interval '15 days', timezone('utc', now()) - interval '7 days')
on conflict (id) do update set
    title = excluded.title,
    description = excluded.description,
    category = excluded.category,
    url = excluded.url,
    created_at = excluded.created_at,
    updated_at = excluded.updated_at;

insert into public.reservations (id, resource, team, start_time, end_time, notes, created_at)
values
    ('44444444-4444-4444-8444-111111111111', 'Salle Réunion A', 'Commercial', timezone('utc', now()) + interval '1 day', timezone('utc', now()) + interval '1 day 2 hours', 'Présentation client', timezone('utc', now()) - interval '2 days'),
    ('44444444-4444-4444-8444-222222222222', 'Véhicule utilitaire', 'Maintenance', timezone('utc', now()) + interval '2 days', timezone('utc', now()) + interval '2 days 8 hours', 'Intervention site client', timezone('utc', now()) - interval '1 day'),
    ('44444444-4444-4444-8444-333333333333', 'Laboratoire 3', 'R&D', timezone('utc', now()) + interval '3 days', timezone('utc', now()) + interval '3 days 4 hours', 'Test chromatographe', timezone('utc', now()) - interval '12 hours')
on conflict (id) do update set
    resource = excluded.resource,
    team = excluded.team,
    start_time = excluded.start_time,
    end_time = excluded.end_time,
    notes = excluded.notes,
    created_at = excluded.created_at;

insert into public.tasks (id, title, description, priority, due_date, assigned_to, completed, created_at)
values
    ('55555555-5555-4555-8555-111111111111', 'Préparer audit interne', 'Collecter les rapports de contrôle qualité avant audit.', 'haute', current_date + 7, 'Alice Martin', false, timezone('utc', now()) - interval '4 days'),
    ('55555555-5555-4555-8555-222222222222', 'Mettre à jour le manuel HSE', 'Intégrer les nouvelles consignes incendie.', 'moyenne', current_date + 14, 'Bruno Leroy', false, timezone('utc', now()) - interval '2 days'),
    ('55555555-5555-4555-8555-333333333333', 'Former nouvelle recrue', 'Formation chromatographie niveau 1.', 'normale', current_date + 3, 'Claire Dubois', false, timezone('utc', now()) - interval '1 day')
on conflict (id) do update set
    title = excluded.title,
    description = excluded.description,
    priority = excluded.priority,
    due_date = excluded.due_date,
    assigned_to = excluded.assigned_to,
    completed = excluded.completed,
    created_at = excluded.created_at;

insert into public.plannings (id, title, team, start_date, end_date, location, description, created_at)
values
    ('66666666-6666-4666-8666-111111111111', 'Rotation équipe production', 'Production', current_date, current_date + 6, 'Atelier 1', 'Rotation hebdomadaire des équipes', timezone('utc', now()) - interval '3 days'),
    ('66666666-6666-4666-8666-222222222222', 'Campagne de maintenance', 'Maintenance', current_date + 7, current_date + 14, 'Site client A', 'Maintenance préventive des installations', timezone('utc', now()) - interval '1 day'),
    ('66666666-6666-4666-8666-333333333333', 'Semaine innovation', 'R&D', current_date + 14, current_date + 18, 'Salle innovation', 'Ateliers autour des nouveaux capteurs', timezone('utc', now()) - interval '6 hours')
on conflict (id) do update set
    title = excluded.title,
    team = excluded.team,
    start_date = excluded.start_date,
    end_date = excluded.end_date,
    location = excluded.location,
    description = excluded.description,
    created_at = excluded.created_at;

insert into public.absences (id, employee, team, start_date, end_date, reason, created_at)
values
    ('77777777-7777-4777-8777-111111111111', 'Damien Roussel', 'Production', current_date - 1, current_date + 1, 'Congés payés', timezone('utc', now()) - interval '4 days'),
    ('77777777-7777-4777-8777-222222222222', 'Eva Lambert', 'R&D', current_date + 3, current_date + 5, 'Formation externe', timezone('utc', now()) - interval '2 days'),
    ('77777777-7777-4777-8777-333333333333', 'Farid Benali', 'Maintenance', current_date + 7, current_date + 7, 'RDV médical', timezone('utc', now()) - interval '12 hours')
on conflict (id) do update set
    employee = excluded.employee,
    team = excluded.team,
    start_date = excluded.start_date,
    end_date = excluded.end_date,
    reason = excluded.reason,
    created_at = excluded.created_at;

insert into public.resources (id, name, status, next_available, notes, created_at)
values
    ('88888888-8888-4888-8888-111111111111', 'Chromatographe A', 'en maintenance', current_date + 2, 'Calibration en cours', timezone('utc', now()) - interval '5 days'),
    ('88888888-8888-4888-8888-222222222222', 'Salle de réunion B', 'réservée', current_date + 1, 'Réservée pour réunion QSE', timezone('utc', now()) - interval '2 days'),
    ('88888888-8888-4888-8888-333333333333', 'Véhicule utilitaire 2', 'disponible', current_date, null, timezone('utc', now()) - interval '1 day')
on conflict (id) do update set
    name = excluded.name,
    status = excluded.status,
    next_available = excluded.next_available,
    notes = excluded.notes,
    created_at = excluded.created_at;

insert into public.time_entries (id, employee, email, type, note, timestamp, created_at)
values
    ('99999999-9999-4999-8999-111111111111', 'Alice Martin', 'alice.martin@example.com', 'arrivee', 'Arrivée au laboratoire', timezone('utc', now()) - interval '6 hours', timezone('utc', now()) - interval '6 hours'),
    ('99999999-9999-4999-8999-222222222222', 'Alice Martin', 'alice.martin@example.com', 'depart', 'Fin de journée', timezone('utc', now()) - interval '30 minutes', timezone('utc', now()) - interval '30 minutes'),
    ('99999999-9999-4999-8999-333333333333', 'Bruno Leroy', 'bruno.leroy@example.com', 'arrivee', 'Intervention maintenance', timezone('utc', now()) - interval '2 hours', timezone('utc', now()) - interval '2 hours'),
    ('99999999-9999-4999-8999-444444444444', 'Claire Dubois', 'claire.dubois@example.com', 'teletravail', 'Journée en télétravail', timezone('utc', now()) - interval '1 day', timezone('utc', now()) - interval '1 day')
on conflict (id) do update set
    employee = excluded.employee,
    email = excluded.email,
    type = excluded.type,
    note = excluded.note,
    timestamp = excluded.timestamp,
    created_at = excluded.created_at;

-- Helper view ---------------------------------------------------------------
create or replace view public.dashboard_metrics as
select
    (select count(*) from public.news) as news_count,
    (select count(*) from public.announcements) as announcements_count,
    (select count(*) from public.documents) as documents_count,
    (select count(*) from public.reservations) as reservations_count;

-- Clean up helper function --------------------------------------------------
drop function if exists public._drop_policy_if_exists(regclass, text);

commit;
