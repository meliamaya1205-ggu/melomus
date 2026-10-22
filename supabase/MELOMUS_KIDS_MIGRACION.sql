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

begin;

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

commit;
