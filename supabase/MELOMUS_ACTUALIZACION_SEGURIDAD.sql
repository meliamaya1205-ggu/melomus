-- ==============================================================================
-- MELOMUS HOGAR — ACTUALIZACIÓN DEFINITIVA DE SEGURIDAD (POST-INSTALACIÓN)
-- ==============================================================================
-- Archivo: MELOMUS_ACTUALIZACION_SEGURIDAD.sql
-- Propósito: Blindar la base de datos existente contra elusión de autoría,
--            privatización indebida de registros y manipulación de invitaciones,
--            garantizando que ninguna función SECURITY DEFINER pueda eludir las reglas.
-- Seguridad: 100% NO DESTRUCTIVO. No borra tablas, columnas, familias ni usuarios.
-- Ejecución: Copiar y pegar completo en Supabase -> SQL Editor -> Run (Ctrl+Enter)
-- ==============================================================================

begin;

-- Asegurar disponibilidad de funciones criptográficas (gen_random_bytes, digest)
create extension if not exists "pgcrypto";

-- ==============================================================================
-- 1. BLINDAJE DE COADMINISTRADOR (co_admin_invites)
-- ==============================================================================
-- Prohíbe escrituras directas (INSERT, UPDATE, DELETE) desde el cliente.
-- Exige flag transaccional interno (app.invites_internal_call = 'true')
-- Y valida además invariantes de identidad, inmutabilidad y no-reutilización.

-- 1.0 Ajustar foreign key de used_by_user_id hacia auth.users(id)
-- Esto permite registrar used_by_user_id en co_admin_invites antes de que exista su fila en profiles,
-- eliminando la necesidad de aceptar invitaciones pendientes en el trigger de perfiles.
do $$
declare
  v_con_name text;
begin
  for v_con_name in (
    select tc.constraint_name
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name
      and tc.table_schema = kcu.table_schema
    where tc.table_name = 'co_admin_invites'
      and tc.constraint_type = 'FOREIGN KEY'
      and kcu.column_name = 'used_by_user_id'
  ) loop
    execute 'alter table co_admin_invites drop constraint ' || quote_ident(v_con_name);
  end loop;

  alter table co_admin_invites
    add constraint co_admin_invites_used_by_user_id_fkey
    foreign key (used_by_user_id) references auth.users(id) on delete set null;
end $$;

-- Permitir que un perfil pueda existir temporalmente sin familia antes de la vinculación
alter table profiles alter column family_id drop not null;
alter table profiles alter column relationship drop not null;
alter table profiles alter column member_id drop not null;

-- 1.0.1 Funciones auxiliares RLS seguras (idempotentes, security definer y search_path protegido)
create or replace function get_auth_family_id()
returns uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select family_id from profiles where id = auth.uid();
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

-- 1.1 Trigger con verificación multinivel de autorización e invariantes
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

-- 1.2 Limpiar políticas RLS existentes para evitar permisos residuales
drop policy if exists "co_admin_invites_manage_family" on co_admin_invites;
drop policy if exists "co_admin_invites_all" on co_admin_invites;
drop policy if exists "co_admin_invites_select_adults" on co_admin_invites;
drop policy if exists "co_admin_invites_select_family" on co_admin_invites;

-- 1.3 Política RLS restrictiva: solo permite SELECT a adultos de la familia
create policy "co_admin_invites_select_adults" on co_admin_invites
  for select using (family_id = get_auth_family_id() and is_family_adult());

-- 1.4 Revocar privilegios de escritura en la tabla (defensa en profundidad)
revoke insert, update, delete on co_admin_invites from authenticated, anon, public;
grant select on co_admin_invites to authenticated;


-- ==============================================================================
-- 2. PROTECCIÓN CONTRA ESCALADA EN PERFILES (profiles)
-- ==============================================================================
-- Impide que cualquier usuario inserte o modifique directamente su profile,
-- family_id, role, relationship, member_id o email, aun llamando a funciones
-- SECURITY DEFINER no autorizadas.
-- Solo las RPCs de vinculación autorizadas pueden gestionarlos bajo validación estricta.

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

-- 2.2 Políticas RLS y Privilegios en profiles
drop policy if exists "profiles_insert" on profiles;
drop policy if exists "profiles_insert_self" on profiles;
drop policy if exists "profiles_manage" on profiles;
drop policy if exists "profiles_all" on profiles;
drop policy if exists "profiles_select_family" on profiles;
drop policy if exists "profiles_update_self" on profiles;

create policy "profiles_select_family" on profiles for select using (
  family_id = get_auth_family_id()
);

create policy "profiles_update_self" on profiles for update using (
  id = auth.uid()
);

-- Revocar INSERT y DELETE directos a nivel de motor (defensa en profundidad)
revoke insert, delete on profiles from authenticated, anon, public;
revoke update on profiles from authenticated, anon, public;
grant update (name, avatar_color, avatar_emoji) on profiles to authenticated;
grant select on profiles to authenticated;


-- ==============================================================================
-- 3. PROTECCIÓN DE AUTORÍA Y PRIVACIDAD EN FINANZAS (finances_*)
-- ==============================================================================
-- La protección se basa en auth.uid() y NO en current_user. Esto asegura que
-- NINGUNA función SECURITY DEFINER pueda falsificar created_by_user_id ni eludir
-- las restricciones cuando se ejecute dentro de la sesión de un usuario.

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

-- Triggers de autoría en las 4 tablas financieras (INSERT, UPDATE y DELETE)
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

-- ==============================================================================
-- 3.0 LIMPIEZA DINÁMICA DE TODAS LAS POLÍTICAS RLS PREVIAS EN TABLAS DE PRIVACIDAD
-- ==============================================================================
-- En PostgreSQL, las políticas RLS son PERMISSIVE por defecto (se evalúan con OR).
-- Si coexiste una política anterior permisiva (como couple_records_select_policy,
-- finances_bills_select_policy, habits_select_policy, o políticas FOR ALL como
-- finances_goals_all / finances_budgets_all sin filtros estrictos), dicha política
-- anularía las restricciones de privacidad y permitiría accesos indebidos.
-- Para garantizar hermeticidad total, purgamos dinámicamente de pg_policies TODAS las
-- políticas existentes en las 8 tablas de finanzas, pareja y hábitos antes de recrearlas.

do $$
declare
  r record;
begin
  for r in (
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'finances_expenses',
        'finances_incomes',
        'finances_bills',
        'finances_debts',
        'finances_budgets',
        'finances_goals',
        'couple_records',
        'habits'
      )
  ) loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- Habilitar explícitamente Row Level Security en las 8 tablas
alter table finances_expenses enable row level security;
alter table finances_incomes enable row level security;
alter table finances_bills enable row level security;
alter table finances_debts enable row level security;
alter table finances_budgets enable row level security;
alter table finances_goals enable row level security;
alter table couple_records enable row level security;
alter table habits enable row level security;

-- Políticas RLS limpiadas y blindadas: Gastos
drop policy if exists "finances_expenses_select" on finances_expenses;
drop policy if exists "finances_expenses_insert" on finances_expenses;
drop policy if exists "finances_expenses_update" on finances_expenses;
drop policy if exists "finances_expenses_delete" on finances_expenses;
drop policy if exists "finances_expenses_manage" on finances_expenses;
drop policy if exists "finances_expenses_all" on finances_expenses;
drop policy if exists "finances_expenses_select_policy" on finances_expenses;
drop policy if exists "finances_expenses_insert_policy" on finances_expenses;
drop policy if exists "finances_expenses_update_policy" on finances_expenses;
drop policy if exists "finances_expenses_delete_policy" on finances_expenses;

create policy "finances_expenses_select" on finances_expenses for select using (
  family_id = get_auth_family_id() and (scope = 'family' or created_by_user_id = auth.uid())
);

create policy "finances_expenses_insert" on finances_expenses for insert with check (
  family_id = get_auth_family_id() and (
    scope = 'family' or (scope = 'personal' and created_by_user_id = auth.uid())
  )
);

create policy "finances_expenses_update" on finances_expenses for update using (
  family_id = get_auth_family_id() and (scope = 'family' or created_by_user_id = auth.uid())
) with check (
  family_id = get_auth_family_id() and (
    scope = 'family' or (scope = 'personal' and created_by_user_id = auth.uid())
  )
);

create policy "finances_expenses_delete" on finances_expenses for delete using (
  family_id = get_auth_family_id() and (
    (scope = 'family' and is_family_adult()) or (scope = 'personal' and created_by_user_id = auth.uid())
  )
);

-- Políticas RLS limpiadas y blindadas: Ingresos
drop policy if exists "finances_incomes_select" on finances_incomes;
drop policy if exists "finances_incomes_insert" on finances_incomes;
drop policy if exists "finances_incomes_update" on finances_incomes;
drop policy if exists "finances_incomes_delete" on finances_incomes;
drop policy if exists "finances_incomes_manage" on finances_incomes;
drop policy if exists "finances_incomes_all" on finances_incomes;
drop policy if exists "finances_incomes_select_policy" on finances_incomes;
drop policy if exists "finances_incomes_insert_policy" on finances_incomes;
drop policy if exists "finances_incomes_update_policy" on finances_incomes;
drop policy if exists "finances_incomes_delete_policy" on finances_incomes;

create policy "finances_incomes_select" on finances_incomes for select using (
  family_id = get_auth_family_id() and (scope = 'family' or created_by_user_id = auth.uid())
);

create policy "finances_incomes_insert" on finances_incomes for insert with check (
  family_id = get_auth_family_id() and (
    scope = 'family' or (scope = 'personal' and created_by_user_id = auth.uid())
  )
);

create policy "finances_incomes_update" on finances_incomes for update using (
  family_id = get_auth_family_id() and (scope = 'family' or created_by_user_id = auth.uid())
) with check (
  family_id = get_auth_family_id() and (
    scope = 'family' or (scope = 'personal' and created_by_user_id = auth.uid())
  )
);

create policy "finances_incomes_delete" on finances_incomes for delete using (
  family_id = get_auth_family_id() and (
    (scope = 'family' and is_family_adult()) or (scope = 'personal' and created_by_user_id = auth.uid())
  )
);

-- Políticas RLS limpiadas y blindadas: Cuentas por Pagar
drop policy if exists "finances_bills_select" on finances_bills;
drop policy if exists "finances_bills_insert" on finances_bills;
drop policy if exists "finances_bills_update" on finances_bills;
drop policy if exists "finances_bills_delete" on finances_bills;
drop policy if exists "finances_bills_manage" on finances_bills;
drop policy if exists "finances_bills_all" on finances_bills;
drop policy if exists "finances_bills_select_policy" on finances_bills;
drop policy if exists "finances_bills_insert_policy" on finances_bills;
drop policy if exists "finances_bills_update_policy" on finances_bills;
drop policy if exists "finances_bills_delete_policy" on finances_bills;

create policy "finances_bills_select" on finances_bills for select using (
  family_id = get_auth_family_id() and (scope = 'family' or created_by_user_id = auth.uid())
);

create policy "finances_bills_insert" on finances_bills for insert with check (
  family_id = get_auth_family_id() and (
    scope = 'family' or (scope = 'personal' and created_by_user_id = auth.uid())
  )
);

create policy "finances_bills_update" on finances_bills for update using (
  family_id = get_auth_family_id() and (scope = 'family' or created_by_user_id = auth.uid())
) with check (
  family_id = get_auth_family_id() and (
    scope = 'family' or (scope = 'personal' and created_by_user_id = auth.uid())
  )
);

create policy "finances_bills_delete" on finances_bills for delete using (
  family_id = get_auth_family_id() and (
    (scope = 'family' and is_family_adult()) or (scope = 'personal' and created_by_user_id = auth.uid())
  )
);

-- Políticas RLS limpiadas y blindadas: Deudas
drop policy if exists "finances_debts_select" on finances_debts;
drop policy if exists "finances_debts_insert" on finances_debts;
drop policy if exists "finances_debts_update" on finances_debts;
drop policy if exists "finances_debts_delete" on finances_debts;
drop policy if exists "finances_debts_manage" on finances_debts;
drop policy if exists "finances_debts_all" on finances_debts;
drop policy if exists "finances_debts_select_policy" on finances_debts;
drop policy if exists "finances_debts_insert_policy" on finances_debts;
drop policy if exists "finances_debts_update_policy" on finances_debts;
drop policy if exists "finances_debts_delete_policy" on finances_debts;

create policy "finances_debts_select" on finances_debts for select using (
  family_id = get_auth_family_id() and (scope = 'family' or created_by_user_id = auth.uid())
);

create policy "finances_debts_insert" on finances_debts for insert with check (
  family_id = get_auth_family_id() and (
    scope = 'family' or (scope = 'personal' and created_by_user_id = auth.uid())
  )
);

create policy "finances_debts_update" on finances_debts for update using (
  family_id = get_auth_family_id() and (scope = 'family' or created_by_user_id = auth.uid())
) with check (
  family_id = get_auth_family_id() and (
    scope = 'family' or (scope = 'personal' and created_by_user_id = auth.uid())
  )
);

create policy "finances_debts_delete" on finances_debts for delete using (
  family_id = get_auth_family_id() and (
    (scope = 'family' and is_family_adult()) or (scope = 'personal' and created_by_user_id = auth.uid())
  )
);

-- Políticas RLS limpiadas y blindadas: Presupuestos por Categoría (Familiar Co-admin)
-- Reemplaza cualquier política FOR ALL previa con políticas granulares explícitas
drop policy if exists "finances_budgets_select" on finances_budgets;
drop policy if exists "finances_budgets_insert" on finances_budgets;
drop policy if exists "finances_budgets_update" on finances_budgets;
drop policy if exists "finances_budgets_delete" on finances_budgets;
drop policy if exists "finances_budgets_manage" on finances_budgets;
drop policy if exists "finances_budgets_all" on finances_budgets;
drop policy if exists "finances_budgets_select_policy" on finances_budgets;
drop policy if exists "finances_budgets_insert_policy" on finances_budgets;
drop policy if exists "finances_budgets_update_policy" on finances_budgets;
drop policy if exists "finances_budgets_delete_policy" on finances_budgets;
drop policy if exists "finances_budgets_all_policy" on finances_budgets;

create policy "finances_budgets_select" on finances_budgets for select using (
  family_id = get_auth_family_id() and is_family_adult()
);

create policy "finances_budgets_insert" on finances_budgets for insert with check (
  family_id = get_auth_family_id() and is_family_adult()
);

create policy "finances_budgets_update" on finances_budgets for update using (
  family_id = get_auth_family_id() and is_family_adult()
) with check (
  family_id = get_auth_family_id() and is_family_adult()
);

create policy "finances_budgets_delete" on finances_budgets for delete using (
  family_id = get_auth_family_id() and is_family_adult()
);

-- Políticas RLS limpiadas y blindadas: Metas de Ahorro Familiar (Familiar Co-admin)
-- Reemplaza cualquier política FOR ALL previa con políticas granulares explícitas
drop policy if exists "finances_goals_select" on finances_goals;
drop policy if exists "finances_goals_insert" on finances_goals;
drop policy if exists "finances_goals_update" on finances_goals;
drop policy if exists "finances_goals_delete" on finances_goals;
drop policy if exists "finances_goals_manage" on finances_goals;
drop policy if exists "finances_goals_all" on finances_goals;
drop policy if exists "finances_goals_select_policy" on finances_goals;
drop policy if exists "finances_goals_insert_policy" on finances_goals;
drop policy if exists "finances_goals_update_policy" on finances_goals;
drop policy if exists "finances_goals_delete_policy" on finances_goals;
drop policy if exists "finances_goals_all_policy" on finances_goals;

create policy "finances_goals_select" on finances_goals for select using (
  family_id = get_auth_family_id() and is_family_adult()
);

create policy "finances_goals_insert" on finances_goals for insert with check (
  family_id = get_auth_family_id() and is_family_adult()
);

create policy "finances_goals_update" on finances_goals for update using (
  family_id = get_auth_family_id() and is_family_adult()
) with check (
  family_id = get_auth_family_id() and is_family_adult()
);

create policy "finances_goals_delete" on finances_goals for delete using (
  family_id = get_auth_family_id() and is_family_adult()
);



-- ==============================================================================
-- 4. PRIVACIDAD Y PROTECCIÓN DE AUTORÍA EN PAREJA (couple_records)
-- ==============================================================================
-- Se protege created_by_user_id y se prohíbe que el cónyuge privatice acuerdos
-- o registros compartidos creados por el otro adulto.

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

-- Políticas RLS limpiadas y blindadas para Pareja
drop policy if exists "couple_records_select" on couple_records;
drop policy if exists "couple_records_insert" on couple_records;
drop policy if exists "couple_records_update" on couple_records;
drop policy if exists "couple_records_delete" on couple_records;
drop policy if exists "couple_records_manage" on couple_records;
drop policy if exists "couple_records_all" on couple_records;
drop policy if exists "couple_records_select_policy" on couple_records;
drop policy if exists "couple_records_insert_policy" on couple_records;
drop policy if exists "couple_records_update_policy" on couple_records;
drop policy if exists "couple_records_delete_policy" on couple_records;
drop policy if exists "couple_records_all_policy" on couple_records;

create policy "couple_records_select" on couple_records for select using (
  family_id = get_auth_family_id() 
  and is_family_adult()
  and (
    coalesce((data->>'isPrivate')::boolean, false) = false 
    or created_by_user_id = auth.uid()
  )
);

create policy "couple_records_insert" on couple_records for insert with check (
  family_id = get_auth_family_id() 
  and is_family_adult()
  and (
    coalesce((data->>'isPrivate')::boolean, false) = false 
    or created_by_user_id = auth.uid()
  )
);

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

create policy "couple_records_delete" on couple_records for delete using (
  family_id = get_auth_family_id() 
  and is_family_adult()
  and (
    coalesce((data->>'isPrivate')::boolean, false) = false 
    or created_by_user_id = auth.uid()
  )
);


-- ==============================================================================
-- 5. PROTECCIÓN DE AUTORÍA Y PRIVACIDAD EN HÁBITOS (habits)
-- ==============================================================================

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

drop policy if exists "habits_select_privacy" on habits;
drop policy if exists "habits_insert_family" on habits;
drop policy if exists "habits_update_privacy" on habits;
drop policy if exists "habits_delete_privacy" on habits;
drop policy if exists "habits_select" on habits;
drop policy if exists "habits_insert" on habits;
drop policy if exists "habits_update" on habits;
drop policy if exists "habits_delete" on habits;
drop policy if exists "habits_manage" on habits;
drop policy if exists "habits_all" on habits;
drop policy if exists "habits_select_policy" on habits;
drop policy if exists "habits_insert_policy" on habits;
drop policy if exists "habits_update_policy" on habits;
drop policy if exists "habits_delete_policy" on habits;
drop policy if exists "habits_all_policy" on habits;

create policy "habits_select_privacy" on habits for select using (
  family_id = get_auth_family_id() and (is_private = false or created_by_user_id = auth.uid())
);

create policy "habits_insert_family" on habits for insert with check (
  family_id = get_auth_family_id() and (is_private = false or created_by_user_id = auth.uid())
);

create policy "habits_update_privacy" on habits for update using (
  family_id = get_auth_family_id() and (is_private = false or created_by_user_id = auth.uid())
) with check (
  family_id = get_auth_family_id() and (is_private = false or created_by_user_id = auth.uid())
);

create policy "habits_delete_privacy" on habits for delete using (
  family_id = get_auth_family_id() and (is_private = false or created_by_user_id = auth.uid())
);


-- ==============================================================================
-- 6. RPCs DE VINCULACIÓN CON HABILITACIÓN DE CONTEXTO INTERNO
-- ==============================================================================
-- Se reinstalan las funciones oficiales para garantizar que activen las variables
-- de contexto transaccional 'app.invites_internal_call' y 'app.profile_internal_call'
-- requeridas por los triggers protectores.

-- 6.1 Registro inicial del adulto principal
create or replace function register_primary_adult(
  p_name text,
  p_relationship text,
  p_family_name text default null
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

  insert into families (name)
  values (coalesce(nullif(trim(p_family_name), ''), 'Nuestra Familia'))
  returning id into v_family_id;

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
  on conflict (family_id, id) do update
  set user_id = v_user_id,
      name = v_clean_name,
      avatar_color = case when p_relationship = 'papa' then '#3b82f6' else '#ec4899' end,
      avatar_emoji = case when p_relationship = 'papa' then '🌿' else '🌸' end;

  return jsonb_build_object(
    'success', true,
    'family_id', v_family_id,
    'relationship', p_relationship,
    'message', 'Familia y perfil creados con éxito'
  );
end;
$$;

-- 6.2 Crear invitación para el segundo adulto
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

  select family_id into v_family_id 
  from profiles 
  where id = v_user_id and role in ('FAMILY_ADULT', 'SUPER_ADMIN');

  if v_family_id is null then
    return jsonb_build_object('success', false, 'message', 'Solo un adulto coadministrador puede generar invitaciones');
  end if;

  -- Habilitar contexto interno para co_admin_invites
  perform set_config('app.invites_internal_call', 'true', true);

  v_token_plain := encode(gen_random_bytes(32), 'hex');
  v_token_hash := encode(digest(v_token_plain, 'sha256'), 'hex');
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

-- 6.3 Consultar detalles públicos de la invitación
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

-- 6.4 Reclamar vínculo de coadministrador
create or replace function claim_coadmin_link(
  p_token text,
  p_name text default null
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

  v_token_hash := encode(digest(p_token, 'sha256'), 'hex');

  select * into v_invite 
  from co_admin_invites
  where token_hash = v_token_hash
  for update;

  if not found then
    return jsonb_build_object('success', false, 'message', 'El enlace de vinculación no es válido o no existe');
  end if;

  if v_invite.used_at is not null then
    return jsonb_build_object('success', false, 'message', 'Este enlace de vinculación ya ha sido utilizado anteriormente');
  end if;

  if v_invite.expires_at <= now() then
    return jsonb_build_object('success', false, 'message', 'Este enlace de vinculación ha expirado (vigencia 48h)');
  end if;

  if v_invite.created_by_user_id = v_user_id then
    return jsonb_build_object('success', false, 'message', 'No puedes utilizar una invitación creada por ti mismo');
  end if;

  select * into v_existing_profile from profiles where id = v_user_id;
  v_has_existing_profile := (v_existing_profile.id is not null);

  if v_has_existing_profile and v_existing_profile.family_id is not null then
    if v_existing_profile.family_id <> v_invite.family_id then
      return jsonb_build_object('success', false, 'message', 'Tu usuario ya pertenece a otra familia registrada en MELOMUS. Debes usar una cuenta distinta.');
    else
      return jsonb_build_object('success', false, 'message', 'Tu usuario ya pertenece a esta familia con el rol de ' || coalesce(v_existing_profile.relationship, 'adulto') || ' y no puede cambiar su parentesco ni rol mediante otra invitación');
    end if;
  end if;

  select * into v_other_adult 
  from profiles 
  where family_id = v_invite.family_id 
    and relationship = v_invite.target_relationship
    and id <> v_user_id;
  if found then
    return jsonb_build_object('success', false, 'message', 'El rol de ' || v_invite.target_relationship || ' ya está ocupado en esta familia');
  end if;

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

  -- 3. Vincular en family_members
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
  on conflict (family_id, id) do update
  set user_id = v_user_id,
      name = v_clean_name,
      avatar_color = case when v_invite.target_relationship = 'papa' then '#3b82f6' else '#ec4899' end,
      avatar_emoji = case when v_invite.target_relationship = 'papa' then '🌿' else '🌸' end;

  return jsonb_build_object(
    'success', true,
    'family_id', v_invite.family_id,
    'relationship', v_invite.target_relationship,
    'message', 'Vinculación exitosa como adulto principal'
  );
end;
$$;

-- 6.5 Garantizar permisos de ejecución
revoke all on function get_invite_details(text) from public;
grant execute on function get_invite_details(text) to anon, authenticated;

revoke all on function register_primary_adult(text, text, text) from public, anon;
grant execute on function register_primary_adult(text, text, text) to authenticated;

revoke all on function create_co_admin_invite(text) from public, anon;
grant execute on function create_co_admin_invite(text) to authenticated;

revoke all on function claim_coadmin_link(text, text) from public, anon;
grant execute on function claim_coadmin_link(text, text) to authenticated;

-- ==============================================================================
-- 7. SINCRONIZACIÓN EN TIEMPO REAL (SUPABASE REALTIME & REPLICA IDENTITY FULL)
-- ==============================================================================
-- Asegura que todas las tablas colaborativas estén en la publicación supabase_realtime
-- y tengan REPLICA IDENTITY FULL para transmitir filas eliminadas a ambos celulares (Mamá y Papá).
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
    'finances_incomes',
    'finances_expenses',
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
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;

  foreach t in array tables loop
    if not exists (
      select 1 from pg_publication_tables 
      where pubname = 'supabase_realtime' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table %I', t);
    end if;
  end loop;
end $$;

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

commit;
