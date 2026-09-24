-- ==============================================================================
-- NUESTRO HOGAR — INSTALACIÓN COMPLETA DE BASE DE DATOS (SUPABASE)
-- ==============================================================================
-- Ejecuta este script completo en el SQL Editor de tu proyecto Supabase:
-- https://supabase.com/dashboard/project/_/sql
-- ==============================================================================

-- 1. Extensiones requeridas
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- Función para actualizar updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ------------------------------------------------------------------------------
-- 2. TABLAS BASE
-- ------------------------------------------------------------------------------

-- Familias (Tenant Principal)
create table if not exists families (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Nuestra Familia',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists tr_families_updated_at on families;
create trigger tr_families_updated_at
before update on families
for each row execute function update_updated_at_column();

-- Perfiles de Adultos (Co-administradores)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  family_id uuid not null references families(id) on delete cascade,
  email text not null,
  name text not null,
  role text not null default 'FAMILY_ADULT' check (role in ('FAMILY_ADULT', 'SUPER_ADMIN')),
  relationship text not null check (relationship in ('mama', 'papa')),
  member_id text not null check (member_id in ('mama', 'papa')),
  avatar_color text not null default '#ec4899',
  avatar_emoji text not null default '🌸',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists tr_profiles_updated_at on profiles;
create trigger tr_profiles_updated_at
before update on profiles
for each row execute function update_updated_at_column();

create index if not exists idx_profiles_family_id on profiles(family_id);

-- Invitaciones temporales para Coadministrador (Vínculo seguro)
create table if not exists co_admin_invites (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  created_by_user_id uuid not null references profiles(id),
  target_relationship text not null check (target_relationship in ('mama', 'papa')),
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  used_by_user_id uuid references profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_co_admin_invites_token on co_admin_invites(token_hash);
create index if not exists idx_co_admin_invites_family on co_admin_invites(family_id);

-- Directorio de Integrantes (Adultos y Niños Dependientes)
create table if not exists family_members (
  id text not null,
  family_id uuid not null references families(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  name text not null,
  role text not null check (role in ('adult', 'child')),
  relationship text not null,
  age integer,
  birth_date text,
  avatar_color text not null default '#3b82f6',
  avatar_emoji text not null default '⭐',
  points integer not null default 0,
  notes text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (family_id, id)
);

drop trigger if exists tr_family_members_updated_at on family_members;
create trigger tr_family_members_updated_at
before update on family_members
for each row execute function update_updated_at_column();

-- Tareas
create table if not exists tasks (
  id text not null,
  family_id uuid not null references families(id) on delete cascade,
  title text not null,
  description text,
  assigned_to text not null,
  category_key text not null default 'other',
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed')),
  due_date text,
  created_by text not null,
  created_by_user_id uuid references profiles(id),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (family_id, id)
);

drop trigger if exists tr_tasks_updated_at on tasks;
create trigger tr_tasks_updated_at
before update on tasks
for each row execute function update_updated_at_column();

create index if not exists idx_tasks_family_id on tasks(family_id);

-- Calendario y Eventos
create table if not exists calendar_events (
  id text not null,
  family_id uuid not null references families(id) on delete cascade,
  title text not null,
  description text,
  date text not null,
  time text,
  category_key text not null default 'other',
  responsible_id text not null default 'family',
  is_all_day boolean not null default false,
  created_by text not null,
  created_by_user_id uuid references profiles(id),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (family_id, id)
);

drop trigger if exists tr_calendar_events_updated_at on calendar_events;
create trigger tr_calendar_events_updated_at
before update on calendar_events
for each row execute function update_updated_at_column();

create index if not exists idx_calendar_events_family_id on calendar_events(family_id);

-- Hábitos ("Lo Mío + Lo Nuestro")
create table if not exists habits (
  id text not null,
  family_id uuid not null references families(id) on delete cascade,
  title text not null,
  type text not null default 'personal' check (type in ('personal', 'family', 'child', 'couple')),
  category text not null default 'wellness',
  member_id text,
  child_id text,
  is_private boolean not null default false,
  active boolean not null default true,
  reminder_enabled boolean not null default false,
  reminder_time text,
  frequency text not null default 'daily',
  custom_days jsonb not null default '[]'::jsonb,
  points integer not null default 0,
  completed_dates jsonb not null default '[]'::jsonb,
  created_by_user_id uuid references profiles(id),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (family_id, id)
);

drop trigger if exists tr_habits_updated_at on habits;
create trigger tr_habits_updated_at
before update on habits
for each row execute function update_updated_at_column();

create index if not exists idx_habits_family_id on habits(family_id);

-- Finanzas: Ingresos
create table if not exists finances_incomes (
  id text not null,
  family_id uuid not null references families(id) on delete cascade,
  source_key text not null,
  description text not null,
  amount numeric(14, 2) not null,
  date text not null,
  responsible_id text not null,
  is_recurring boolean not null default false,
  frequency text,
  scope text not null default 'family' check (scope in ('family', 'personal')),
  created_by_user_id uuid references profiles(id),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (family_id, id)
);

drop trigger if exists tr_finances_incomes_updated_at on finances_incomes;
create trigger tr_finances_incomes_updated_at
before update on finances_incomes
for each row execute function update_updated_at_column();

-- Finanzas: Gastos
create table if not exists finances_expenses (
  id text not null,
  family_id uuid not null references families(id) on delete cascade,
  description text not null,
  amount numeric(14, 2) not null,
  date text not null,
  category_key text not null,
  responsible_id text not null,
  payment_method text not null default 'debit',
  is_recurring boolean not null default false,
  scope text not null default 'family' check (scope in ('family', 'personal')),
  created_by_user_id uuid references profiles(id),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (family_id, id)
);

drop trigger if exists tr_finances_expenses_updated_at on finances_expenses;
create trigger tr_finances_expenses_updated_at
before update on finances_expenses
for each row execute function update_updated_at_column();

-- Finanzas: Cuentas
create table if not exists finances_bills (
  id text not null,
  family_id uuid not null references families(id) on delete cascade,
  name text not null,
  amount numeric(14, 2) not null,
  due_date text not null,
  category_key text not null,
  responsible_id text not null,
  recurrence text not null default 'monthly',
  status text not null default 'pending' check (status in ('pending', 'paid', 'overdue')),
  paid_date text,
  scope text not null default 'family' check (scope in ('family', 'personal')),
  created_by_user_id uuid references profiles(id),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (family_id, id)
);

drop trigger if exists tr_finances_bills_updated_at on finances_bills;
create trigger tr_finances_bills_updated_at
before update on finances_bills
for each row execute function update_updated_at_column();

-- Finanzas: Deudas
create table if not exists finances_debts (
  id text not null,
  family_id uuid not null references families(id) on delete cascade,
  name text not null,
  creditor text not null,
  original_amount numeric(14, 2) not null,
  pending_balance numeric(14, 2) not null,
  installment_amount numeric(14, 2) not null,
  payment_day integer not null,
  frequency text not null default 'monthly',
  responsible_id text not null,
  notes text,
  scope text not null default 'family' check (scope in ('family', 'personal')),
  created_by_user_id uuid references profiles(id),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (family_id, id)
);

drop trigger if exists tr_finances_debts_updated_at on finances_debts;
create trigger tr_finances_debts_updated_at
before update on finances_debts
for each row execute function update_updated_at_column();

-- Finanzas: Presupuestos
create table if not exists finances_budgets (
  id text not null,
  family_id uuid not null references families(id) on delete cascade,
  category_key text not null,
  monthly_limit numeric(14, 2) not null,
  responsible_id text not null default 'family',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (family_id, id)
);

drop trigger if exists tr_finances_budgets_updated_at on finances_budgets;
create trigger tr_finances_budgets_updated_at
before update on finances_budgets
for each row execute function update_updated_at_column();

-- Finanzas: Metas
create table if not exists finances_goals (
  id text not null,
  family_id uuid not null references families(id) on delete cascade,
  name text not null,
  target_amount numeric(14, 2) not null,
  current_amount numeric(14, 2) not null default 0,
  target_date text not null,
  category text not null default 'family',
  icon text not null default '🎯',
  responsible_id text not null default 'family',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (family_id, id)
);

drop trigger if exists tr_finances_goals_updated_at on finances_goals;
create trigger tr_finances_goals_updated_at
before update on finances_goals
for each row execute function update_updated_at_column();

-- Salud Familiar
create table if not exists health_records (
  id text not null,
  family_id uuid not null references families(id) on delete cascade,
  record_type text not null check (record_type in ('appointment', 'medication', 'dose_log', 'pediatric_query', 'vaccine')),
  member_id text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (family_id, id)
);

drop trigger if exists tr_health_records_updated_at on health_records;
create trigger tr_health_records_updated_at
before update on health_records
for each row execute function update_updated_at_column();

create index if not exists idx_health_records_family_id on health_records(family_id);

-- Pareja y Cuqui Time
create table if not exists couple_records (
  id text not null,
  family_id uuid not null references families(id) on delete cascade,
  item_type text not null check (item_type in (
    'check_in', 'conversation', 'date', 'gesture', 'agreement', 'spiritual', 'cuqui_time', 'memory'
  )),
  data jsonb not null default '{}'::jsonb,
  created_by_user_id uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (family_id, id)
);

drop trigger if exists tr_couple_records_updated_at on couple_records;
create trigger tr_couple_records_updated_at
before update on couple_records
for each row execute function update_updated_at_column();

create index if not exists idx_couple_records_family_id on couple_records(family_id);

-- Hogar
create table if not exists home_records (
  id text not null,
  family_id uuid not null references families(id) on delete cascade,
  record_type text not null check (record_type in ('shopping', 'cleaning', 'maintenance', 'reset_mission')),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (family_id, id)
);

drop trigger if exists tr_home_records_updated_at on home_records;
create trigger tr_home_records_updated_at
before update on home_records
for each row execute function update_updated_at_column();

-- Recompensas y Puntos
create table if not exists rewards (
  id text not null,
  family_id uuid not null references families(id) on delete cascade,
  title text not null,
  description text,
  points_cost integer not null,
  category text not null default 'special',
  icon text not null default '🎁',
  active boolean not null default true,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (family_id, id)
);

drop trigger if exists tr_rewards_updated_at on rewards;
create trigger tr_rewards_updated_at
before update on rewards
for each row execute function update_updated_at_column();

create table if not exists points_history (
  id text not null,
  family_id uuid not null references families(id) on delete cascade,
  child_id text not null,
  points integer not null,
  reason text not null,
  date text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (family_id, id)
);

-- Notificaciones Multiusuario
create table if not exists notifications (
  id text not null,
  family_id uuid not null references families(id) on delete cascade,
  target_user_id uuid references profiles(id),
  target_member_id text,
  created_by_user_id uuid references profiles(id),
  title text not null,
  body text not null,
  category text not null default 'general',
  is_discrete boolean not null default false,
  trigger_timestamp timestamptz,
  completed boolean not null default false,
  read boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (family_id, id)
);

drop trigger if exists tr_notifications_updated_at on notifications;
create trigger tr_notifications_updated_at
before update on notifications
for each row execute function update_updated_at_column();

create index if not exists idx_notifications_family_id on notifications(family_id);

-- Configuración y Temas
create table if not exists app_customizations (
  family_id uuid primary key references families(id) on delete cascade,
  config jsonb not null default '{}'::jsonb,
  theme_preferences jsonb not null default '{}'::jsonb,
  notification_preferences jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

drop trigger if exists tr_app_customizations_updated_at on app_customizations;
create trigger tr_app_customizations_updated_at
before update on app_customizations
for each row execute function update_updated_at_column();

-- Suscripciones Web Push / PWA
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  family_id uuid not null references families(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  device_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, endpoint)
);

drop trigger if exists tr_push_subscriptions_updated_at on push_subscriptions;
create trigger tr_push_subscriptions_updated_at
before update on push_subscriptions
for each row execute function update_updated_at_column();

create index if not exists idx_push_subscriptions_user on push_subscriptions(user_id);
create index if not exists idx_push_subscriptions_family on push_subscriptions(family_id);

-- ------------------------------------------------------------------------------
-- 3. POLÍTICAS RLS (ROW LEVEL SECURITY)
-- ------------------------------------------------------------------------------

-- Funciones helper
create or replace function get_auth_family_id()
returns uuid language sql stable security definer as $$
  select family_id from profiles where id = auth.uid();
$$;

create or replace function get_auth_relationship()
returns text language sql stable security definer as $$
  select relationship from profiles where id = auth.uid();
$$;

create or replace function is_family_adult()
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from profiles 
    where id = auth.uid() 
      and role in ('FAMILY_ADULT', 'SUPER_ADMIN')
  );
$$;

-- Habilitar RLS en todas las tablas
alter table families enable row level security;
alter table profiles enable row level security;
alter table co_admin_invites enable row level security;
alter table family_members enable row level security;
alter table tasks enable row level security;
alter table calendar_events enable row level security;
alter table habits enable row level security;
alter table finances_incomes enable row level security;
alter table finances_expenses enable row level security;
alter table finances_bills enable row level security;
alter table finances_debts enable row level security;
alter table finances_budgets enable row level security;
alter table finances_goals enable row level security;
alter table health_records enable row level security;
alter table couple_records enable row level security;
alter table home_records enable row level security;
alter table rewards enable row level security;
alter table points_history enable row level security;
alter table notifications enable row level security;
alter table app_customizations enable row level security;
alter table push_subscriptions enable row level security;

-- Familias y Perfiles
create policy "families_select_member" on families for select using (id = get_auth_family_id());
create policy "families_update_adult" on families for update using (id = get_auth_family_id() and is_family_adult());

create policy "profiles_select_family" on profiles for select using (family_id = get_auth_family_id());
create policy "profiles_update_self" on profiles for update using (id = auth.uid());

create policy "co_admin_invites_manage_family" on co_admin_invites for all using (family_id = get_auth_family_id() and is_family_adult());
create policy "family_members_select_family" on family_members for select using (family_id = get_auth_family_id());
create policy "family_members_manage_adult" on family_members for all using (family_id = get_auth_family_id() and is_family_adult());

-- Tareas y Calendario
create policy "tasks_select_family" on tasks for select using (family_id = get_auth_family_id());
create policy "tasks_insert_family" on tasks for insert with check (family_id = get_auth_family_id());
create policy "tasks_update_family" on tasks for update using (family_id = get_auth_family_id());
create policy "tasks_delete_family" on tasks for delete using (family_id = get_auth_family_id() and is_family_adult());

create policy "calendar_events_select_family" on calendar_events for select using (family_id = get_auth_family_id());
create policy "calendar_events_insert_family" on calendar_events for insert with check (family_id = get_auth_family_id());
create policy "calendar_events_update_family" on calendar_events for update using (family_id = get_auth_family_id());
create policy "calendar_events_delete_family" on calendar_events for delete using (family_id = get_auth_family_id() and is_family_adult());

-- Hábitos (Privacidad Individual)
create policy "habits_select_privacy" on habits for select using (
  family_id = get_auth_family_id() and (is_private = false or created_by_user_id = auth.uid())
);
create policy "habits_insert_family" on habits for insert with check (family_id = get_auth_family_id());
create policy "habits_update_privacy" on habits for update using (
  family_id = get_auth_family_id() and (is_private = false or created_by_user_id = auth.uid())
);
create policy "habits_delete_privacy" on habits for delete using (
  family_id = get_auth_family_id() and (is_private = false or created_by_user_id = auth.uid())
);

-- Finanzas (Privacidad Personal vs Familia)
create policy "finances_expenses_select" on finances_expenses for select using (
  family_id = get_auth_family_id() and (scope = 'family' or created_by_user_id = auth.uid())
);
create policy "finances_expenses_insert" on finances_expenses for insert with check (family_id = get_auth_family_id());
create policy "finances_expenses_update" on finances_expenses for update using (
  family_id = get_auth_family_id() and (scope = 'family' or created_by_user_id = auth.uid())
);
create policy "finances_expenses_delete" on finances_expenses for delete using (
  family_id = get_auth_family_id() and (scope = 'family' or created_by_user_id = auth.uid())
);

create policy "finances_incomes_select" on finances_incomes for select using (
  family_id = get_auth_family_id() and (scope = 'family' or created_by_user_id = auth.uid())
);
create policy "finances_incomes_insert" on finances_incomes for insert with check (family_id = get_auth_family_id());
create policy "finances_incomes_update" on finances_incomes for update using (
  family_id = get_auth_family_id() and (scope = 'family' or created_by_user_id = auth.uid())
);
create policy "finances_incomes_delete" on finances_incomes for delete using (
  family_id = get_auth_family_id() and (scope = 'family' or created_by_user_id = auth.uid())
);

create policy "finances_bills_all" on finances_bills for all using (
  family_id = get_auth_family_id() and (scope = 'family' or created_by_user_id = auth.uid())
);
create policy "finances_debts_all" on finances_debts for all using (
  family_id = get_auth_family_id() and (scope = 'family' or created_by_user_id = auth.uid())
);
create policy "finances_budgets_all" on finances_budgets for all using (family_id = get_auth_family_id() and is_family_adult());
create policy "finances_goals_all" on finances_goals for all using (family_id = get_auth_family_id() and is_family_adult());

-- Salud, Pareja (Cuqui Time), Hogar, Recompensas
create policy "health_records_all" on health_records for all using (family_id = get_auth_family_id() and is_family_adult());
create policy "couple_records_all" on couple_records for all using (family_id = get_auth_family_id() and is_family_adult());
create policy "home_records_all" on home_records for all using (family_id = get_auth_family_id());
create policy "rewards_select" on rewards for select using (family_id = get_auth_family_id());
create policy "rewards_manage_adult" on rewards for all using (family_id = get_auth_family_id() and is_family_adult());
create policy "points_history_all" on points_history for all using (family_id = get_auth_family_id());

-- Notificaciones Dirigidas
create policy "notifications_select_target" on notifications for select using (
  family_id = get_auth_family_id() and (
    target_user_id is null or target_user_id = auth.uid() or target_member_id = get_auth_relationship() or target_member_id = 'all'
  )
);
create policy "notifications_insert_family" on notifications for insert with check (family_id = get_auth_family_id());
create policy "notifications_update_target" on notifications for update using (
  family_id = get_auth_family_id() and (
    target_user_id is null or target_user_id = auth.uid() or target_member_id = get_auth_relationship() or target_member_id = 'all'
  )
);
create policy "notifications_delete_target" on notifications for delete using (family_id = get_auth_family_id() and is_family_adult());

create policy "app_customizations_all" on app_customizations for all using (family_id = get_auth_family_id());

create policy "push_subscriptions_select_self" on push_subscriptions for select using (user_id = auth.uid());
create policy "push_subscriptions_insert_self" on push_subscriptions for insert with check (user_id = auth.uid() and family_id = get_auth_family_id());
create policy "push_subscriptions_update_self" on push_subscriptions for update using (user_id = auth.uid());
create policy "push_subscriptions_delete_self" on push_subscriptions for delete using (user_id = auth.uid());

-- ------------------------------------------------------------------------------
-- 4. FUNCIONES RPC TRANSACCIONALES PARA AUTENTICACIÓN Y VINCULACIÓN
-- ------------------------------------------------------------------------------

-- Registro del primer adulto principal y creación de su familia
create or replace function register_primary_adult(
  p_name text,
  p_relationship text,
  p_family_name text default 'Nuestra Familia'
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_user_id uuid;
  v_user_email text;
  v_family_id uuid;
  v_profile record;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return jsonb_build_object('success', false, 'message', 'Usuario no autenticado');
  end if;

  select email into v_user_email from auth.users where id = v_user_id;

  if p_relationship not in ('mama', 'papa') then
    return jsonb_build_object('success', false, 'message', 'Relación inválida. Debe ser mama o papa');
  end if;

  select * into v_profile from profiles where id = v_user_id;
  if found then
    return jsonb_build_object(
      'success', true,
      'family_id', v_profile.family_id,
      'relationship', v_profile.relationship,
      'message', 'Perfil ya existente'
    );
  end if;

  insert into families (name)
  values (coalesce(nullif(p_family_name, ''), 'Nuestra Familia'))
  returning id into v_family_id;

  insert into profiles (
    id,
    family_id,
    email,
    name,
    role,
    relationship,
    member_id,
    avatar_color,
    avatar_emoji
  ) values (
    v_user_id,
    v_family_id,
    v_user_email,
    p_name,
    'FAMILY_ADULT',
    p_relationship,
    p_relationship,
    case when p_relationship = 'papa' then '#3b82f6' else '#ec4899' end,
    case when p_relationship = 'papa' then '🌿' else '🌸' end
  );

  insert into family_members (
    id,
    family_id,
    user_id,
    name,
    role,
    relationship,
    avatar_color,
    avatar_emoji
  ) values (
    p_relationship,
    v_family_id,
    v_user_id,
    p_name,
    'adult',
    p_relationship,
    case when p_relationship = 'papa' then '#3b82f6' else '#ec4899' end,
    case when p_relationship = 'papa' then '🌿' else '🌸' end
  )
  on conflict (family_id, id) do nothing;

  insert into app_customizations (
    family_id,
    config,
    theme_preferences,
    notification_preferences
  ) values (
    v_family_id,
    '{}'::jsonb,
    '{}'::jsonb,
    '{}'::jsonb
  )
  on conflict (family_id) do nothing;

  return jsonb_build_object(
    'success', true,
    'family_id', v_family_id,
    'relationship', p_relationship,
    'message', 'Familia y perfil creados con éxito'
  );
end;
$$;

-- Generación de enlace de vinculación temporal para el segundo adulto
create or replace function create_co_admin_invite(
  p_target_relationship text
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_user_id uuid;
  v_family_id uuid;
  v_token text;
  v_expires_at timestamptz;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return jsonb_build_object('success', false, 'message', 'Usuario no autenticado');
  end if;

  if p_target_relationship not in ('mama', 'papa') then
    return jsonb_build_object('success', false, 'message', 'Relación inválida. Debe ser mama o papa');
  end if;

  select family_id into v_family_id from profiles where id = v_user_id;
  if v_family_id is null then
    return jsonb_build_object('success', false, 'message', 'El usuario no tiene una familia asignada');
  end if;

  v_token := encode(gen_random_bytes(32), 'hex');
  v_expires_at := now() + interval '48 hours';

  update co_admin_invites
  set used_at = now()
  where family_id = v_family_id
    and target_relationship = p_target_relationship
    and used_at is null;

  insert into co_admin_invites (
    family_id,
    created_by_user_id,
    target_relationship,
    token_hash,
    expires_at
  ) values (
    v_family_id,
    v_user_id,
    p_target_relationship,
    v_token,
    v_expires_at
  );

  return jsonb_build_object(
    'success', true,
    'token', v_token,
    'expires_at', v_expires_at,
    'target_relationship', p_target_relationship
  );
end;
$$;

-- Obtener detalles públicos de la invitación
create or replace function get_invite_details(
  p_token text
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_invite record;
begin
  select i.*, f.name as family_name, p.name as inviter_name
  into v_invite
  from co_admin_invites i
  join families f on f.id = i.family_id
  join profiles p on p.id = i.created_by_user_id
  where i.token_hash = p_token
  limit 1;

  if not found then
    return jsonb_build_object('valid', false, 'message', 'Enlace de vinculación no encontrado o inválido');
  end if;

  if v_invite.used_at is not null then
    return jsonb_build_object('valid', false, 'message', 'Este enlace de vinculación ya fue utilizado anteriormente');
  end if;

  if v_invite.expires_at <= now() then
    return jsonb_build_object('valid', false, 'message', 'Este enlace de vinculación ha expirado (vigencia 48h)');
  end if;

  return jsonb_build_object(
    'valid', true,
    'family_id', v_invite.family_id,
    'family_name', v_invite.family_name,
    'inviter_name', v_invite.inviter_name,
    'target_relationship', v_invite.target_relationship,
    'expires_at', v_invite.expires_at
  );
end;
$$;

-- Función atómica para reclamar el enlace de vinculación (ADULT_PRIMARY)
create or replace function claim_coadmin_link(
  p_token text,
  p_name text
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_invite record;
  v_user_id uuid;
  v_user_email text;
  v_existing_profile record;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return jsonb_build_object('success', false, 'message', 'Usuario no autenticado');
  end if;

  select email into v_user_email from auth.users where id = v_user_id;

  select * into v_invite 
  from co_admin_invites
  where token_hash = p_token
    and used_at is null
    and expires_at > now()
  limit 1;

  if not found then
    return jsonb_build_object('success', false, 'message', 'El enlace de vinculación no es válido o ha expirado');
  end if;

  select * into v_existing_profile from profiles where id = v_user_id;
  if found then
    update profiles
    set family_id = v_invite.family_id,
        relationship = v_invite.target_relationship,
        member_id = v_invite.target_relationship,
        role = 'FAMILY_ADULT',
        name = coalesce(nullif(p_name, ''), name),
        avatar_color = case when v_invite.target_relationship = 'papa' then '#3b82f6' else '#ec4899' end,
        avatar_emoji = case when v_invite.target_relationship = 'papa' then '🌿' else '🌸' end
    where id = v_user_id;
  else
    insert into profiles (
      id,
      family_id,
      email,
      name,
      role,
      relationship,
      member_id,
      avatar_color,
      avatar_emoji
    ) values (
      v_user_id,
      v_invite.family_id,
      v_user_email,
      p_name,
      'FAMILY_ADULT',
      v_invite.target_relationship,
      v_invite.target_relationship,
      case when v_invite.target_relationship = 'papa' then '#3b82f6' else '#ec4899' end,
      case when v_invite.target_relationship = 'papa' then '🌿' else '🌸' end
    );
  end if;

  insert into family_members (
    id,
    family_id,
    user_id,
    name,
    role,
    relationship,
    avatar_color,
    avatar_emoji
  ) values (
    v_invite.target_relationship,
    v_invite.family_id,
    v_user_id,
    p_name,
    'adult',
    v_invite.target_relationship,
    case when v_invite.target_relationship = 'papa' then '#3b82f6' else '#ec4899' end,
    case when v_invite.target_relationship = 'papa' then '🌿' else '🌸' end
  )
  on conflict (family_id, id) do update set
    user_id = v_user_id,
    name = excluded.name,
    avatar_color = excluded.avatar_color,
    avatar_emoji = excluded.avatar_emoji;

  update co_admin_invites
  set used_at = now(),
      used_by_user_id = v_user_id
  where id = v_invite.id;

  return jsonb_build_object(
    'success', true, 
    'message', 'Vinculación exitosa como adulto principal',
    'family_id', v_invite.family_id,
    'relationship', v_invite.target_relationship
  );
end;
$$;

-- Permisos
grant execute on function get_invite_details(text) to anon, authenticated;
grant execute on function register_primary_adult(text, text, text) to authenticated;
grant execute on function create_co_admin_invite(text) to authenticated;
grant execute on function claim_coadmin_link(text, text) to authenticated;

-- ------------------------------------------------------------------------------
-- 5. PUBLICACIÓN REALTIME
-- ------------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end;
$$;

alter publication supabase_realtime add table 
  tasks, 
  calendar_events, 
  habits, 
  finances_expenses, 
  finances_incomes, 
  finances_bills, 
  finances_debts,
  finances_budgets,
  finances_goals,
  health_records, 
  couple_records, 
  home_records, 
  rewards, 
  points_history, 
  notifications, 
  family_members,
  app_customizations,
  push_subscriptions;

-- ------------------------------------------------------------------------------
-- 6. REPLICA IDENTITY FULL PARA TRANSMISIÓN REALTIME DE ELIMINACIONES
-- ------------------------------------------------------------------------------
alter table family_members replica identity full;
alter table tasks replica identity full;
alter table calendar_events replica identity full;
alter table habits replica identity full;
alter table finances_incomes replica identity full;
alter table finances_expenses replica identity full;
alter table finances_bills replica identity full;
alter table finances_debts replica identity full;
alter table finances_budgets replica identity full;
alter table finances_goals replica identity full;
alter table health_records replica identity full;
alter table couple_records replica identity full;
alter table home_records replica identity full;
alter table rewards replica identity full;
alter table points_history replica identity full;
alter table notifications replica identity full;
alter table app_customizations replica identity full;
alter table push_subscriptions replica identity full;


