-- ==============================================================================
-- MELOMUS HOGAR Y MELOMUS KIDS — MIGRACIÓN DEFINITIVA INTEGRAL
-- ==============================================================================
-- Archivo: MELOMUS_ACTUALIZACION_DEFINITIVA.sql
-- Propósito: Actualización integral y definitiva para Supabase:
--   1. BLINDAJE DE COADMINISTRACIÓN: Mamá y Papá (FAMILY_ADULT) con permisos idénticos.
--   2. RLS ESTRICTO: Políticas de seguridad para las 21 tablas de producción.
--      Privacidad total en finanzas personales, salud de adultos y registros de pareja.
--   3. INFRAESTRUCTURA MELOMUS KIDS: Tablas kid_device_invites, kid_devices,
--      kid_redemption_requests y extensión retrocompatible de tasks.
--   4. VINCULACIÓN EN DOS FASES: Enlace de 15 min + PIN de 4 dígitos + aprobación obligatoria
--      explícita de Mamá o Papá antes de activar el dispositivo.
--   5. PROTECCIÓN CONTRA FUERZA BRUTA: Bloqueo de dispositivo tras 5 fallos de PIN
--      y función para que los padres restablezcan el PIN en caso de olvido.
--   6. AISLAMIENTO TOTAL INFANTIL: Funciones RPC SECURITY DEFINER seguras. Los niños no
--      pueden acceder por red ni consultar datos privados de adultos.
--   7. SINCRONIZACIÓN REALTIME: Publicación de tablas en supabase_realtime con REPLICA IDENTITY FULL.
--
-- Seguridad: 100% NO DESTRUCTIVO. No elimina tablas ni datos existentes.
-- Ejecución: Copiar y pegar todo el contenido en Supabase -> SQL Editor -> Run (Ctrl+Enter)
-- ==============================================================================

begin;

-- ==============================================================================
-- PARTE A: BLINDAJE DE SEGURIDAD, COADMINISTRACIÓN Y RLS DE ADULTOS
-- ==============================================================================

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

-- ==============================================================================
-- PARTE B: INFRAESTRUCTURA Y FUNCIONES DE MELOMUS KIDS
-- ==============================================================================

-- ==============================================================================
-- MELOMUS HOGAR — MIGRACIÓN INCREMENTAL: MELOMUS KIDS
-- ==============================================================================
-- Archivo: MELOMUS_KIDS_MIGRACION.sql
-- Propósito: Implementar la infraestructura de MELOMUS Kids:
--            1. Invitaciones individuales de vinculación (caducan a los 15 min, un solo uso).
--            2. Registro de dispositivos infantiles con aprobación obligatoria de Mamá o Papá.
--            3. Desbloqueo por PIN de 4 dígitos con protección contra fuerza bruta (bloqueo tras 5 fallos).
--            4. RPCs seguras (SECURITY DEFINER) para tareas infantiles, hábitos, recompensas y calendario.
--            5. Aprobación atómica de tareas y recompensas sin riesgo de doble asignación o deducción.
--            6. Aislamiento estricto: ningún niño puede acceder a finanzas ni datos privados de adultos.
-- Seguridad: 100% NO DESTRUCTIVO. Preserva todas las tablas y datos existentes.
-- ==============================================================================


-- Asegurar disponibilidad de funciones criptográficas
create extension if not exists "pgcrypto";

-- ==============================================================================
-- 1. TABLAS INCREMENTALES PARA MELOMUS KIDS
-- ==============================================================================

-- 1.1 Invitaciones individuales para vincular dispositivos infantiles
create table if not exists kid_device_invites (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  child_member_id text not null,
  created_by_user_id uuid references profiles(id) on delete set null,
  token_hash text not null unique,
  device_name_hint text,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_kid_device_invites_hash on kid_device_invites(token_hash);
create index if not exists idx_kid_device_invites_family on kid_device_invites(family_id, child_member_id);

-- 1.2 Dispositivos infantiles autorizados
create table if not exists kid_devices (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  child_member_id text not null,
  device_name text not null,
  device_token_hash text not null unique,
  pin_hash text not null,
  status text not null default 'pending_approval' check (status in ('pending_approval', 'active', 'revoked')),
  failed_pin_attempts integer not null default 0,
  locked_until timestamptz,
  last_active_at timestamptz default now(),
  approved_by_user_id uuid references profiles(id) on delete set null,
  approved_at timestamptz,
  revoked_by_user_id uuid references profiles(id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_kid_devices_hash on kid_devices(device_token_hash);
create index if not exists idx_kid_devices_family_child on kid_devices(family_id, child_member_id);

-- 1.3 Solicitudes de canje de recompensas realizadas por los niños
create table if not exists kid_redemption_requests (
  id text not null,
  family_id uuid not null references families(id) on delete cascade,
  child_member_id text not null,
  reward_id text not null,
  reward_title text not null,
  points_cost integer not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  requested_at timestamptz not null default now(),
  reviewed_by_user_id uuid references profiles(id) on delete set null,
  reviewed_at timestamptz,
  primary key (family_id, id)
);

create index if not exists idx_kid_redemptions_family on kid_redemption_requests(family_id, status);

-- 1.4 Extensión retrocompatible de la tabla tasks para permitir 'pending_approval'
alter table tasks drop constraint if exists tasks_status_check;
alter table tasks add constraint tasks_status_check 
  check (status in ('pending', 'in_progress', 'pending_approval', 'completed'));

-- Columnas auxiliares en tasks si no existían previamente
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'tasks' and column_name = 'points_reward'
  ) then
    alter table tasks add column points_reward integer not null default 5;
  end if;

  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'tasks' and column_name = 'completed_by'
  ) then
    alter table tasks add column completed_by text;
  end if;
end $$;


-- ==============================================================================
-- 2. HABILITAR ROW LEVEL SECURITY (RLS) EN TABLAS DE KIDS
-- ==============================================================================

alter table kid_device_invites enable row level security;
alter table kid_devices enable row level security;
alter table kid_redemption_requests enable row level security;

-- Limpieza preventiva de políticas antiguas si existieran
drop policy if exists "kid_device_invites_select" on kid_device_invites;
drop policy if exists "kid_devices_select" on kid_devices;
drop policy if exists "kid_redemption_requests_select" on kid_redemption_requests;

-- Solo los adultos de la familia pueden consultar invitaciones, dispositivos y solicitudes de canje
create policy "kid_device_invites_select" on kid_device_invites
  for select to authenticated
  using (family_id = get_auth_family_id() and is_family_adult());

create policy "kid_devices_select" on kid_devices
  for select to authenticated
  using (family_id = get_auth_family_id() and is_family_adult());

create policy "kid_redemption_requests_select" on kid_redemption_requests
  for select to authenticated
  using (family_id = get_auth_family_id() and is_family_adult());

-- Las escrituras directas desde el cliente quedan revocadas (se gestionan 100% mediante RPCs seguras)
revoke insert, update, delete on kid_device_invites from anon, authenticated;
revoke insert, update, delete on kid_devices from anon, authenticated;
revoke insert, update, delete on kid_redemption_requests from anon, authenticated;


-- ==============================================================================
-- 3. FUNCIONES RPC DE ADMINISTRACIÓN (MAMÁ Y PAPÁ)
-- ==============================================================================

-- 3.1 Generar invitación individual para vincular dispositivo infantil
create or replace function create_kid_device_invite(
  p_child_member_id text,
  p_device_name_hint text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_caller_family_id uuid;
  v_child_exists boolean;
  v_child_name text;
  v_raw_token text;
  v_token_hash text;
  v_expires_at timestamptz;
begin
  -- 1. Validar que el llamador sea un adulto autenticado
  if not is_family_adult() then
    raise exception 'Solo un adulto coadministrador puede generar invitaciones para dispositivos infantiles';
  end if;

  v_caller_family_id := get_auth_family_id();
  if v_caller_family_id is null then
    raise exception 'Usuario no vinculado a ninguna familia';
  end if;

  -- 2. Validar que el niño pertenezca a la familia
  select exists (
    select 1 from family_members 
    where family_id = v_caller_family_id 
      and id = p_child_member_id 
      and role = 'child'
  ), name into v_child_exists, v_child_name
  from family_members
  where family_id = v_caller_family_id and id = p_child_member_id;

  if not coalesce(v_child_exists, false) then
    raise exception 'El integrante infantil especificado no existe en la familia';
  end if;

  -- 3. Invalidar invitaciones previas pendientes para este niño
  update kid_device_invites
  set used_at = now()
  where family_id = v_caller_family_id
    and child_member_id = p_child_member_id
    and used_at is null;

  -- 4. Generar token criptográfico aleatorio de 32 bytes (64 hex chars)
  v_raw_token := encode(gen_random_bytes(32), 'hex');
  v_token_hash := encode(digest(v_raw_token, 'sha256'), 'hex');
  v_expires_at := now() + interval '15 minutes';

  -- 5. Insertar invitación
  insert into kid_device_invites (
    family_id,
    child_member_id,
    created_by_user_id,
    token_hash,
    device_name_hint,
    expires_at
  ) values (
    v_caller_family_id,
    p_child_member_id,
    auth.uid(),
    v_token_hash,
    nullif(trim(p_device_name_hint), ''),
    v_expires_at
  );

  return jsonb_build_object(
    'success', true,
    'token', v_raw_token,
    'expires_at', v_expires_at,
    'child_id', p_child_member_id,
    'child_name', v_child_name,
    'message', 'Enlace generado. Válido por 15 minutos.'
  );
end;
$$;

-- 3.2 Listar dispositivos de un niño (Mamá y Papá)
create or replace function list_kid_devices(p_child_member_id text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_caller_family_id uuid;
  v_devices jsonb;
begin
  if not is_family_adult() then
    raise exception 'Acceso no autorizado';
  end if;

  v_caller_family_id := get_auth_family_id();

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', d.id,
      'device_name', d.device_name,
      'status', d.status,
      'is_active', (d.status = 'active'),
      'created_at', d.created_at,
      'last_active_at', d.last_active_at,
      'approved_at', d.approved_at,
      'revoked_at', d.revoked_at,
      'failed_pin_attempts', d.failed_pin_attempts,
      'is_locked', (d.locked_until is not null and d.locked_until > now())
    ) order by d.created_at desc
  ), '[]'::jsonb) into v_devices
  from kid_devices d
  where d.family_id = v_caller_family_id
    and d.child_member_id = p_child_member_id;

  return jsonb_build_object(
    'success', true,
    'devices', v_devices
  );
end;
$$;

-- 3.3 Aprobar activación de un dispositivo infantil (Obligatorio por Mamá o Papá)
create or replace function approve_kid_device_link(p_device_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_caller_family_id uuid;
  v_device record;
begin
  if not is_family_adult() then
    raise exception 'Solo un adulto coadministrador puede aprobar la activación de un dispositivo infantil';
  end if;

  v_caller_family_id := get_auth_family_id();

  update kid_devices
  set status = 'active',
      approved_by_user_id = auth.uid(),
      approved_at = now()
  where id = p_device_id
    and family_id = v_caller_family_id
    and status = 'pending_approval'
  returning * into v_device;

  if not found then
    raise exception 'Dispositivo no encontrado o no está pendiente de aprobación';
  end if;

  return jsonb_build_object(
    'success', true,
    'device_id', v_device.id,
    'child_id', v_device.child_member_id,
    'message', 'Dispositivo autorizado y activado exitosamente'
  );
end;
$$;

-- 3.4 Revocar acceso de un dispositivo infantil (Mamá o Papá)
create or replace function revoke_kid_device(p_device_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_caller_family_id uuid;
begin
  if not is_family_adult() then
    raise exception 'Solo un adulto coadministrador puede revocar dispositivos';
  end if;

  v_caller_family_id := get_auth_family_id();

  update kid_devices
  set status = 'revoked',
      revoked_by_user_id = auth.uid(),
      revoked_at = now()
  where id = p_device_id
    and family_id = v_caller_family_id;

  if not found then
    raise exception 'Dispositivo no encontrado';
  end if;

  return jsonb_build_object(
    'success', true,
    'message', 'Dispositivo revocado exitosamente'
  );
end;
$$;

-- 3.5 Restablecer el PIN de un dispositivo infantil (Mamá o Papá)
create or replace function reset_kid_device_pin(
  p_device_id uuid,
  p_new_pin text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_caller_family_id uuid;
  v_device record;
  v_new_pin_hash text;
begin
  if not is_family_adult() then
    raise exception 'Solo un adulto coadministrador puede restablecer el PIN';
  end if;

  if p_new_pin is null or p_new_pin !~ '^\d{4}$' then
    raise exception 'El PIN debe contener exactamente 4 dígitos numéricos';
  end if;

  v_caller_family_id := get_auth_family_id();

  select * into v_device
  from kid_devices
  where id = p_device_id and family_id = v_caller_family_id;

  if not found then
    raise exception 'Dispositivo no encontrado';
  end if;

  v_new_pin_hash := encode(digest(p_new_pin || ':' || v_device.child_member_id || ':' || v_caller_family_id::text, 'sha256'), 'hex');

  update kid_devices
  set pin_hash = v_new_pin_hash,
      failed_pin_attempts = 0,
      locked_until = null
  where id = p_device_id;

  return jsonb_build_object(
    'success', true,
    'message', 'PIN de 4 dígitos restablecido exitosamente'
  );
end;
$$;

-- 3.6 Aprobación atómica de tarea completada por el niño (Mamá o Papá)
-- Previene duplicación de puntos mediante bloqueo condicional estricto
create or replace function approve_kid_task(
  p_task_id text,
  p_points integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_caller_family_id uuid;
  v_task record;
  v_child_id text;
  v_points_to_award integer;
  v_new_total integer;
begin
  if not is_family_adult() then
    raise exception 'Solo un adulto coadministrador puede aprobar tareas';
  end if;

  v_caller_family_id := get_auth_family_id();

  -- Actualización atómica con condición estricta de estado 'pending_approval'
  update tasks
  set status = 'completed',
      updated_at = now()
  where id = p_task_id
    and family_id = v_caller_family_id
    and status = 'pending_approval'
  returning * into v_task;

  if not found then
    raise exception 'La tarea no se encuentra en estado pendiente de aprobación o ya fue revisada';
  end if;

  v_child_id := coalesce(v_task.completed_by, v_task.assigned_to);
  v_points_to_award := coalesce(p_points, v_task.points_reward, 5);

  -- Acreditar puntos al niño
  update family_members
  set points = points + v_points_to_award,
      updated_at = now()
  where family_id = v_caller_family_id
    and id = v_child_id
  returning points into v_new_total;

  -- Registrar en historial de puntos
  insert into points_history (
    id,
    family_id,
    child_id,
    points,
    reason,
    date
  ) values (
    'ph-' || extract(epoch from now())::bigint || '-' || substr(md5(random()::text), 1, 6),
    v_caller_family_id,
    v_child_id,
    v_points_to_award,
    'Misión cumplida: ' || v_task.title,
    to_char(now(), 'YYYY-MM-DD')
  );

  return jsonb_build_object(
    'success', true,
    'task_id', p_task_id,
    'child_id', v_child_id,
    'points_awarded', v_points_to_award,
    'new_total_points', v_new_total,
    'message', 'Tarea aprobada y puntos otorgados'
  );
end;
$$;

-- 3.7 Rechazar tarea completada por el niño (Mamá o Papá)
create or replace function reject_kid_task(p_task_id text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_caller_family_id uuid;
begin
  if not is_family_adult() then
    raise exception 'Solo un adulto coadministrador puede revisar tareas';
  end if;

  v_caller_family_id := get_auth_family_id();

  update tasks
  set status = 'pending',
      updated_at = now()
  where id = p_task_id
    and family_id = v_caller_family_id
    and status = 'pending_approval';

  if not found then
    raise exception 'Tarea no encontrada o ya revisada';
  end if;

  return jsonb_build_object(
    'success', true,
    'message', 'Tarea devuelta a pendiente'
  );
end;
$$;

-- 3.8 Aprobar solicitud de canje de recompensa (Mamá o Papá)
create or replace function approve_kid_reward_redemption(p_request_id text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_caller_family_id uuid;
  v_req record;
  v_current_points integer;
  v_new_points integer;
begin
  if not is_family_adult() then
    raise exception 'Solo un adulto coadministrador puede aprobar recompensas';
  end if;

  v_caller_family_id := get_auth_family_id();

  -- Marcar solicitud como aprobada atómicamente
  update kid_redemption_requests
  set status = 'approved',
      reviewed_by_user_id = auth.uid(),
      reviewed_at = now()
  where id = p_request_id
    and family_id = v_caller_family_id
    and status = 'pending'
  returning * into v_req;

  if not found then
    raise exception 'La solicitud de canje ya fue atendida o no existe';
  end if;

  -- Comprobar puntos con bloqueo FOR UPDATE en family_members
  select points into v_current_points
  from family_members
  where family_id = v_caller_family_id and id = v_req.child_member_id
  for update;

  if v_current_points < v_req.points_cost then
    -- Revertir estado si el saldo no alcanza
    update kid_redemption_requests set status = 'rejected' where id = p_request_id;
    raise exception 'El niño no cuenta con suficientes puntos para este canje';
  end if;

  -- Descontar puntos
  update family_members
  set points = points - v_req.points_cost,
      updated_at = now()
  where family_id = v_caller_family_id and id = v_req.child_member_id
  returning points into v_new_points;

  -- Registrar en historial con puntos negativos
  insert into points_history (
    id,
    family_id,
    child_id,
    points,
    reason,
    date
  ) values (
    'ph-red-' || extract(epoch from now())::bigint || '-' || substr(md5(random()::text), 1, 6),
    v_caller_family_id,
    v_req.child_member_id,
    -v_req.points_cost,
    'Premio canjeado: ' || v_req.reward_title,
    to_char(now(), 'YYYY-MM-DD')
  );

  return jsonb_build_object(
    'success', true,
    'child_id', v_req.child_member_id,
    'points_deducted', v_req.points_cost,
    'new_total_points', v_new_points,
    'message', 'Canje aprobado y puntos deducidos'
  );
end;
$$;

-- 3.9 Rechazar solicitud de canje de recompensa (Mamá o Papá)
create or replace function reject_kid_reward_redemption(p_request_id text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_caller_family_id uuid;
begin
  if not is_family_adult() then
    raise exception 'Solo un adulto coadministrador puede revisar canjes';
  end if;

  v_caller_family_id := get_auth_family_id();

  update kid_redemption_requests
  set status = 'rejected',
      reviewed_by_user_id = auth.uid(),
      reviewed_at = now()
  where id = p_request_id
    and family_id = v_caller_family_id
    and status = 'pending';

  if not found then
    raise exception 'Solicitud no encontrada o ya revisada';
  end if;

  return jsonb_build_object(
    'success', true,
    'message', 'Solicitud de canje rechazada'
  );
end;
$$;

-- 3.10 Listar aprobaciones pendientes para el panel de los padres
create or replace function get_pending_kid_approvals()
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_caller_family_id uuid;
  v_pending_tasks jsonb;
  v_pending_redemptions jsonb;
  v_pending_devices jsonb;
begin
  if not is_family_adult() then
    raise exception 'Acceso no autorizado';
  end if;

  v_caller_family_id := get_auth_family_id();

  -- Tareas terminadas por niños esperando aprobación
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', t.id,
      'title', t.title,
      'description', t.description,
      'assigned_to', t.assigned_to,
      'completed_by', t.completed_by,
      'child_name', coalesce(m.name, t.completed_by, t.assigned_to),
      'points_reward', t.points_reward,
      'due_date', t.due_date,
      'updated_at', t.updated_at
    ) order by t.updated_at desc
  ), '[]'::jsonb) into v_pending_tasks
  from tasks t
  left join family_members m on m.family_id = t.family_id and m.id = coalesce(t.completed_by, t.assigned_to)
  where t.family_id = v_caller_family_id
    and t.status = 'pending_approval';

  -- Solicitudes de recompensas pendientes
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', r.id,
      'reward_id', r.reward_id,
      'reward_title', r.reward_title,
      'child_id', r.child_member_id,
      'child_name', coalesce(m.name, r.child_member_id),
      'points_cost', r.points_cost,
      'requested_at', r.requested_at
    ) order by r.requested_at desc
  ), '[]'::jsonb) into v_pending_redemptions
  from kid_redemption_requests r
  left join family_members m on m.family_id = r.family_id and m.id = r.child_member_id
  where r.family_id = v_caller_family_id
    and r.status = 'pending';

  -- Dispositivos esperando aprobación
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', d.id,
      'device_name', d.device_name,
      'child_id', d.child_member_id,
      'child_name', coalesce(m.name, d.child_member_id),
      'created_at', d.created_at
    ) order by d.created_at desc
  ), '[]'::jsonb) into v_pending_devices
  from kid_devices d
  left join family_members m on m.family_id = d.family_id and m.id = d.child_member_id
  where d.family_id = v_caller_family_id
    and d.status = 'pending_approval';

  return jsonb_build_object(
    'success', true,
    'pending_tasks', v_pending_tasks,
    'pending_redemptions', v_pending_redemptions,
    'pending_devices', v_pending_devices,
    'total_count', jsonb_array_length(v_pending_tasks) + jsonb_array_length(v_pending_redemptions) + jsonb_array_length(v_pending_devices)
  );
end;
$$;


-- ==============================================================================
-- 4. FUNCIONES RPC PARA DISPOSITIVO INFANTIL (/KIDS)
-- ==============================================================================

-- 4.1 Obtener detalles seguros de una invitación infantil
create or replace function get_kid_invite_details(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_token_hash text;
  v_invite record;
  v_child record;
  v_family_name text;
begin
  if p_token is null or length(trim(p_token)) < 32 then
    return jsonb_build_object('success', false, 'error', 'Token de invitación inválido');
  end if;

  v_token_hash := encode(digest(p_token, 'sha256'), 'hex');

  select * into v_invite
  from kid_device_invites
  where token_hash = v_token_hash;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Enlace de vinculación no encontrado');
  end if;

  if v_invite.used_at is not null then
    return jsonb_build_object('success', false, 'error', 'Este enlace ya fue utilizado previamente');
  end if;

  if v_invite.expires_at <= now() then
    return jsonb_build_object('success', false, 'error', 'El enlace ha caducado. Pide a mamá o papá que te envíen uno nuevo');
  end if;

  select name, avatar_color, avatar_emoji into v_child
  from family_members
  where family_id = v_invite.family_id and id = v_invite.child_member_id;

  select name into v_family_name
  from families
  where id = v_invite.family_id;

  return jsonb_build_object(
    'success', true,
    'child_id', v_invite.child_member_id,
    'child_name', v_child.name,
    'avatar_color', v_child.avatar_color,
    'avatar_emoji', v_child.avatar_emoji,
    'family_name', coalesce(v_family_name, 'Nuestra Familia'),
    'device_name_hint', v_invite.device_name_hint
  );
end;
$$;

-- 4.2 Registrar solicitud de vinculación del dispositivo (Paso 1 del niño: configura PIN y dispositivo)
-- Queda en estado 'pending_approval' hasta que mamá o papá lo aprueben
create or replace function register_kid_device_request(
  p_token text,
  p_pin text,
  p_device_name text,
  p_device_token_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_token_hash text;
  v_invite record;
  v_device_id uuid;
  v_pin_hash text;
  v_child_name text;
begin
  if p_token is null or length(trim(p_token)) < 32 then
    raise exception 'Token de invitación inválido';
  end if;

  if p_pin is null or p_pin !~ '^\d{4}$' then
    raise exception 'El PIN debe ser de 4 dígitos numéricos';
  end if;

  if p_device_token_hash is null or length(trim(p_device_token_hash)) <> 64 then
    raise exception 'Hash de credencial de dispositivo inválido';
  end if;

  v_token_hash := encode(digest(p_token, 'sha256'), 'hex');

  select * into v_invite
  from kid_device_invites
  where token_hash = v_token_hash
  for update;

  if not found then
    raise exception 'Enlace de vinculación no encontrado';
  end if;

  if v_invite.used_at is not null then
    raise exception 'Este enlace ya fue utilizado';
  end if;

  if v_invite.expires_at <= now() then
    raise exception 'Este enlace ha caducado';
  end if;

  -- Marcar invitación como consumida
  update kid_device_invites
  set used_at = now()
  where id = v_invite.id;

  select name into v_child_name
  from family_members
  where family_id = v_invite.family_id and id = v_invite.child_member_id;

  -- Hash seguro del PIN (con salteo basado en id del niño y familia)
  v_pin_hash := encode(digest(p_pin || ':' || v_invite.child_member_id || ':' || v_invite.family_id::text, 'sha256'), 'hex');

  -- Registrar dispositivo en estado PENDIENTE DE APROBACIÓN
  insert into kid_devices (
    family_id,
    child_member_id,
    device_name,
    device_token_hash,
    pin_hash,
    status
  ) values (
    v_invite.family_id,
    v_invite.child_member_id,
    coalesce(nullif(trim(p_device_name), ''), coalesce(v_invite.device_name_hint, 'Dispositivo de ' || v_child_name)),
    p_device_token_hash,
    v_pin_hash,
    'pending_approval'
  )
  returning id into v_device_id;

  return jsonb_build_object(
    'success', true,
    'device_id', v_device_id,
    'status', 'pending_approval',
    'child_id', v_invite.child_member_id,
    'child_name', v_child_name,
    'message', '¡PIN configurado! Esperando que mamá o papá aprueben este dispositivo desde su celular.'
  );
end;
$$;

-- 4.3 Comprobar estado de activación del dispositivo infantil (Polling / Reconexión)
create or replace function check_kid_device_activation(
  p_device_id uuid,
  p_device_token_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_device record;
  v_child record;
  v_family_name text;
begin
  select * into v_device
  from kid_devices
  where id = p_device_id and device_token_hash = p_device_token_hash;

  if not found then
    return jsonb_build_object('success', false, 'status', 'not_found', 'error', 'Dispositivo no encontrado');
  end if;

  if v_device.status = 'revoked' then
    return jsonb_build_object('success', false, 'status', 'revoked', 'error', 'Este dispositivo ha sido revocado');
  end if;

  if v_device.status = 'pending_approval' then
    return jsonb_build_object('success', true, 'status', 'pending_approval', 'message', 'Esperando aprobación de mamá o papá');
  end if;

  -- Estado 'active'
  select name, avatar_color, avatar_emoji into v_child
  from family_members
  where family_id = v_device.family_id and id = v_device.child_member_id;

  select name into v_family_name
  from families
  where id = v_device.family_id;

  return jsonb_build_object(
    'success', true,
    'status', 'active',
    'device_id', v_device.id,
    'family_id', v_device.family_id,
    'family_name', coalesce(v_family_name, 'Nuestra Familia'),
    'child_id', v_device.child_member_id,
    'child_name', v_child.name,
    'avatar_color', v_child.avatar_color,
    'avatar_emoji', v_child.avatar_emoji
  );
end;
$$;

-- 4.4 Verificar PIN y desbloquear sesión en el dispositivo
create or replace function verify_kid_pin(
  p_device_id uuid,
  p_device_token_hash text,
  p_pin text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_device record;
  v_calculated_hash text;
  v_child record;
  v_new_attempts integer;
  v_is_locked boolean;
begin
  select * into v_device
  from kid_devices
  where id = p_device_id and device_token_hash = p_device_token_hash;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Dispositivo no reconocido o no autorizado');
  end if;

  if v_device.status <> 'active' then
    return jsonb_build_object('success', false, 'error', 'Este dispositivo no está activo o ha sido revocado');
  end if;

  -- Comprobar si está bloqueado por demasiados intentos
  if v_device.locked_until is not null and v_device.locked_until > now() then
    return jsonb_build_object(
      'success', false,
      'is_locked', true,
      'error', 'Dispositivo bloqueado temporalmente por demasiados intentos fallidos. Intenta más tarde.'
    );
  end if;

  v_calculated_hash := encode(digest(p_pin || ':' || v_device.child_member_id || ':' || v_device.family_id::text, 'sha256'), 'hex');

  if v_calculated_hash <> v_device.pin_hash then
    -- Incrementar contador de intentos fallidos y persistir en la base de datos
    update kid_devices
    set failed_pin_attempts = failed_pin_attempts + 1,
        locked_until = case when failed_pin_attempts + 1 >= 5 then now() + interval '15 minutes' else null end
    where id = p_device_id
    returning failed_pin_attempts, (locked_until is not null and locked_until > now()) into v_new_attempts, v_is_locked;

    if v_is_locked then
      return jsonb_build_object(
        'success', false,
        'is_locked', true,
        'error', 'Has alcanzado el límite de intentos. Dispositivo bloqueado por 15 minutos.'
      );
    else
      return jsonb_build_object(
        'success', false,
        'is_locked', false,
        'remaining_attempts', greatest(0, 5 - v_new_attempts),
        'error', format('PIN incorrecto. Te quedan %s intentos.', greatest(0, 5 - v_new_attempts))
      );
    end if;
  end if;

  -- Éxito: resetear intentos fallidos y actualizar último acceso
  update kid_devices
  set failed_pin_attempts = 0,
      locked_until = null,
      last_active_at = now()
  where id = p_device_id;

  select name, points, avatar_color, avatar_emoji into v_child
  from family_members
  where family_id = v_device.family_id and id = v_device.child_member_id;

  return jsonb_build_object(
    'success', true,
    'child_id', v_device.child_member_id,
    'child_name', v_child.name,
    'points', v_child.points,
    'avatar_color', v_child.avatar_color,
    'avatar_emoji', v_child.avatar_emoji,
    'family_id', v_device.family_id
  );
end;
$$;

-- 4.5 Obtener datos autorizados del panel infantil (Tareas, Hábitos, Puntos, Recompensas, Calendario)
-- Prohibición absoluta de finanzas, registros de pareja o datos privados
create or replace function get_kid_dashboard_data(
  p_device_id uuid,
  p_device_token_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_device record;
  v_child record;
  v_family_name text;
  v_tasks jsonb;
  v_habits jsonb;
  v_points_history jsonb;
  v_rewards jsonb;
  v_redemptions jsonb;
  v_calendar jsonb;
begin
  -- 1. Validar autenticidad del dispositivo
  select * into v_device
  from kid_devices
  where id = p_device_id and device_token_hash = p_device_token_hash;

  if not found or v_device.status <> 'active' then
    raise exception 'Dispositivo no autorizado';
  end if;

  -- Actualizar último acceso
  update kid_devices set last_active_at = now() where id = p_device_id;

  -- 2. Perfil infantil
  select id, name, points, avatar_color, avatar_emoji into v_child
  from family_members
  where family_id = v_device.family_id and id = v_device.child_member_id;

  select name into v_family_name
  from families
  where id = v_device.family_id;

  -- 3. Tareas asignadas exclusivamente a este niño o a toda la familia
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', t.id,
      'title', t.title,
      'description', t.description,
      'priority', t.priority,
      'status', t.status,
      'points_reward', t.points_reward,
      'due_date', t.due_date,
      'category_key', t.category_key,
      'is_pending_approval', (t.status = 'pending_approval'),
      'is_completed', (t.status = 'completed')
    ) order by 
      case when t.status = 'pending' then 1
           when t.status = 'pending_approval' then 2
           else 3 end,
      t.due_date asc
  ), '[]'::jsonb) into v_tasks
  from tasks t
  where t.family_id = v_device.family_id
    and (t.assigned_to = v_device.child_member_id or t.assigned_to in ('both', 'family'));

  -- 4. Hábitos del niño
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', h.id,
      'title', h.title,
      'icon', coalesce(h.data->>'icon', '⭐'),
      'color', coalesce(h.data->>'color', '#8b5cf6'),
      'frequency', h.frequency,
      'points', h.points,
      'completed_dates', coalesce(h.completed_dates, '[]'::jsonb),
      'active', h.active
    ) order by h.created_at asc
  ), '[]'::jsonb) into v_habits
  from habits h
  where h.family_id = v_device.family_id
    and (h.child_id = v_device.child_member_id or h.member_id = v_device.child_member_id);

  -- 5. Historial de puntos (últimos 20)
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', ph.id,
      'points', ph.points,
      'reason', ph.reason,
      'date', ph.date
    ) order by ph.created_at desc
  ), '[]'::jsonb) into v_points_history
  from (
    select * from points_history
    where family_id = v_device.family_id
      and child_id = v_device.child_member_id
    order by created_at desc
    limit 20
  ) ph;

  -- 6. Catálogo de recompensas familiares disponibles
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', r.id,
      'title', r.title,
      'description', r.description,
      'points_cost', r.points_cost,
      'category', r.category,
      'icon', r.icon
    ) order by r.points_cost asc
  ), '[]'::jsonb) into v_rewards
  from rewards r
  where r.family_id = v_device.family_id
    and r.active = true;

  -- 7. Solicitudes de canje del niño
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', rq.id,
      'reward_id', rq.reward_id,
      'reward_title', rq.reward_title,
      'points_cost', rq.points_cost,
      'status', rq.status,
      'requested_at', rq.requested_at
    ) order by rq.requested_at desc
  ), '[]'::jsonb) into v_redemptions
  from (
    select * from kid_redemption_requests
    where family_id = v_device.family_id
      and child_member_id = v_device.child_member_id
    order by requested_at desc
    limit 10
  ) rq;

  -- 8. Calendario infantil (eventos dirigidos al niño o familiares)
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', c.id,
      'title', c.title,
      'description', c.description,
      'date', c.date,
      'time', c.time,
      'category', c.category_key,
      'color', coalesce(c.data->>'color', '#3b82f6')
    ) order by c.date asc
  ), '[]'::jsonb) into v_calendar
  from calendar_events c
  where c.family_id = v_device.family_id
    and (c.responsible_id = v_device.child_member_id or c.responsible_id in ('family', 'all', 'both'));

  return jsonb_build_object(
    'success', true,
    'child', jsonb_build_object(
      'id', v_child.id,
      'name', v_child.name,
      'points', v_child.points,
      'avatar_color', v_child.avatar_color,
      'avatar_emoji', v_child.avatar_emoji,
      'family_name', coalesce(v_family_name, 'Nuestra Familia')
    ),
    'tasks', v_tasks,
    'habits', v_habits,
    'points_history', v_points_history,
    'rewards', v_rewards,
    'redemptions', v_redemptions,
    'calendar', v_calendar
  );
end;
$$;

-- 4.6 Marcar tarea como «¡Terminé!» (Pasa a estado 'pending_approval')
create or replace function submit_kid_task_completion(
  p_device_id uuid,
  p_device_token_hash text,
  p_task_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_device record;
  v_task record;
begin
  select * into v_device
  from kid_devices
  where id = p_device_id and device_token_hash = p_device_token_hash;

  if not found or v_device.status <> 'active' then
    raise exception 'Dispositivo no autorizado';
  end if;

  update tasks
  set status = 'pending_approval',
      completed_by = v_device.child_member_id,
      updated_at = now()
  where id = p_task_id
    and family_id = v_device.family_id
    and (assigned_to = v_device.child_member_id or assigned_to in ('both', 'family'))
    and status in ('pending', 'in_progress')
  returning * into v_task;

  if not found then
    raise exception 'Tarea no encontrada o ya se encuentra en revisión';
  end if;

  return jsonb_build_object(
    'success', true,
    'task_id', p_task_id,
    'status', 'pending_approval',
    'message', '¡Misión enviada! Esperando aprobación de mamá o papá.'
  );
end;
$$;

-- 4.7 Marcar o desmarcar hábito del día
create or replace function toggle_kid_habit_day(
  p_device_id uuid,
  p_device_token_hash text,
  p_habit_id text,
  p_date text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_device record;
  v_habit record;
  v_dates jsonb;
  v_new_dates jsonb;
  v_was_completed boolean;
begin
  select * into v_device
  from kid_devices
  where id = p_device_id and device_token_hash = p_device_token_hash;

  if not found or v_device.status <> 'active' then
    raise exception 'Dispositivo no autorizado';
  end if;

  select * into v_habit
  from habits
  where id = p_habit_id
    and family_id = v_device.family_id
    and (child_id = v_device.child_member_id or member_id = v_device.child_member_id);

  if not found then
    raise exception 'Hábito no encontrado';
  end if;

  v_dates := coalesce(v_habit.completed_dates, '[]'::jsonb);
  v_was_completed := (v_dates ? p_date);

  if v_was_completed then
    select coalesce(jsonb_agg(elem), '[]'::jsonb) into v_new_dates
    from jsonb_array_elements_text(v_dates) elem
    where elem <> p_date;
  else
    v_new_dates := v_dates || jsonb_build_array(p_date);
  end if;

  update habits
  set completed_dates = coalesce(v_new_dates, '[]'::jsonb),
      updated_at = now()
  where id = p_habit_id;

  return jsonb_build_object(
    'success', true,
    'habit_id', p_habit_id,
    'is_completed', not v_was_completed
  );
end;
$$;

-- 4.8 Solicitar canje de recompensa
create or replace function request_kid_reward_redemption(
  p_device_id uuid,
  p_device_token_hash text,
  p_reward_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_device record;
  v_reward record;
  v_current_points integer;
  v_req_id text;
begin
  select * into v_device
  from kid_devices
  where id = p_device_id and device_token_hash = p_device_token_hash;

  if not found or v_device.status <> 'active' then
    raise exception 'Dispositivo no autorizado';
  end if;

  select * into v_reward
  from rewards
  where id = p_reward_id and family_id = v_device.family_id and active = true;

  if not found then
    raise exception 'Premio no disponible';
  end if;

  select points into v_current_points
  from family_members
  where family_id = v_device.family_id and id = v_device.child_member_id;

  if coalesce(v_current_points, 0) < v_reward.points_cost then
    raise exception 'Aún no tienes suficientes estrellitas para este premio';
  end if;

  v_req_id := 'kr-' || extract(epoch from now())::bigint || '-' || substr(md5(random()::text), 1, 6);

  insert into kid_redemption_requests (
    id,
    family_id,
    child_member_id,
    reward_id,
    reward_title,
    points_cost,
    status
  ) values (
    v_req_id,
    v_device.family_id,
    v_device.child_member_id,
    v_reward.id,
    v_reward.title,
    v_reward.points_cost,
    'pending'
  );

  return jsonb_build_object(
    'success', true,
    'request_id', v_req_id,
    'reward_title', v_reward.title,
    'points_cost', v_reward.points_cost,
    'message', '¡Solicitud enviada! Mamá o papá la revisarán pronto.'
  );
end;
$$;


-- ==============================================================================
-- 5. PERMISOS DE EJECUCIÓN DE FUNCIONES RPC
-- ==============================================================================

-- Funciones públicas / de dispositivo (invitaciones y consultas de kids)
revoke all on function get_kid_invite_details(text) from public;
grant execute on function get_kid_invite_details(text) to anon, authenticated;

revoke all on function register_kid_device_request(text, text, text, text) from public;
grant execute on function register_kid_device_request(text, text, text, text) to anon, authenticated;

revoke all on function check_kid_device_activation(uuid, text) from public;
grant execute on function check_kid_device_activation(uuid, text) to anon, authenticated;

revoke all on function verify_kid_pin(uuid, text, text) from public;
grant execute on function verify_kid_pin(uuid, text, text) to anon, authenticated;

revoke all on function get_kid_dashboard_data(uuid, text) from public;
grant execute on function get_kid_dashboard_data(uuid, text) to anon, authenticated;

revoke all on function submit_kid_task_completion(uuid, text, text) from public;
grant execute on function submit_kid_task_completion(uuid, text, text) to anon, authenticated;

revoke all on function toggle_kid_habit_day(uuid, text, text, text) from public;
grant execute on function toggle_kid_habit_day(uuid, text, text, text) to anon, authenticated;

revoke all on function request_kid_reward_redemption(uuid, text, text) from public;
grant execute on function request_kid_reward_redemption(uuid, text, text) to anon, authenticated;

-- Funciones exclusivas de adultos autenticados
revoke all on function create_kid_device_invite(text, text) from public, anon;
grant execute on function create_kid_device_invite(text, text) to authenticated;

revoke all on function list_kid_devices(text) from public, anon;
grant execute on function list_kid_devices(text) to authenticated;

revoke all on function approve_kid_device_link(uuid) from public, anon;
grant execute on function approve_kid_device_link(uuid) to authenticated;

revoke all on function revoke_kid_device(uuid) from public, anon;
grant execute on function revoke_kid_device(uuid) to authenticated;

revoke all on function reset_kid_device_pin(uuid, text) from public, anon;
grant execute on function reset_kid_device_pin(uuid, text) to authenticated;

revoke all on function approve_kid_task(text, integer) from public, anon;
grant execute on function approve_kid_task(text, integer) to authenticated;

revoke all on function reject_kid_task(text) from public, anon;
grant execute on function reject_kid_task(text) to authenticated;

revoke all on function approve_kid_reward_redemption(text) from public, anon;
grant execute on function approve_kid_reward_redemption(text) to authenticated;

revoke all on function reject_kid_reward_redemption(text) from public, anon;
grant execute on function reject_kid_reward_redemption(text) to authenticated;

revoke all on function get_pending_kid_approvals() from public, anon;
grant execute on function get_pending_kid_approvals() to authenticated;


-- ==============================================================================
-- 6. SINCRONIZACIÓN EN TIEMPO REAL (SUPABASE REALTIME & REPLICA IDENTITY FULL)
-- ==============================================================================

do $$
declare
  t text;
  tables text[] := array[
    'kid_devices',
    'kid_redemption_requests'
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

alter table kid_devices replica identity full;
alter table kid_redemption_requests replica identity full;

-- ==============================================================================
-- VERIFICACIÓN DE INSTALACIÓN Y CIERRE DE TRANSACCIÓN
-- ==============================================================================
do $$
begin
  raise notice '==============================================================';
  raise notice ' MELOMUS HOGAR Y MELOMUS KIDS: MIGRACIÓN DEFINITIVA APLICADA';
  raise notice ' Co-administración, RLS, Melomus Kids y Realtime configurados.';
  raise notice '==============================================================';
end $$;

commit;
