-- Reset and seed the intranet schema for Supabase
-- ------------------------------------------------
-- The script is idempotent: it drops any existing objects, recreates the schema,
-- sets up row level security policies, then seeds baseline content so the
-- front-end works immediately after execution.

begin;

-- Required extensions -------------------------------------------------------
create extension if not exists "pgcrypto";
create extension if not exists cron;

-- Tear down existing objects ------------------------------------------------
drop view if exists public.engagement_dashboard cascade;
drop view if exists public.dashboard_metrics cascade;

drop table if exists public.reminder_log cascade;
drop table if exists public.punctuality_metrics cascade;
drop table if exists public.resource_metrics cascade;
drop table if exists public.approval_steps cascade;
drop table if exists public.approval_requests cascade;
drop table if exists public.attachments cascade;
drop table if exists public.messages cascade;
drop table if exists public.comments cascade;
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
    status text default 'en_attente' check (status in ('en_attente', 'approuvee', 'refusee')),
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
    status text default 'ouverte' check (status in ('ouverte', 'en_cours', 'terminee', 'archivee')),
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
    status text default 'en_attente' check (status in ('en_attente', 'approuvee', 'refusee')),
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

create table public.comments (
    id uuid primary key default gen_random_uuid(),
    target_type text not null check (target_type in ('news', 'document')),
    target_id uuid not null,
    author text not null,
    message text not null,
    created_at timestamptz default timezone('utc', now())
);

create index comments_target_idx on public.comments (target_type, target_id, created_at desc);

create table public.messages (
    id uuid primary key default gen_random_uuid(),
    channel text not null default 'general',
    author text not null,
    content text not null,
    created_at timestamptz default timezone('utc', now())
);

create index messages_channel_idx on public.messages (channel, created_at desc);

create table public.attachments (
    id uuid primary key default gen_random_uuid(),
    target_type text not null check (target_type in ('reservation', 'task')),
    target_id uuid not null,
    file_name text not null,
    storage_path text not null,
    file_url text not null,
    uploaded_by text,
    created_at timestamptz default timezone('utc', now())
);

create index attachments_target_idx on public.attachments (target_type, target_id);

create table public.approval_requests (
    id uuid primary key default gen_random_uuid(),
    request_type text not null check (request_type in ('reservation', 'absence')),
    target_id uuid not null,
    requester text,
    status text not null default 'en_attente' check (status in ('en_attente', 'approuvee', 'refusee')),
    approver text,
    decision_note text,
    created_at timestamptz default timezone('utc', now()),
    updated_at timestamptz default timezone('utc', now()),
    constraint approval_requests_unique_target unique (request_type, target_id)
);

create index approval_requests_target_idx on public.approval_requests (request_type, target_id);
create index approval_requests_status_idx on public.approval_requests (status);

create table public.approval_steps (
    id uuid primary key default gen_random_uuid(),
    request_id uuid not null references public.approval_requests(id) on delete cascade,
    step_order integer not null default 1,
    approver text not null,
    status text not null default 'en_attente' check (status in ('en_attente', 'approuvee', 'refusee')),
    decided_at timestamptz,
    note text,
    constraint approval_steps_unique_step unique (request_id, step_order)
);

create index approval_steps_request_idx on public.approval_steps (request_id, step_order);

create table public.resource_metrics (
    resource text primary key,
    upcoming_reservations integer not null default 0,
    last_reservation timestamptz,
    updated_at timestamptz default timezone('utc', now())
);

create table public.punctuality_metrics (
    employee text primary key,
    late_arrivals integer not null default 0,
    last_arrival timestamptz
);

create table public.reminder_log (
    id bigserial primary key,
    reminder_date date not null default current_date,
    payload jsonb not null,
    created_at timestamptz default timezone('utc', now()),
    constraint reminder_log_unique_date unique (reminder_date)
);

-- Automation functions -------------------------------------------------------
create or replace function public.refresh_resource_metrics() returns void language plpgsql as
$$
begin
    delete from public.resource_metrics;
    insert into public.resource_metrics (resource, upcoming_reservations, last_reservation, updated_at)
    select
        resource,
        count(*) filter (where start_time >= timezone('utc', now())),
        max(end_time),
        timezone('utc', now())
    from public.reservations
    group by resource;
end;
$$;

create or replace function public.refresh_resource_metrics_trigger() returns trigger language plpgsql as
$$
begin
    perform public.refresh_resource_metrics();
    return null;
end;
$$;

create or replace function public.track_punctuality_metrics() returns trigger language plpgsql as
$$
begin
    if new.type = 'arrivee' then
        insert into public.punctuality_metrics (employee, late_arrivals, last_arrival)
        values (
            new.employee,
            case when (new.timestamp at time zone 'utc')::time > time '09:05' then 1 else 0 end,
            new.timestamp
        )
        on conflict (employee) do update set
            late_arrivals = public.punctuality_metrics.late_arrivals + case when (new.timestamp at time zone 'utc')::time > time '09:05' then 1 else 0 end,
            last_arrival = greatest(public.punctuality_metrics.last_arrival, new.timestamp);
    end if;
    return new;
end;
$$;

create or replace function public.sync_reservation_workflow() returns trigger language plpgsql as
$$
declare
    v_request_id uuid;
    v_status text;
begin
    v_status := coalesce(new.status, 'en_attente');

    insert into public.approval_requests (request_type, target_id, requester, status, approver, updated_at)
    values ('reservation', new.id, new.team, v_status, 'Gestionnaire des réservations', timezone('utc', now()))
    on conflict (request_type, target_id) do update set
        requester = excluded.requester,
        status = excluded.status,
        updated_at = timezone('utc', now())
    returning approval_requests.id into v_request_id;

    insert into public.approval_steps (request_id, step_order, approver, status, decided_at, note)
    values (
        v_request_id,
        1,
        'Gestionnaire des réservations',
        case when v_status in ('approuvee', 'refusee') then v_status else 'en_attente' end,
        case when v_status in ('approuvee', 'refusee') then timezone('utc', now()) end,
        case when v_status in ('approuvee', 'refusee') then 'Synchronisé avec la réservation' end
    )
    on conflict (request_id, step_order) do update set
        status = excluded.status,
        decided_at = excluded.decided_at,
        note = coalesce(excluded.note, public.approval_steps.note);

    return new;
end;
$$;

create or replace function public.sync_absence_workflow() returns trigger language plpgsql as
$$
declare
    v_request_id uuid;
    v_status text;
begin
    v_status := coalesce(new.status, 'en_attente');

    insert into public.approval_requests (request_type, target_id, requester, status, approver, updated_at)
    values ('absence', new.id, new.employee, v_status, 'Manager RH', timezone('utc', now()))
    on conflict (request_type, target_id) do update set
        requester = excluded.requester,
        status = excluded.status,
        updated_at = timezone('utc', now())
    returning approval_requests.id into v_request_id;

    insert into public.approval_steps (request_id, step_order, approver, status, decided_at, note)
    values (
        v_request_id,
        1,
        'Manager RH',
        case when v_status in ('approuvee', 'refusee') then v_status else 'en_attente' end,
        case when v_status in ('approuvee', 'refusee') then timezone('utc', now()) end,
        case when v_status in ('approuvee', 'refusee') then 'Synchronisé avec la demande' end
    )
    on conflict (request_id, step_order) do update set
        status = excluded.status,
        decided_at = excluded.decided_at,
        note = coalesce(excluded.note, public.approval_steps.note);

    return new;
end;
$$;

create or replace function public.enqueue_daily_reminders() returns void language plpgsql as
$$
declare
    v_tasks_today integer;
    v_reservations_today integer;
begin
    select count(*) into v_tasks_today
    from public.tasks
    where coalesce(status, 'ouverte') <> 'terminee'
      and due_date = current_date;

    select count(*) into v_reservations_today
    from public.reservations
    where start_time::date = current_date;

    insert into public.reminder_log (reminder_date, payload, created_at)
    values (
        current_date,
        jsonb_build_object('type', 'daily_summary', 'tasks_due_today', v_tasks_today, 'reservations_today', v_reservations_today),
        timezone('utc', now())
    )
    on conflict (reminder_date) do update set
        payload = excluded.payload,
        created_at = excluded.created_at;
end;
$$;

-- Triggers -------------------------------------------------------------------
drop trigger if exists reservations_metrics_refresh on public.reservations;
create trigger reservations_metrics_refresh
    after insert or update or delete on public.reservations
    for each statement execute function public.refresh_resource_metrics_trigger();

drop trigger if exists reservations_workflow_sync on public.reservations;
create trigger reservations_workflow_sync
    after insert or update on public.reservations
    for each row execute function public.sync_reservation_workflow();

drop trigger if exists absences_workflow_sync on public.absences;
create trigger absences_workflow_sync
    after insert or update on public.absences
    for each row execute function public.sync_absence_workflow();

drop trigger if exists time_entries_punctuality on public.time_entries;
create trigger time_entries_punctuality
    after insert on public.time_entries
    for each row execute function public.track_punctuality_metrics();

-- Scheduled tasks -----------------------------------------------------------
do $$
begin
    if exists(select 1 from cron.job where jobname = 'daily-reminders') then
        perform cron.unschedule('daily-reminders');
    end if;
end;
$$;

select cron.schedule('daily-reminders', '0 7 * * *', $$select public.enqueue_daily_reminders();$$);

-- Storage configuration -----------------------------------------------------
do $$
begin
    perform storage.create_bucket('intranet-attachments', jsonb_build_object(
        'public', false,
        'file_size_limit', 52428800,
        'allowed_mime_types', array['image/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
        'versioning', true
    ));
exception
    when duplicate_object then
        update storage.buckets
        set versioning = true
        where id = 'intranet-attachments';
end;
$$;

do $$
begin
    perform storage.create_policy(
        name => 'Anon read attachments',
        bucket_id => 'intranet-attachments',
        definition => 'auth.role() = ''anon''',
        action => 'read'
    );
exception
    when unique_violation then null;
end;
$$;

do $$
begin
    perform storage.create_policy(
        name => 'Anon write attachments',
        bucket_id => 'intranet-attachments',
        definition => 'auth.role() = ''anon''',
        action => 'write'
    );
exception
    when unique_violation then null;
end;
$$;

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
alter table public.comments enable row level security;
alter table public.messages enable row level security;
alter table public.attachments enable row level security;
alter table public.approval_requests enable row level security;
alter table public.approval_steps enable row level security;
alter table public.resource_metrics enable row level security;
alter table public.punctuality_metrics enable row level security;
alter table public.reminder_log enable row level security;

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

select public._drop_policy_if_exists('public.comments', 'Allow anon read comments');
create policy "Allow anon read comments" on public.comments for select using (true);
select public._drop_policy_if_exists('public.comments', 'Allow anon write comments');
create policy "Allow anon write comments" on public.comments for all using (true) with check (true);

select public._drop_policy_if_exists('public.messages', 'Allow anon read messages');
create policy "Allow anon read messages" on public.messages for select using (true);
select public._drop_policy_if_exists('public.messages', 'Allow anon write messages');
create policy "Allow anon write messages" on public.messages for all using (true) with check (true);

select public._drop_policy_if_exists('public.attachments', 'Allow anon read attachments');
create policy "Allow anon read attachments" on public.attachments for select using (true);
select public._drop_policy_if_exists('public.attachments', 'Allow anon insert attachments');
create policy "Allow anon insert attachments" on public.attachments for insert with check (true);

select public._drop_policy_if_exists('public.approval_requests', 'Allow anon read approval requests');
create policy "Allow anon read approval requests" on public.approval_requests for select using (true);
select public._drop_policy_if_exists('public.approval_requests', 'Allow anon update approval requests');
create policy "Allow anon update approval requests" on public.approval_requests for update using (true) with check (true);

select public._drop_policy_if_exists('public.approval_steps', 'Allow anon read approval steps');
create policy "Allow anon read approval steps" on public.approval_steps for select using (true);
select public._drop_policy_if_exists('public.approval_steps', 'Allow anon update approval steps');
create policy "Allow anon update approval steps" on public.approval_steps for update using (true) with check (true);

select public._drop_policy_if_exists('public.resource_metrics', 'Allow anon read resource metrics');
create policy "Allow anon read resource metrics" on public.resource_metrics for select using (true);

select public._drop_policy_if_exists('public.punctuality_metrics', 'Allow anon read punctuality metrics');
create policy "Allow anon read punctuality metrics" on public.punctuality_metrics for select using (true);

select public._drop_policy_if_exists('public.reminder_log', 'Allow anon read reminder log');
create policy "Allow anon read reminder log" on public.reminder_log for select using (true);

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

insert into public.reservations (id, resource, team, start_time, end_time, notes, status, created_at)
values
    ('44444444-4444-4444-8444-111111111111', 'Salle Réunion A', 'Commercial', timezone('utc', now()) + interval '1 day', timezone('utc', now()) + interval '1 day 2 hours', 'Présentation client', 'approuvee', timezone('utc', now()) - interval '2 days'),
    ('44444444-4444-4444-8444-222222222222', 'Véhicule utilitaire', 'Maintenance', timezone('utc', now()) + interval '2 days', timezone('utc', now()) + interval '2 days 8 hours', 'Intervention site client', 'en_attente', timezone('utc', now()) - interval '1 day'),
    ('44444444-4444-4444-8444-333333333333', 'Laboratoire 3', 'R&D', timezone('utc', now()) + interval '3 days', timezone('utc', now()) + interval '3 days 4 hours', 'Test chromatographe', 'en_attente', timezone('utc', now()) - interval '12 hours')
on conflict (id) do update set
    resource = excluded.resource,
    team = excluded.team,
    start_time = excluded.start_time,
    end_time = excluded.end_time,
    notes = excluded.notes,
    status = excluded.status,
    created_at = excluded.created_at;

insert into public.tasks (id, title, description, priority, due_date, assigned_to, completed, status, created_at)
values
    ('55555555-5555-4555-8555-111111111111', 'Préparer audit interne', 'Collecter les rapports de contrôle qualité avant audit.', 'haute', current_date + 7, 'Alice Martin', false, 'en_cours', timezone('utc', now()) - interval '4 days'),
    ('55555555-5555-4555-8555-222222222222', 'Mettre à jour le manuel HSE', 'Intégrer les nouvelles consignes incendie.', 'moyenne', current_date + 14, 'Bruno Leroy', false, 'ouverte', timezone('utc', now()) - interval '2 days'),
    ('55555555-5555-4555-8555-333333333333', 'Former nouvelle recrue', 'Formation chromatographie niveau 1.', 'normale', current_date + 3, 'Claire Dubois', false, 'ouverte', timezone('utc', now()) - interval '1 day')
on conflict (id) do update set
    title = excluded.title,
    description = excluded.description,
    priority = excluded.priority,
    due_date = excluded.due_date,
    assigned_to = excluded.assigned_to,
    completed = excluded.completed,
    status = excluded.status,
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

insert into public.absences (id, employee, team, start_date, end_date, reason, status, created_at)
values
    ('77777777-7777-4777-8777-111111111111', 'Damien Roussel', 'Production', current_date - 1, current_date + 1, 'Congés payés', 'approuvee', timezone('utc', now()) - interval '4 days'),
    ('77777777-7777-4777-8777-222222222222', 'Eva Lambert', 'R&D', current_date + 3, current_date + 5, 'Formation externe', 'en_attente', timezone('utc', now()) - interval '2 days'),
    ('77777777-7777-4777-8777-333333333333', 'Farid Benali', 'Maintenance', current_date + 7, current_date + 7, 'RDV médical', 'en_attente', timezone('utc', now()) - interval '12 hours')
on conflict (id) do update set
    employee = excluded.employee,
    team = excluded.team,
    start_date = excluded.start_date,
    end_date = excluded.end_date,
    reason = excluded.reason,
    status = excluded.status,
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

insert into public.comments (id, target_type, target_id, author, message, created_at)
values
    ('aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'news', '11111111-1111-4111-8111-111111111111', 'Lucie Martin', 'Bravo pour la mise en ligne du nouvel intranet !', timezone('utc', now()) - interval '3 hours'),
    ('aaaaaaa2-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'document', '33333333-3333-4333-8333-111111111111', 'Equipe HSE', 'Document bien reçu, merci pour la mise à jour.', timezone('utc', now()) - interval '20 hours')
on conflict (id) do update set
    target_type = excluded.target_type,
    target_id = excluded.target_id,
    author = excluded.author,
    message = excluded.message,
    created_at = excluded.created_at;

insert into public.messages (id, channel, author, content, created_at)
values
    ('bbbbbbb1-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'general', 'Sophie', 'Bonjour à tous, pensez à renseigner vos réservations de matériel.', timezone('utc', now()) - interval '2 hours'),
    ('bbbbbbb2-bbbb-4bbb-8bbb-bbbbbbbbbbb2', 'production', 'Damien', 'Maintenance préventive prévue demain matin sur la ligne B.', timezone('utc', now()) - interval '1 hour')
on conflict (id) do update set
    channel = excluded.channel,
    author = excluded.author,
    content = excluded.content,
    created_at = excluded.created_at;

insert into public.attachments (id, target_type, target_id, file_name, storage_path, file_url, uploaded_by, created_at)
values
    ('ccccccc1-cccc-4ccc-8ccc-ccccccccccc1', 'reservation', '44444444-4444-4444-8444-111111111111', 'ordre-du-jour.pdf', 'reservation/ordre-du-jour.pdf', 'https://example.com/storage/reservation/ordre-du-jour.pdf', 'Alice Martin', timezone('utc', now()) - interval '1 day'),
    ('ccccccc2-cccc-4ccc-8ccc-ccccccccccc2', 'task', '55555555-5555-4555-8555-111111111111', 'checklist-audit.xlsx', 'task/checklist-audit.xlsx', 'https://example.com/storage/task/checklist-audit.xlsx', 'Service Qualité', timezone('utc', now()) - interval '3 days')
on conflict (id) do update set
    target_type = excluded.target_type,
    target_id = excluded.target_id,
    file_name = excluded.file_name,
    storage_path = excluded.storage_path,
    file_url = excluded.file_url,
    uploaded_by = excluded.uploaded_by,
    created_at = excluded.created_at;

insert into public.approval_requests (id, request_type, target_id, requester, status, approver, decision_note, created_at, updated_at)
values
    ('ddddddd1-dddd-4ddd-8ddd-ddddddddddd1', 'reservation', '44444444-4444-4444-8444-111111111111', 'Alice Martin', 'approuvee', 'Direction Commerciale', 'Validé pour le client X', timezone('utc', now()) - interval '2 days', timezone('utc', now()) - interval '2 days'),
    ('ddddddd2-dddd-4ddd-8ddd-ddddddddddd2', 'absence', '77777777-7777-4777-8777-222222222222', 'Eva Lambert', 'en_attente', 'Manager R&D', null, timezone('utc', now()) - interval '1 day', timezone('utc', now()) - interval '1 day')
on conflict (id) do update set
    request_type = excluded.request_type,
    target_id = excluded.target_id,
    requester = excluded.requester,
    status = excluded.status,
    approver = excluded.approver,
    decision_note = excluded.decision_note,
    created_at = excluded.created_at,
    updated_at = excluded.updated_at;

insert into public.approval_steps (id, request_id, step_order, approver, status, decided_at, note)
values
    ('eeeeeee1-eeee-4eee-8eee-eeeeeeeeeee1', 'ddddddd1-dddd-4ddd-8ddd-ddddddddddd1', 1, 'Direction Commerciale', 'approuvee', timezone('utc', now()) - interval '2 days', 'Validation effectuée'),
    ('eeeeeee2-eeee-4eee-8eee-eeeeeeeeeee2', 'ddddddd2-dddd-4ddd-8ddd-ddddddddddd2', 1, 'Manager R&D', 'en_attente', null, null)
on conflict (id) do update set
    request_id = excluded.request_id,
    step_order = excluded.step_order,
    approver = excluded.approver,
    status = excluded.status,
    decided_at = excluded.decided_at,
    note = excluded.note;

insert into public.resource_metrics (resource, upcoming_reservations, last_reservation, updated_at)
values
    ('Salle Réunion A', 1, timezone('utc', now()) + interval '1 day', timezone('utc', now()) - interval '1 hour'),
    ('Véhicule utilitaire', 1, timezone('utc', now()) + interval '2 days', timezone('utc', now()) - interval '30 minutes')
on conflict (resource) do update set
    upcoming_reservations = excluded.upcoming_reservations,
    last_reservation = excluded.last_reservation,
    updated_at = excluded.updated_at;

insert into public.punctuality_metrics (employee, late_arrivals, last_arrival)
values
    ('Alice Martin', 0, timezone('utc', now()) - interval '6 hours'),
    ('Bruno Leroy', 1, timezone('utc', now()) - interval '2 hours')
on conflict (employee) do update set
    late_arrivals = excluded.late_arrivals,
    last_arrival = excluded.last_arrival;

insert into public.reminder_log (id, reminder_date, payload, created_at)
values
    (1, current_date - 1, jsonb_build_object('type', 'daily_summary', 'tasks_pending', 3, 'reservations_today', 2), timezone('utc', now()) - interval '1 day')
on conflict (id) do update set
    reminder_date = excluded.reminder_date,
    payload = excluded.payload,
    created_at = excluded.created_at;

-- Helper view ---------------------------------------------------------------
create or replace view public.dashboard_metrics as
select
    (select count(*) from public.news) as news_count,
    (select count(*) from public.announcements) as announcements_count,
    (select count(*) from public.documents) as documents_count,
    (select count(*) from public.reservations) as reservations_count,
    (select count(*) from public.tasks where coalesce(status, 'ouverte') <> 'terminee') as open_tasks,
    (select count(*) from public.approval_requests where status = 'en_attente') as pending_approvals,
    (select count(*) from public.messages where channel = 'general') as general_messages;

create or replace view public.engagement_dashboard as
select
    (select avg(upcoming_reservations) from public.resource_metrics) as avg_reservations_per_resource,
    (select coalesce(sum(late_arrivals), 0) from public.punctuality_metrics) as total_late_arrivals,
    (select count(*) from public.comments) as total_comments,
    (select count(*) from public.attachments) as total_attachments,
    (select jsonb_agg(row_to_json(r)) from (
        select resource, upcoming_reservations, last_reservation from public.resource_metrics order by upcoming_reservations desc limit 5
    ) r) as top_resources,
    (select jsonb_agg(row_to_json(a)) from (
        select request_type, status, count(*) as total
        from public.approval_requests
        group by request_type, status
        order by request_type, status
    ) a) as approval_breakdown;

-- Clean up helper function --------------------------------------------------
drop function if exists public._drop_policy_if_exists(regclass, text);

commit;
