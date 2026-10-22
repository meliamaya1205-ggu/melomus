-- ==============================================================================
-- MELOMUS HOGAR — INSTALACIÓN INICIAL COMPLETA, IDEMPOTENTE Y BLINDADA
-- Base de Datos: PostgreSQL / Supabase
-- Versión: 2.1 (Auditoría de Seguridad y Privacidad Avanzada)
-- Fecha: Octubre 2026
-- ==============================================================================
-- INSTRUCCIONES DE EJECUCIÓN:
-- 1. Abre tu consola de Supabase: https://supabase.com/dashboard
-- 2. Entra en SQL Editor -> "+ New query".
-- 3. Pega este contenido completo y presiona "Run" (Ctrl + Enter / Cmd + Enter).
-- 4. Este script es 100% IDEMPOTENTE y no destructivo: puede ejecutarse en proyectos
--    nuevos o sobre bases de datos existentes sin provocar errores ni borrar datos.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. EXTENSIONES Y FUNCIONES DE UTILIDAD
-- ------------------------------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

create or replace function update_updated_at_column()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------------------------------------
-- 2. TABLAS BASE DEL SISTEMA FAMILIAR
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
  family_id uuid references families(id) on delete cascade,
  email text not null,
  name text not null,
  role text not null default 'FAMILY_ADULT' check (role in ('FAMILY_ADULT', 'SUPER_ADMIN')),
  relationship text check (relationship in ('mama', 'papa')),
  member_id text check (member_id in ('mama', 'papa')),
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

-- Trigger de Seguridad: Impide a usuarios clientes mutar directamente campos privilegiados
create or replace function protect_profile_privileged_fields()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_internal_call boolean;
  v_invite record;
begin
  -- 1. Operaciones directas de mantenimiento sin JWT (ej. migrations/seeds en SQL Editor)
  if auth.uid() is null then
    return new;
  end if;

  -- 2. Bloqueo absoluto para clientes directos: authenticated o anon NUNCA pueden escribir directamente
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      raise exception 'No está permitido crear perfiles directamente desde el cliente. Debes usar register_primary_adult o claim_coadmin_link';
    else
      raise exception 'No está permitido modificar campos privilegiados del perfil directamente';
    end if;
  end if;

  -- 3. Verificar flag de contexto interno de las RPCs autorizadas
  v_internal_call := (coalesce(current_setting('app.profile_internal_call', true), '') = 'true');
  if not v_internal_call then
    raise exception 'Las operaciones sobre perfiles solo pueden realizarse mediante las funciones autorizadas register_primary_adult y claim_coadmin_link';
  end if;

  -- 4. Invariantes inquebrantables de identidad (incluso en contexto interno)
  if new.id is distinct from auth.uid() then
    raise exception 'No está permitido crear o modificar el perfil de otro usuario';
  end if;

  if tg_op = 'UPDATE' and new.id is distinct from old.id then
    raise exception 'No está permitido modificar el id del perfil';
  end if;

  if tg_op = 'UPDATE' and old.id is distinct from auth.uid() then
    raise exception 'No tienes permisos para modificar el perfil de otro usuario';
  end if;

  if tg_op = 'UPDATE' and new.email is distinct from old.email then
    raise exception 'El email del perfil está vinculado a auth.users y no puede modificarse directamente';
  end if;

  -- Prohibición absoluta de rol SUPER_ADMIN
  if new.role = 'SUPER_ADMIN' and (tg_op = 'INSERT' or old.role is distinct from 'SUPER_ADMIN') then
    raise exception 'No está permitido asignarse el rol SUPER_ADMIN';
  end if;

  -- Rol permitido exclusivamente FAMILY_ADULT
  if new.role is distinct from 'FAMILY_ADULT' then
    if tg_op = 'UPDATE' and new.role is distinct from old.role then
      raise exception 'El rol asignado mediante vinculación debe ser exclusivamente FAMILY_ADULT';
    elsif tg_op = 'INSERT' then
      raise exception 'El rol asignado mediante vinculación debe ser exclusivamente FAMILY_ADULT';
    end if;
  end if;

  -- Relación y member_id permitidos
  if new.relationship is not null and new.relationship not in ('mama', 'papa') then
    raise exception 'Relación inválida. Debe ser mama o papa';
  end if;
  if new.relationship is not null and new.member_id is distinct from new.relationship then
    raise exception 'El member_id debe coincidir exactamente con la relación (mama o papa)';
  end if;

  -- 5. Validación de family_id e invariantes de vinculación
  if tg_op = 'INSERT' then
    if new.family_id is null then
      return new;
    end if;

    if new.relationship is null or new.relationship not in ('mama', 'papa') then
      raise exception 'Relación inválida. Debe ser mama o papa';
    end if;
    if new.member_id is distinct from new.relationship then
      raise exception 'El member_id debe coincidir exactamente con la relación (mama o papa)';
    end if;

    -- Caso A: Registro de adulto principal (fundador de la familia)
    -- La familia debe existir y no tener ningún otro adulto registrado todavía
    if not exists (
      select 1 from families f
      where f.id = new.family_id
        and not exists (
          select 1 from profiles p where p.family_id = f.id and p.id <> auth.uid()
        )
    ) then
      -- Caso B: Vinculación del segundo adulto (por invitación legítima YA RECLAMADA)
      -- La invitación DEBE haber sido marcada como reclamada por este usuario (claim_coadmin_link)
      select * into v_invite
      from co_admin_invites
      where family_id = new.family_id
        and target_relationship = new.relationship
        and used_by_user_id = auth.uid()
        and created_by_user_id <> auth.uid()
        and used_at is not null;

      if not found then
        raise exception 'No existe una invitación legítimamente reclamada por este usuario ni una familia propia para autorizar la creación de este perfil';
      end if;
    end if;

  elsif tg_op = 'UPDATE' then
    -- Si se intenta modificar algún campo privilegiado en UPDATE
    if new.family_id is distinct from old.family_id
       or new.role is distinct from old.role
       or new.relationship is distinct from old.relationship
       or new.member_id is distinct from old.member_id
    then
      if old.family_id is not null then
        -- Un usuario ya vinculado a una familia NO puede cambiar de familia ni de parentesco
        if new.family_id is distinct from old.family_id then
          raise exception 'Un usuario ya vinculado a una familia no puede cambiar de familia';
        end if;
        if new.relationship is distinct from old.relationship then
          raise exception 'Un usuario ya vinculado a una familia no puede modificar su parentesco';
        end if;
      else
        -- Si old.family_id is null, se está vinculando por primera vez.
        if new.family_id is not null then
          if new.relationship is null or new.relationship not in ('mama', 'papa') then
            raise exception 'Relación inválida. Debe ser mama o papa';
          end if;
          if new.member_id is distinct from new.relationship then
            raise exception 'El member_id debe coincidir exactamente con la relación (mama o papa)';
          end if;

          select * into v_invite
          from co_admin_invites
          where family_id = new.family_id
            and target_relationship = new.relationship
            and used_by_user_id = auth.uid()
            and created_by_user_id <> auth.uid()
            and used_at is not null;

          if not found then
            if not exists (
              select 1 from families f
              where f.id = new.family_id
                and not exists (
                  select 1 from profiles p where p.family_id = f.id and p.id <> auth.uid()
                )
            ) then
              raise exception 'No existe una invitación legítimamente reclamada por este usuario ni una familia propia para autorizar la asignación de este family_id';
            end if;
          end if;
        end if;
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists tr_protect_profile_fields on profiles;
create trigger tr_protect_profile_fields
before insert or update on profiles
for each row execute function protect_profile_privileged_fields();

-- Privilegios a nivel de columna: authenticated solo puede actualizar campos cosméticos directamente
revoke insert, delete on profiles from authenticated, anon, public;
revoke update on profiles from authenticated, anon, public;
grant update (name, avatar_color, avatar_emoji) on profiles to authenticated;

-- Invitaciones Temporales para Coadministrador (Token almacenado como SHA-256)
create table if not exists co_admin_invites (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  created_by_user_id uuid not null references profiles(id),
  target_relationship text not null check (target_relationship in ('mama', 'papa')),
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  used_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_co_admin_invites_token on co_admin_invites(token_hash);
create index if not exists idx_co_admin_invites_family on co_admin_invites(family_id);

-- Trigger de Seguridad: Prohibir escrituras directas (INSERT, UPDATE, DELETE) de clientes en co_admin_invites
-- Todas las invitaciones deben crearse y consumirse exclusivamente a través de las RPCs SECURITY DEFINER
create or replace function protect_co_admin_invites_direct_writes()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_caller_family_id uuid;
begin
  -- 0. Barrera de rol de ejecución: llamadas directas de clientes autenticados o anónimos NUNCA pueden escribir
  if current_user in ('authenticated', 'anon') then
    raise exception 'No está permitido modificar invitaciones de coadministrador directamente desde el cliente';
  end if;

  -- 1. Barrera de contexto transaccional interno: solo RPCs autorizadas pueden escribir
  if coalesce(current_setting('app.invites_internal_call', true), '') <> 'true' then
    raise exception 'Las invitaciones de coadministrador solo pueden gestionarse mediante las funciones seguras create_co_admin_invite y claim_coadmin_link';
  end if;

  -- 2. Prohibición absoluta de borrado: las invitaciones nunca se eliminan físicamente (auditoría/historial)
  if tg_op = 'DELETE' then
    raise exception 'No está permitido eliminar registros de invitaciones de coadministrador';
  end if;

  -- 3. Invariantes de autorización por usuario (incluso si la llamada proviene de un contexto interno)
  if auth.uid() is not null then
    if tg_op = 'INSERT' then
      -- El autor de la invitación debe ser estrictamente el usuario en sesión
      if new.created_by_user_id is distinct from auth.uid() then
        raise exception 'No está permitido generar invitaciones a nombre de otro usuario';
      end if;

      -- La familia debe coincidir con la familia verificada del usuario
      select family_id into v_caller_family_id
      from profiles
      where id = auth.uid() and role in ('FAMILY_ADULT', 'SUPER_ADMIN');

      if v_caller_family_id is null or new.family_id is distinct from v_caller_family_id then
        raise exception 'No está permitido generar invitaciones para una familia a la que no perteneces';
      end if;

      -- Relación objetivo permitida
      if new.target_relationship not in ('mama', 'papa') then
        raise exception 'Relación objetivo inválida. Debe ser mama o papa';
      end if;

      -- Token hash criptográfico SHA-256 obligatorio (64 caracteres hexadecimales)
      if new.token_hash is null or length(trim(new.token_hash)) <> 64 then
        raise exception 'El hash criptográfico del token es inválido o no fue provisto';
      end if;

    elsif tg_op = 'UPDATE' then
      -- Inmutabilidad estricta de metadatos estructurales de la invitación
      if new.id is distinct from old.id then
        raise exception 'No está permitido modificar el id de una invitación';
      end if;
      if new.family_id is distinct from old.family_id then
        raise exception 'No está permitido reasignar la familia de una invitación';
      end if;
      if new.created_by_user_id is distinct from old.created_by_user_id then
        raise exception 'No está permitido modificar el creador de una invitación';
      end if;
      if new.target_relationship is distinct from old.target_relationship then
        raise exception 'No está permitido modificar el rol objetivo de una invitación';
      end if;
      if new.token_hash is distinct from old.token_hash then
        raise exception 'No está permitido alterar el hash criptográfico de una invitación';
      end if;
      if new.expires_at is distinct from old.expires_at then
        raise exception 'No está permitido modificar la fecha de expiración de una invitación';
      end if;
      if new.created_at is distinct from old.created_at then
        raise exception 'No está permitido alterar la fecha de creación de una invitación';
      end if;

      -- Una invitación ya utilizada o revocada NO puede volver a transicionar
      if old.used_at is not null then
        raise exception 'Esta invitación ya fue utilizada o revocada anteriormente';
      end if;

      -- Distinguir claramente entre:
      -- CASO A: RECLAMO de la invitación por el segundo adulto (claim_coadmin_link)
      -- CASO B: REVOCACIÓN de invitación anterior por el creador (create_co_admin_invite)
      if new.used_by_user_id is not null then
        -- ========================================================
        -- CASO A: RECLAMO POR EL SEGUNDO ADULTO
        -- ========================================================
        if new.used_by_user_id is distinct from auth.uid() then
          raise exception 'No puedes reclamar una invitación a nombre de otro usuario';
        end if;
        if old.created_by_user_id = auth.uid() then
          raise exception 'No puedes reclamar una invitación creada por ti mismo';
        end if;
        if old.expires_at <= now() then
          raise exception 'Esta invitación ha expirado (vigencia 48h)';
        end if;
        if new.used_at is null then
          new.used_at := now();
        end if;

      elsif new.used_at is not null and old.used_at is null then
        -- ========================================================
        -- CASO B: REVOCACIÓN DE INVITACIÓN ANTERIOR POR EL CREADOR
        -- ========================================================
        select family_id into v_caller_family_id
        from profiles
        where id = auth.uid() and role in ('FAMILY_ADULT', 'SUPER_ADMIN');

        if old.created_by_user_id is distinct from auth.uid() and (v_caller_family_id is null or v_caller_family_id is distinct from old.family_id) then
          raise exception 'No tienes permisos para revocar invitaciones de otra familia o creadas por otro usuario';
        end if;

        -- En una revocación, used_by_user_id DEBE permanecer null
        new.used_by_user_id := null;
      else
        raise exception 'Operación no permitida sobre invitaciones de coadministrador';
      end if;
    end if;
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists tr_protect_co_admin_invites on co_admin_invites;
create trigger tr_protect_co_admin_invites
before insert or update or delete on co_admin_invites
for each row execute function protect_co_admin_invites_direct_writes();

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

-- Tareas y Quehaceres
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
  created_by_user_id uuid references profiles(id) default auth.uid(),
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
  created_by_user_id uuid references profiles(id) default auth.uid(),
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
  created_by_user_id uuid references profiles(id) default auth.uid(),
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

-- Trigger de Integridad: Proteger autoría y privacidad en hábitos
create or replace function enforce_habits_created_by_user_id()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is not null then
    if tg_op = 'INSERT' then
      new.created_by_user_id := auth.uid();
    elsif tg_op = 'UPDATE' then
      if new.created_by_user_id is distinct from old.created_by_user_id then
        raise exception 'No está permitido modificar created_by_user_id en hábitos';
      end if;
      new.created_by_user_id := old.created_by_user_id;

      if old.is_private = true and old.created_by_user_id is distinct from auth.uid() then
        raise exception 'No tienes permisos para modificar hábitos privados de otro usuario';
      end if;
      if new.is_private = true and old.created_by_user_id is distinct from auth.uid() then
        raise exception 'No puedes privatizar un hábito compartido creado por otro usuario';
      end if;
    elsif tg_op = 'DELETE' then
      if old.is_private = true and old.created_by_user_id is distinct from auth.uid() then
        raise exception 'No tienes permisos para eliminar hábitos privados de otro usuario';
      end if;
    end if;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists tr_protect_habits_created_by on habits;
create trigger tr_protect_habits_created_by
before insert or update or delete on habits
for each row execute function enforce_habits_created_by_user_id();

-- Finanzas: Ingresos (Familiar vs Personal)
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
  created_by_user_id uuid references profiles(id) default auth.uid(),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (family_id, id)
);

drop trigger if exists tr_finances_incomes_updated_at on finances_incomes;
create trigger tr_finances_incomes_updated_at
before update on finances_incomes
for each row execute function update_updated_at_column();

-- Finanzas: Gastos (Familiar vs Personal)
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
  created_by_user_id uuid references profiles(id) default auth.uid(),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (family_id, id)
);

drop trigger if exists tr_finances_expenses_updated_at on finances_expenses;
create trigger tr_finances_expenses_updated_at
before update on finances_expenses
for each row execute function update_updated_at_column();

-- Finanzas: Cuentas por Pagar (Familiar vs Personal)
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
  created_by_user_id uuid references profiles(id) default auth.uid(),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (family_id, id)
);

drop trigger if exists tr_finances_bills_updated_at on finances_bills;
create trigger tr_finances_bills_updated_at
before update on finances_bills
for each row execute function update_updated_at_column();

-- Finanzas: Deudas (Familiar vs Personal)
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
  created_by_user_id uuid references profiles(id) default auth.uid(),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (family_id, id)
);

drop trigger if exists tr_finances_debts_updated_at on finances_debts;
create trigger tr_finances_debts_updated_at
before update on finances_debts
for each row execute function update_updated_at_column();

-- Trigger de Integridad: Proteger autoría y privacidad en registros financieros
create or replace function enforce_finance_created_by_user_id()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is not null then
    if tg_op = 'INSERT' then
      -- Forzar irrevocable que el autor sea el usuario autenticado real
      new.created_by_user_id := auth.uid();
    elsif tg_op = 'UPDATE' then
      -- Prohibir mutar o transferir la autoría original
      if new.created_by_user_id is distinct from old.created_by_user_id then
        raise exception 'No está permitido modificar created_by_user_id en registros financieros';
      end if;
      new.created_by_user_id := old.created_by_user_id;

      -- Si el registro era personal, solo el autor original puede modificarlo
      if old.scope = 'personal' and old.created_by_user_id is distinct from auth.uid() then
        raise exception 'No tienes permisos para modificar registros financieros personales de otro usuario';
      end if;

      -- Si se intenta cambiar a personal, solo el autor original puede ser el titular
      if new.scope = 'personal' and old.created_by_user_id is distinct from auth.uid() then
        raise exception 'No puedes convertir un registro familiar en personal de otro usuario';
      end if;
    elsif tg_op = 'DELETE' then
      -- Si el registro era personal, solo el autor original puede eliminarlo
      if old.scope = 'personal' and old.created_by_user_id is distinct from auth.uid() then
        raise exception 'No tienes permisos para eliminar registros financieros personales de otro usuario';
      end if;
    end if;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists tr_protect_finance_incomes_created_by on finances_incomes;
create trigger tr_protect_finance_incomes_created_by
before insert or update or delete on finances_incomes
for each row execute function enforce_finance_created_by_user_id();

drop trigger if exists tr_protect_finance_expenses_created_by on finances_expenses;
create trigger tr_protect_finance_expenses_created_by
before insert or update or delete on finances_expenses
for each row execute function enforce_finance_created_by_user_id();

drop trigger if exists tr_protect_finance_bills_created_by on finances_bills;
create trigger tr_protect_finance_bills_created_by
before insert or update or delete on finances_bills
for each row execute function enforce_finance_created_by_user_id();

drop trigger if exists tr_protect_finance_debts_created_by on finances_debts;
create trigger tr_protect_finance_debts_created_by
before insert or update or delete on finances_debts
for each row execute function enforce_finance_created_by_user_id();

-- Finanzas: Presupuestos por Categoría (Familiar Co-admin)
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

-- Finanzas: Metas de Ahorro Familiar (Familiar Co-admin)
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

-- Salud Familiar (Exclusivo Adultos Co-administradores)
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

-- Pareja y Cuqui Time (Exclusivo Adultos, con soporte para registros privados 'Solo para mí')
create table if not exists couple_records (
  id text not null,
  family_id uuid not null references families(id) on delete cascade,
  item_type text not null check (item_type in (
    'check_in', 'conversation', 'date', 'gesture', 'agreement', 'spiritual', 'cuqui_time', 'memory'
  )),
  data jsonb not null default '{}'::jsonb,
  created_by_user_id uuid references profiles(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (family_id, id)
);

drop trigger if exists tr_couple_records_updated_at on couple_records;
create trigger tr_couple_records_updated_at
before update on couple_records
for each row execute function update_updated_at_column();

create index if not exists idx_couple_records_family_id on couple_records(family_id);

-- Trigger de Integridad: Proteger autoría y privacidad en registros de pareja
create or replace function enforce_couple_created_by_user_id()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is not null then
    if tg_op = 'INSERT' then
      -- Forzar que el creador sea siempre el usuario autenticado real
      new.created_by_user_id := auth.uid();
    elsif tg_op = 'UPDATE' then
      -- Prohibir mutar o transferir la autoría original
      if new.created_by_user_id is distinct from old.created_by_user_id then
        raise exception 'No está permitido modificar created_by_user_id en registros de pareja';
      end if;
      new.created_by_user_id := old.created_by_user_id;

      -- Si el registro era privado, solo el autor original puede modificarlo
      if coalesce((old.data->>'isPrivate')::boolean, false) = true and old.created_by_user_id is distinct from auth.uid() then
        raise exception 'No tienes permisos para modificar registros privados de pareja creados por otro usuario';
      end if;

      -- Si se intenta privatizar un registro compartido creado por el otro adulto, bloquear
      if coalesce((new.data->>'isPrivate')::boolean, false) = true and old.created_by_user_id is distinct from auth.uid() then
        raise exception 'No puedes privatizar un registro de pareja compartido creado por el otro adulto';
      end if;
    elsif tg_op = 'DELETE' then
      -- Si el registro es privado, solo el autor original puede eliminarlo
      if coalesce((old.data->>'isPrivate')::boolean, false) = true and old.created_by_user_id is distinct from auth.uid() then
        raise exception 'No tienes permisos para eliminar registros privados de pareja creados por otro usuario';
      end if;
    end if;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists tr_protect_couple_created_by on couple_records;
create trigger tr_protect_couple_created_by
before insert or update or delete on couple_records
for each row execute function enforce_couple_created_by_user_id();

-- Hogar: Compras, Limpieza, Mantención, Áreas Personalizadas y Family Reset
create table if not exists home_records (
  id text not null,
  family_id uuid not null references families(id) on delete cascade,
  record_type text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (family_id, id)
);

-- Constraint flexible que admite 'area' y 'reset_session'
do $$
begin
  alter table home_records drop constraint if exists home_records_record_type_check;
  alter table home_records add constraint home_records_record_type_check 
    check (record_type in ('shopping', 'cleaning', 'maintenance', 'reset_mission', 'area', 'reset_session'));
end $$;

drop trigger if exists tr_home_records_updated_at on home_records;
create trigger tr_home_records_updated_at
before update on home_records
for each row execute function update_updated_at_column();

create index if not exists idx_home_records_family_id on home_records(family_id);

-- Recompensas y Catálogo Infantil
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

-- Historial de Puntos de Niños
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

create index if not exists idx_points_history_child on points_history(family_id, child_id);

-- Notificaciones Multiusuario
create table if not exists notifications (
  id text not null,
  family_id uuid not null references families(id) on delete cascade,
  target_user_id uuid references profiles(id),
  target_member_id text,
  created_by_user_id uuid references profiles(id) default auth.uid(),
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

-- Configuración Familiar, Módulos y Temas
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
-- 3. FUNCIONES HELPER RLS (BLINDADAS CON search_path Y STABLE)
-- ------------------------------------------------------------------------------

create or replace function get_auth_family_id()
returns uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select family_id from profiles where id = auth.uid();
$$;

create or replace function get_auth_relationship()
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select relationship from profiles where id = auth.uid();
$$;

create or replace function is_family_adult()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1 from profiles 
    where id = auth.uid() 
      and role in ('FAMILY_ADULT', 'SUPER_ADMIN')
  );
$$;

-- Permisos mínimos en funciones helper
revoke all on function get_auth_family_id() from public, anon;
grant execute on function get_auth_family_id() to authenticated;

revoke all on function get_auth_relationship() from public, anon;
grant execute on function get_auth_relationship() to authenticated;

revoke all on function is_family_adult() from public, anon;
grant execute on function is_family_adult() to authenticated;

-- ------------------------------------------------------------------------------
-- 4. HABILITACIÓN DE RLS Y POLÍTICAS DE SEGURIDAD MULTI-INQUILINO
-- ------------------------------------------------------------------------------

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

-- Familias
drop policy if exists "families_select_member" on families;
create policy "families_select_member" on families for select using (id = get_auth_family_id());

drop policy if exists "families_update_adult" on families;
create policy "families_update_adult" on families for update using (id = get_auth_family_id() and is_family_adult());

-- Perfiles (Solo lectura de miembros de la misma familia, actualización restringida a datos personales no privilegiados)
drop policy if exists "profiles_select_family" on profiles;
create policy "profiles_select_family" on profiles for select using (family_id = get_auth_family_id());

drop policy if exists "profiles_update_self" on profiles;
create policy "profiles_update_self" on profiles for update using (id = auth.uid());

-- Invitaciones Coadministrador (Solo lectura para adultos de la familia; escrituras directas prohibidas y mediadas por RPCs)
drop policy if exists "co_admin_invites_manage_family" on co_admin_invites;
drop policy if exists "co_admin_invites_select_adults" on co_admin_invites;
create policy "co_admin_invites_select_adults" on co_admin_invites for select using (
  family_id = get_auth_family_id() and is_family_adult()
);

-- Revocar permisos de escritura directos a nivel de tabla (defensa en profundidad)
revoke insert, update, delete on co_admin_invites from authenticated, anon, public;
grant select on co_admin_invites to authenticated;

-- Directorio de Integrantes
drop policy if exists "family_members_select_family" on family_members;
create policy "family_members_select_family" on family_members for select using (family_id = get_auth_family_id());

drop policy if exists "family_members_manage_adult" on family_members;
create policy "family_members_manage_adult" on family_members for all using (family_id = get_auth_family_id() and is_family_adult());

-- Tareas
drop policy if exists "tasks_select_family" on tasks;
create policy "tasks_select_family" on tasks for select using (family_id = get_auth_family_id());

drop policy if exists "tasks_insert_family" on tasks;
create policy "tasks_insert_family" on tasks for insert with check (family_id = get_auth_family_id());

drop policy if exists "tasks_update_family" on tasks;
create policy "tasks_update_family" on tasks for update using (family_id = get_auth_family_id());

drop policy if exists "tasks_delete_family" on tasks;
create policy "tasks_delete_family" on tasks for delete using (family_id = get_auth_family_id() and is_family_adult());

-- Calendario
drop policy if exists "calendar_events_select_family" on calendar_events;
create policy "calendar_events_select_family" on calendar_events for select using (family_id = get_auth_family_id());

drop policy if exists "calendar_events_insert_family" on calendar_events;
create policy "calendar_events_insert_family" on calendar_events for insert with check (family_id = get_auth_family_id());

drop policy if exists "calendar_events_update_family" on calendar_events;
create policy "calendar_events_update_family" on calendar_events for update using (family_id = get_auth_family_id());

drop policy if exists "calendar_events_delete_family" on calendar_events;
create policy "calendar_events_delete_family" on calendar_events for delete using (family_id = get_auth_family_id() and is_family_adult());

-- Hábitos (Diferenciación Estricta: Familiares vs Privados)
drop policy if exists "habits_select_privacy" on habits;
create policy "habits_select_privacy" on habits for select using (
  family_id = get_auth_family_id() and (is_private = false or created_by_user_id = auth.uid())
);

drop policy if exists "habits_insert_family" on habits;
create policy "habits_insert_family" on habits for insert with check (
  family_id = get_auth_family_id() and (is_private = false or created_by_user_id = auth.uid())
);

drop policy if exists "habits_update_privacy" on habits;
create policy "habits_update_privacy" on habits for update using (
  family_id = get_auth_family_id() and (is_private = false or created_by_user_id = auth.uid())
) with check (
  family_id = get_auth_family_id() and (is_private = false or created_by_user_id = auth.uid())
);

drop policy if exists "habits_delete_privacy" on habits;
create policy "habits_delete_privacy" on habits for delete using (
  family_id = get_auth_family_id() and (is_private = false or created_by_user_id = auth.uid())
);

-- Finanzas: Gastos (Privacidad Personal vs Nuestro Dinero - Blindado contra manipulaciones cliente)
drop policy if exists "finances_expenses_select" on finances_expenses;
create policy "finances_expenses_select" on finances_expenses for select using (
  family_id = get_auth_family_id() and (scope = 'family' or created_by_user_id = auth.uid())
);

drop policy if exists "finances_expenses_insert" on finances_expenses;
create policy "finances_expenses_insert" on finances_expenses for insert with check (
  family_id = get_auth_family_id() and (
    scope = 'family' or (scope = 'personal' and created_by_user_id = auth.uid())
  )
);

drop policy if exists "finances_expenses_update" on finances_expenses;
create policy "finances_expenses_update" on finances_expenses for update using (
  family_id = get_auth_family_id() and (scope = 'family' or created_by_user_id = auth.uid())
) with check (
  family_id = get_auth_family_id() and (
    scope = 'family' or (scope = 'personal' and created_by_user_id = auth.uid())
  )
);

drop policy if exists "finances_expenses_delete" on finances_expenses;
create policy "finances_expenses_delete" on finances_expenses for delete using (
  family_id = get_auth_family_id() and (
    (scope = 'family' and is_family_adult()) or (scope = 'personal' and created_by_user_id = auth.uid())
  )
);

-- Finanzas: Ingresos
drop policy if exists "finances_incomes_select" on finances_incomes;
create policy "finances_incomes_select" on finances_incomes for select using (
  family_id = get_auth_family_id() and (scope = 'family' or created_by_user_id = auth.uid())
);

drop policy if exists "finances_incomes_insert" on finances_incomes;
create policy "finances_incomes_insert" on finances_incomes for insert with check (
  family_id = get_auth_family_id() and (
    scope = 'family' or (scope = 'personal' and created_by_user_id = auth.uid())
  )
);

drop policy if exists "finances_incomes_update" on finances_incomes;
create policy "finances_incomes_update" on finances_incomes for update using (
  family_id = get_auth_family_id() and (scope = 'family' or created_by_user_id = auth.uid())
) with check (
  family_id = get_auth_family_id() and (
    scope = 'family' or (scope = 'personal' and created_by_user_id = auth.uid())
  )
);

drop policy if exists "finances_incomes_delete" on finances_incomes;
create policy "finances_incomes_delete" on finances_incomes for delete using (
  family_id = get_auth_family_id() and (
    (scope = 'family' and is_family_adult()) or (scope = 'personal' and created_by_user_id = auth.uid())
  )
);

-- Finanzas: Cuentas por Pagar
drop policy if exists "finances_bills_select" on finances_bills;
create policy "finances_bills_select" on finances_bills for select using (
  family_id = get_auth_family_id() and (scope = 'family' or created_by_user_id = auth.uid())
);

drop policy if exists "finances_bills_insert" on finances_bills;
create policy "finances_bills_insert" on finances_bills for insert with check (
  family_id = get_auth_family_id() and (
    scope = 'family' or (scope = 'personal' and created_by_user_id = auth.uid())
  )
);

drop policy if exists "finances_bills_update" on finances_bills;
create policy "finances_bills_update" on finances_bills for update using (
  family_id = get_auth_family_id() and (scope = 'family' or created_by_user_id = auth.uid())
) with check (
  family_id = get_auth_family_id() and (
    scope = 'family' or (scope = 'personal' and created_by_user_id = auth.uid())
  )
);

drop policy if exists "finances_bills_delete" on finances_bills;
create policy "finances_bills_delete" on finances_bills for delete using (
  family_id = get_auth_family_id() and (
    (scope = 'family' and is_family_adult()) or (scope = 'personal' and created_by_user_id = auth.uid())
  )
);

-- Finanzas: Deudas
drop policy if exists "finances_debts_select" on finances_debts;
create policy "finances_debts_select" on finances_debts for select using (
  family_id = get_auth_family_id() and (scope = 'family' or created_by_user_id = auth.uid())
);

drop policy if exists "finances_debts_insert" on finances_debts;
create policy "finances_debts_insert" on finances_debts for insert with check (
  family_id = get_auth_family_id() and (
    scope = 'family' or (scope = 'personal' and created_by_user_id = auth.uid())
  )
);

drop policy if exists "finances_debts_update" on finances_debts;
create policy "finances_debts_update" on finances_debts for update using (
  family_id = get_auth_family_id() and (scope = 'family' or created_by_user_id = auth.uid())
) with check (
  family_id = get_auth_family_id() and (
    scope = 'family' or (scope = 'personal' and created_by_user_id = auth.uid())
  )
);

drop policy if exists "finances_debts_delete" on finances_debts;
create policy "finances_debts_delete" on finances_debts for delete using (
  family_id = get_auth_family_id() and (
    (scope = 'family' and is_family_adult()) or (scope = 'personal' and created_by_user_id = auth.uid())
  )
);

-- Finanzas: Presupuestos y Metas (Exclusivo Adultos)
drop policy if exists "finances_budgets_all" on finances_budgets;
create policy "finances_budgets_all" on finances_budgets for all using (
  family_id = get_auth_family_id() and is_family_adult()
);

drop policy if exists "finances_goals_all" on finances_goals;
create policy "finances_goals_all" on finances_goals for all using (
  family_id = get_auth_family_id() and is_family_adult()
);

-- Salud Familiar (Exclusivo Adultos Co-administradores)
drop policy if exists "health_records_all" on health_records;
create policy "health_records_all" on health_records for all using (
  family_id = get_auth_family_id() and is_family_adult()
);

-- Pareja y Cuqui Time (Exclusivo Adultos, con Privacidad Estricta en 'isPrivate')
drop policy if exists "couple_records_select" on couple_records;
create policy "couple_records_select" on couple_records for select using (
  family_id = get_auth_family_id() 
  and is_family_adult()
  and (
    coalesce((data->>'isPrivate')::boolean, false) = false 
    or created_by_user_id = auth.uid()
  )
);

drop policy if exists "couple_records_insert" on couple_records;
create policy "couple_records_insert" on couple_records for insert with check (
  family_id = get_auth_family_id() 
  and is_family_adult()
  and (
    coalesce((data->>'isPrivate')::boolean, false) = false 
    or created_by_user_id = auth.uid()
  )
);

drop policy if exists "couple_records_update" on couple_records;
create policy "couple_records_update" on couple_records for update using (
  family_id = get_auth_family_id() 
  and is_family_adult()
  and (
    coalesce((data->>'isPrivate')::boolean, false) = false 
    or created_by_user_id = auth.uid()
  )
) with check (
  family_id = get_auth_family_id() 
  and is_family_adult()
  and (
    coalesce((data->>'isPrivate')::boolean, false) = false 
    or created_by_user_id = auth.uid()
  )
);

drop policy if exists "couple_records_delete" on couple_records;
create policy "couple_records_delete" on couple_records for delete using (
  family_id = get_auth_family_id() 
  and is_family_adult()
  and (
    coalesce((data->>'isPrivate')::boolean, false) = false 
    or created_by_user_id = auth.uid()
  )
);

-- Hogar: Compras, Limpieza, Mantención, Áreas y Family Reset
drop policy if exists "home_records_select" on home_records;
create policy "home_records_select" on home_records for select using (family_id = get_auth_family_id());

drop policy if exists "home_records_insert" on home_records;
create policy "home_records_insert" on home_records for insert with check (family_id = get_auth_family_id());

drop policy if exists "home_records_update" on home_records;
create policy "home_records_update" on home_records for update using (family_id = get_auth_family_id());

drop policy if exists "home_records_delete" on home_records;
create policy "home_records_delete" on home_records for delete using (family_id = get_auth_family_id() and is_family_adult());

-- Recompensas y Alcancía
drop policy if exists "rewards_select" on rewards;
create policy "rewards_select" on rewards for select using (family_id = get_auth_family_id());

drop policy if exists "rewards_manage_adult" on rewards;
create policy "rewards_manage_adult" on rewards for all using (family_id = get_auth_family_id() and is_family_adult());

drop policy if exists "points_history_all" on points_history;
create policy "points_history_all" on points_history for all using (family_id = get_auth_family_id());

-- Notificaciones Dirigidas
drop policy if exists "notifications_select_target" on notifications;
create policy "notifications_select_target" on notifications for select using (
  family_id = get_auth_family_id() and (
    target_user_id is null or target_user_id = auth.uid() or target_member_id = get_auth_relationship() or target_member_id = 'all'
  )
);

drop policy if exists "notifications_insert_family" on notifications;
create policy "notifications_insert_family" on notifications for insert with check (family_id = get_auth_family_id());

drop policy if exists "notifications_update_target" on notifications;
create policy "notifications_update_target" on notifications for update using (
  family_id = get_auth_family_id() and (
    target_user_id is null or target_user_id = auth.uid() or target_member_id = get_auth_relationship() or target_member_id = 'all'
  )
);

drop policy if exists "notifications_delete_target" on notifications;
create policy "notifications_delete_target" on notifications for delete using (family_id = get_auth_family_id() and is_family_adult());

-- Personalización y Configuración
drop policy if exists "app_customizations_all" on app_customizations;
create policy "app_customizations_all" on app_customizations for all using (family_id = get_auth_family_id());

-- Suscripciones Web Push (Aislamiento Total por Usuario)
drop policy if exists "push_subscriptions_select_self" on push_subscriptions;
create policy "push_subscriptions_select_self" on push_subscriptions for select using (user_id = auth.uid());

drop policy if exists "push_subscriptions_insert_self" on push_subscriptions;
create policy "push_subscriptions_insert_self" on push_subscriptions for insert with check (user_id = auth.uid() and family_id = get_auth_family_id());

drop policy if exists "push_subscriptions_update_self" on push_subscriptions;
create policy "push_subscriptions_update_self" on push_subscriptions for update using (user_id = auth.uid());

drop policy if exists "push_subscriptions_delete_self" on push_subscriptions;
create policy "push_subscriptions_delete_self" on push_subscriptions for delete using (user_id = auth.uid());

-- ------------------------------------------------------------------------------
-- 5. FUNCIONES RPC TRANSACCIONALES (SEGURIDAD DEFINER Y HASH CRIPTOGRÁFICO)
-- ------------------------------------------------------------------------------

-- 1. Registro del primer adulto principal y creación de su familia
create or replace function register_primary_adult(
  p_name text,
  p_relationship text,
  p_family_name text default 'Nuestra Familia'
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_user_id uuid;
  v_user_email text;
  v_family_id uuid;
  v_profile record;
  v_has_profile boolean := false;
  v_clean_name text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return jsonb_build_object('success', false, 'message', 'Usuario no autenticado');
  end if;

  -- Habilitar contexto interno para profiles
  perform set_config('app.profile_internal_call', 'true', true);

  select email into v_user_email from auth.users where id = v_user_id;
  if v_user_email is null then
    return jsonb_build_object('success', false, 'message', 'No se encontró cuenta asociada');
  end if;

  if p_relationship not in ('mama', 'papa') then
    return jsonb_build_object('success', false, 'message', 'Relación inválida. Debe ser mama o papa');
  end if;

  v_clean_name := trim(coalesce(p_name, ''));
  if length(v_clean_name) = 0 then
    v_clean_name := case when p_relationship = 'papa' then 'Papá' else 'Mamá' end;
  end if;

  -- Comprobar si ya tiene perfil y si ya está vinculado a una familia
  select * into v_profile from profiles where id = v_user_id;
  v_has_profile := (v_profile.id is not null);

  if v_has_profile and v_profile.family_id is not null then
    -- Si el usuario ya pertenece a una familia e intenta cambiar de parentesco:
    if v_profile.relationship is distinct from p_relationship then
      return jsonb_build_object(
        'success', false,
        'message', 'El usuario ya pertenece a una familia con el rol de ' || v_profile.relationship || ' y no puede modificar su parentesco'
      );
    end if;

    -- Si coincide el parentesco, es idempotente y preserva la familia existente
    return jsonb_build_object(
      'success', true,
      'family_id', v_profile.family_id,
      'relationship', v_profile.relationship,
      'message', 'El usuario ya está registrado en su familia como adulto principal'
    );
  end if;

  -- Crear nueva familia
  insert into families (name)
  values (coalesce(nullif(trim(p_family_name), ''), 'Nuestra Familia'))
  returning id into v_family_id;

  -- Crear perfil con rol de coadministrador completo
  if v_has_profile then
    update profiles
    set family_id = v_family_id,
        email = v_user_email,
        name = v_clean_name,
        role = 'FAMILY_ADULT',
        relationship = p_relationship,
        member_id = p_relationship,
        avatar_color = case when p_relationship = 'papa' then '#3b82f6' else '#ec4899' end,
        avatar_emoji = case when p_relationship = 'papa' then '🌿' else '🌸' end,
        updated_at = now()
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
      v_family_id,
      v_user_email,
      v_clean_name,
      'FAMILY_ADULT',
      p_relationship,
      p_relationship,
      case when p_relationship = 'papa' then '#3b82f6' else '#ec4899' end,
      case when p_relationship = 'papa' then '🌿' else '🌸' end
    );
  end if;

  -- Registrar en directorio de integrantes
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
    v_clean_name,
    'adult',
    p_relationship,
    case when p_relationship = 'papa' then '#3b82f6' else '#ec4899' end,
    case when p_relationship = 'papa' then '🌿' else '🌸' end
  )
  on conflict (family_id, id) do nothing;

  -- Crear configuración inicial
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

-- 2. Generar invitación temporal segura
-- El token plano (64 hex) se devuelve al emisor para el enlace,
-- pero en la base de datos se guarda ÚNICAMENTE el HASH SHA-256
create or replace function create_co_admin_invite(
  p_target_relationship text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_user_id uuid;
  v_family_id uuid;
  v_token_plain text;
  v_token_hash text;
  v_expires_at timestamptz;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return jsonb_build_object('success', false, 'message', 'Usuario no autenticado');
  end if;

  if p_target_relationship not in ('mama', 'papa') then
    return jsonb_build_object('success', false, 'message', 'Relación inválida. Debe ser mama o papa');
  end if;

  -- Solo adultos coadministradores de la familia pueden crear invitaciones
  select family_id into v_family_id 
  from profiles 
  where id = v_user_id and role in ('FAMILY_ADULT', 'SUPER_ADMIN');

  if v_family_id is null then
    return jsonb_build_object('success', false, 'message', 'Solo un adulto coadministrador puede generar invitaciones');
  end if;

  -- Habilitar contexto interno para co_admin_invites
  perform set_config('app.invites_internal_call', 'true', true);

  -- Generar token aleatorio criptográficamente seguro de 64 caracteres hex (32 bytes)
  v_token_plain := encode(gen_random_bytes(32), 'hex');
  -- Almacenar únicamente el HASH SHA-256 en la base de datos
  v_token_hash := encode(digest(v_token_plain, 'sha256'), 'hex');
  v_expires_at := now() + interval '48 hours';

  -- Invalidar invitaciones previas pendientes del mismo rol en esta familia
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
    v_token_hash,
    v_expires_at
  );

  return jsonb_build_object(
    'success', true,
    'token', v_token_plain,
    'expires_at', v_expires_at,
    'target_relationship', p_target_relationship
  );
end;
$$;

-- 3. Obtener detalles públicos de la invitación mediante el HASH del token recibido
create or replace function get_invite_details(
  p_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_token_hash text;
  v_invite record;
begin
  if p_token is null or length(trim(p_token)) = 0 then
    return jsonb_build_object('valid', false, 'message', 'Token de invitación vacío o no provisto');
  end if;

  -- Calcular el hash SHA-256 del token provisto en la URL
  v_token_hash := encode(digest(p_token, 'sha256'), 'hex');

  select i.*, f.name as family_name, p.name as inviter_name
  into v_invite
  from co_admin_invites i
  join families f on f.id = i.family_id
  join profiles p on p.id = i.created_by_user_id
  where i.token_hash = v_token_hash
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

-- 4. Reclamar vínculo de coadministrador con paridad total y protección de concurrencia
create or replace function claim_coadmin_link(
  p_token text,
  p_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_token_hash text;
  v_invite record;
  v_user_id uuid;
  v_user_email text;
  v_existing_profile record;
  v_has_existing_profile boolean := false;
  v_other_adult record;
  v_clean_name text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return jsonb_build_object('success', false, 'message', 'Usuario no autenticado');
  end if;

  if p_token is null or length(trim(p_token)) = 0 then
    return jsonb_build_object('success', false, 'message', 'Token de vinculación no provisto');
  end if;

  -- Habilitar contexto interno para co_admin_invites y profiles
  perform set_config('app.invites_internal_call', 'true', true);
  perform set_config('app.profile_internal_call', 'true', true);

  -- Calcular hash SHA-256 del token plano
  v_token_hash := encode(digest(p_token, 'sha256'), 'hex');

  -- Bloqueo FOR UPDATE para mitigar ataques de concurrencia y uso simultáneo
  select * into v_invite 
  from co_admin_invites
  where token_hash = v_token_hash
  for update;

  if not found then
    return jsonb_build_object('success', false, 'message', 'El enlace de vinculación no es válido o no existe');
  end if;

  -- 1. Validar que no haya sido utilizado
  if v_invite.used_at is not null then
    return jsonb_build_object('success', false, 'message', 'Este enlace de vinculación ya ha sido utilizado anteriormente');
  end if;

  -- 2. Validar vigencia temporal
  if v_invite.expires_at <= now() then
    return jsonb_build_object('success', false, 'message', 'Este enlace de vinculación ha expirado (vigencia 48h)');
  end if;

  -- 3. Protección contra auto-vinculación
  if v_invite.created_by_user_id = v_user_id then
    return jsonb_build_object('success', false, 'message', 'No puedes utilizar una invitación creada por ti mismo');
  end if;

  -- 4. Validar si el usuario ya pertenece a una familia registrada
  select * into v_existing_profile from profiles where id = v_user_id;
  v_has_existing_profile := (v_existing_profile.id is not null);

  if v_has_existing_profile and v_existing_profile.family_id is not null then
    if v_existing_profile.family_id <> v_invite.family_id then
      return jsonb_build_object('success', false, 'message', 'Tu usuario ya pertenece a otra familia registrada en MELOMUS. Debes usar una cuenta distinta.');
    else
      return jsonb_build_object('success', false, 'message', 'Tu usuario ya pertenece a esta familia con el rol de ' || coalesce(v_existing_profile.relationship, 'adulto') || ' y no puede cambiar su parentesco ni rol mediante otra invitación');
    end if;
  end if;

  -- 5. Validar si el rol de destino ya está ocupado por otra persona en la familia
  select * into v_other_adult 
  from profiles 
  where family_id = v_invite.family_id 
    and relationship = v_invite.target_relationship
    and id <> v_user_id;
  if found then
    return jsonb_build_object('success', false, 'message', 'El rol de ' || v_invite.target_relationship || ' ya está ocupado en esta familia');
  end if;

  -- Obtener email del usuario en auth.users
  select email into v_user_email from auth.users where id = v_user_id;

  v_clean_name := trim(coalesce(p_name, ''));
  if length(v_clean_name) = 0 then
    v_clean_name := case when v_invite.target_relationship = 'papa' then 'Papá' else 'Mamá' end;
  end if;

  -- =========================================================================
  -- PASO 1: MARCAR LA INVITACIÓN COMO RECLAMADA POR auth.uid() PRIMERO
  -- =========================================================================
  update co_admin_invites
  set used_at = now(),
      used_by_user_id = v_user_id
  where id = v_invite.id;

  -- =========================================================================
  -- PASO 2: CREAR O ACTUALIZAR EL PERFIL (ahora el trigger valida la invitación ya reclamada)
  -- =========================================================================
  if v_has_existing_profile then
    update profiles
    set family_id = v_invite.family_id,
        relationship = v_invite.target_relationship,
        member_id = v_invite.target_relationship,
        role = 'FAMILY_ADULT',
        name = v_clean_name,
        avatar_color = case when v_invite.target_relationship = 'papa' then '#3b82f6' else '#ec4899' end,
        avatar_emoji = case when v_invite.target_relationship = 'papa' then '🌿' else '🌸' end,
        updated_at = now()
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
      v_clean_name,
      'FAMILY_ADULT',
      v_invite.target_relationship,
      v_invite.target_relationship,
      case when v_invite.target_relationship = 'papa' then '#3b82f6' else '#ec4899' end,
      case when v_invite.target_relationship = 'papa' then '🌿' else '🌸' end
    );
  end if;

  -- 8. Crear o actualizar miembro en family_members
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
    v_clean_name,
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

  return jsonb_build_object(
    'success', true, 
    'message', 'Vinculación exitosa como adulto principal',
    'family_id', v_invite.family_id,
    'relationship', v_invite.target_relationship
  );
end;
$$;

-- Permisos Mínimos de Ejecución en RPC
revoke all on function get_invite_details(text) from public;
grant execute on function get_invite_details(text) to anon, authenticated;

revoke all on function register_primary_adult(text, text, text) from public, anon;
grant execute on function register_primary_adult(text, text, text) to authenticated;

revoke all on function create_co_admin_invite(text) from public, anon;
grant execute on function create_co_admin_invite(text) to authenticated;

revoke all on function claim_coadmin_link(text, text) from public, anon;
grant execute on function claim_coadmin_link(text, text) to authenticated;

-- ------------------------------------------------------------------------------
-- 6. PUBLICACIÓN SUPABASE REALTIME (TIEMPO REAL ENTRE TELÉFONOS)
-- ------------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end;
$$;

do $$
declare
  t text;
  tables text[] := array[
    'families', 
    'profiles', 
    'family_members', 
    'tasks', 
    'calendar_events', 
    'habits', 
    'finances_expenses', 
    'finances_incomes', 
    'finances_bills', 
    'finances_debts', 
    'finances_budgets', 
    'finances_goals', 
    'health_records', 
    'couple_records', 
    'home_records', 
    'rewards', 
    'points_history', 
    'notifications', 
    'app_customizations', 
    'push_subscriptions'
  ];
begin
  foreach t in array tables loop
    if not exists (
      select 1 from pg_publication_tables 
      where pubname = 'supabase_realtime' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table %I', t);
    end if;
  end loop;
end;
$$;

-- ------------------------------------------------------------------------------
-- 7. REPLICA IDENTITY FULL (TRANSMISIÓN DE ELIMINACIONES EN TIEMPO REAL)
-- ------------------------------------------------------------------------------

alter table families replica identity full;
alter table profiles replica identity full;
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

-- ==============================================================================
-- FIN DE INSTALACIÓN INICIAL MELOMUS
-- ==============================================================================
