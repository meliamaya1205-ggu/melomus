-- ==============================================================================
-- NUESTRO HOGAR — ESQUEMA RELACIONAL POSTGRESQL (SUPABASE)
-- ==============================================================================
-- Modelo: Multi-tenant estricto por family_id
-- Jerarquía: Co-administración paritaria entre Mamá y Papá (ADULT_PRIMARY)
-- Dependientes: Perfiles infantiles (CHILD)
-- ==============================================================================

-- 1. Extensiones requeridas
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- Función reutilizable para actualizar timestamp updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ------------------------------------------------------------------------------
-- 2. FAMILIAS (family_id tenant root)
-- ------------------------------------------------------------------------------
create table if not exists families (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Nuestra Familia',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger tr_families_updated_at
before update on families
for each row execute function update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 3. PERFILES DE USUARIOS ADULTOS (Asociados a auth.users de Supabase)
-- ------------------------------------------------------------------------------
-- Paridad total: Ambos adultos tienen role = 'FAMILY_ADULT' (coadministradores)
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

create trigger tr_profiles_updated_at
before update on profiles
for each row execute function update_updated_at_column();

create index if not exists idx_profiles_family_id on profiles(family_id);

-- ------------------------------------------------------------------------------
-- 4. VÍNCULOS TEMPORALES PARA EL SEGUNDO ADULTO COADMINISTRADOR
-- ------------------------------------------------------------------------------
-- Token de un solo uso con vigencia máxima (ej. 48h)
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

-- ------------------------------------------------------------------------------
-- 5. DIRECTORIO DE INTEGRANTES DE LA FAMILIA (Adultos y Niños Dependientes)
-- ------------------------------------------------------------------------------
create table if not exists family_members (
  id text not null, -- 'mama', 'papa', 'annie', 'derek', etc.
  family_id uuid not null references families(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null, -- null para niños sin cuenta propia
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

create trigger tr_family_members_updated_at
before update on family_members
for each row execute function update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 6. TAREAS Y QUEHACERES
-- ------------------------------------------------------------------------------
create table if not exists tasks (
  id text not null,
  family_id uuid not null references families(id) on delete cascade,
  title text not null,
  description text,
  assigned_to text not null, -- member_id ('mama', 'papa', 'annie', etc.)
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

create trigger tr_tasks_updated_at
before update on tasks
for each row execute function update_updated_at_column();

create index if not exists idx_tasks_family_id on tasks(family_id);

-- ------------------------------------------------------------------------------
-- 7. CALENDARIO Y EVENTOS
-- ------------------------------------------------------------------------------
create table if not exists calendar_events (
  id text not null,
  family_id uuid not null references families(id) on delete cascade,
  title text not null,
  description text,
  date text not null, -- YYYY-MM-DD
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

create trigger tr_calendar_events_updated_at
before update on calendar_events
for each row execute function update_updated_at_column();

create index if not exists idx_calendar_events_family_id on calendar_events(family_id);

-- ------------------------------------------------------------------------------
-- 8. HÁBITOS ("LO MÍO + LO NUESTRO")
-- ------------------------------------------------------------------------------
create table if not exists habits (
  id text not null,
  family_id uuid not null references families(id) on delete cascade,
  title text not null,
  type text not null default 'personal' check (type in ('personal', 'family', 'child', 'couple')),
  category text not null default 'wellness',
  member_id text, -- Asignado a Mamá, Papá o null
  child_id text, -- Asignado a un niño o null
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

create trigger tr_habits_updated_at
before update on habits
for each row execute function update_updated_at_column();

create index if not exists idx_habits_family_id on habits(family_id);

-- ------------------------------------------------------------------------------
-- 9. FINANZAS FAMILIARES (EN PESOS CHILENOS CLP $)
-- ------------------------------------------------------------------------------

-- Ingresos
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

create trigger tr_finances_incomes_updated_at
before update on finances_incomes
for each row execute function update_updated_at_column();

-- Gastos
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

create trigger tr_finances_expenses_updated_at
before update on finances_expenses
for each row execute function update_updated_at_column();

-- Cuentas por Pagar
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

create trigger tr_finances_bills_updated_at
before update on finances_bills
for each row execute function update_updated_at_column();

-- Deudas
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

create trigger tr_finances_debts_updated_at
before update on finances_debts
for each row execute function update_updated_at_column();

-- Presupuestos
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

create trigger tr_finances_budgets_updated_at
before update on finances_budgets
for each row execute function update_updated_at_column();

-- Metas Financieras
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

create trigger tr_finances_goals_updated_at
before update on finances_goals
for each row execute function update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 10. SALUD FAMILIAR
-- ------------------------------------------------------------------------------
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

create trigger tr_health_records_updated_at
before update on health_records
for each row execute function update_updated_at_column();

create index if not exists idx_health_records_family_id on health_records(family_id);

-- ------------------------------------------------------------------------------
-- 11. PAREJA Y CUQUI TIME (ÁREA ÍNTIMA PARA ADULTOS)
-- ------------------------------------------------------------------------------
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

create trigger tr_couple_records_updated_at
before update on couple_records
for each row execute function update_updated_at_column();

create index if not exists idx_couple_records_family_id on couple_records(family_id);

-- ------------------------------------------------------------------------------
-- 12. HOGAR (COMPRAS, LIMPIEZA, MANTENIMIENTO, RESET)
-- ------------------------------------------------------------------------------
create table if not exists home_records (
  id text not null,
  family_id uuid not null references families(id) on delete cascade,
  record_type text not null check (record_type in ('shopping', 'cleaning', 'maintenance', 'reset_mission')),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (family_id, id)
);

create trigger tr_home_records_updated_at
before update on home_records
for each row execute function update_updated_at_column();

create index if not exists idx_home_records_family_id on home_records(family_id);

-- ------------------------------------------------------------------------------
-- 13. RECOMPENSAS Y ALCANCÍA MÁGICA INFANTIL
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 14. RECORDATORIOS Y NOTIFICACIONES MULTIUSUARIO
-- ------------------------------------------------------------------------------
create table if not exists notifications (
  id text not null,
  family_id uuid not null references families(id) on delete cascade,
  target_user_id uuid references profiles(id),
  target_member_id text, -- 'mama', 'papa', 'all'
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

create trigger tr_notifications_updated_at
before update on notifications
for each row execute function update_updated_at_column();

create index if not exists idx_notifications_family_id on notifications(family_id);
create index if not exists idx_notifications_target on notifications(target_user_id, target_member_id);

-- ------------------------------------------------------------------------------
-- 15. CONFIGURACIÓN DE PERSONALIZACIÓN Y TEMAS
-- ------------------------------------------------------------------------------
create table if not exists app_customizations (
  family_id uuid primary key references families(id) on delete cascade,
  config jsonb not null default '{}'::jsonb,
  theme_preferences jsonb not null default '{}'::jsonb,
  notification_preferences jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create trigger tr_app_customizations_updated_at
before update on app_customizations
for each row execute function update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 16. SUSCRIPCIONES PUSH WEB / PWA
-- ------------------------------------------------------------------------------
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

create trigger tr_push_subscriptions_updated_at
before update on push_subscriptions
for each row execute function update_updated_at_column();

create index if not exists idx_push_subscriptions_user on push_subscriptions(user_id);
create index if not exists idx_push_subscriptions_family on push_subscriptions(family_id);

-- ------------------------------------------------------------------------------
-- 17. REPLICA IDENTITY FULL PARA TRANSMISIÓN REALTIME DE ELIMINACIONES
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


