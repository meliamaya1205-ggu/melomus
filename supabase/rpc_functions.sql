-- ==============================================================================
-- NUESTRO HOGAR — FUNCIONES TRANSACCIONALES RPC Y TIEMPO REAL
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. REGISTRO DEL PRIMER ADULTO PRINCIPAL Y CREACIÓN DE FAMILIA
-- ------------------------------------------------------------------------------
-- Se invoca inmediatamente tras el registro de Mamá o Papá (primer adulto).
-- Crea atómicamente la familia, el perfil con role = 'FAMILY_ADULT' y el member.
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

  -- Comprobar si ya tiene perfil
  select * into v_profile from profiles where id = v_user_id;
  if found then
    return jsonb_build_object(
      'success', true,
      'family_id', v_profile.family_id,
      'relationship', v_profile.relationship,
      'message', 'Perfil ya existente'
    );
  end if;

  -- Crear nueva familia
  insert into families (name)
  values (coalesce(nullif(p_family_name, ''), 'Nuestra Familia'))
  returning id into v_family_id;

  -- Crear perfil de adulto principal
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

  -- Crear entrada en directorio family_members
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

  -- Crear configuración inicial de la familia
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

-- ------------------------------------------------------------------------------
-- 2. GENERAR ENLACE TEMPORAL PARA VINCULAR AL SEGUNDO ADULTO
-- ------------------------------------------------------------------------------
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

  -- Generar token aleatorio seguro de 32 bytes (64 caracteres hex)
  v_token := encode(gen_random_bytes(32), 'hex');
  v_expires_at := now() + interval '48 hours';

  -- Invalidar invitaciones previas pendientes del mismo destinatario en esta familia
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

-- ------------------------------------------------------------------------------
-- 3. OBTENER DETALLES DE UNA INVITACIÓN (PÚBLICO PARA PANTALLA DE BIENVENIDA)
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 4. FUNCIÓN PARA RECLAMAR VÍNCULO DE COADMINISTRADOR (ADULTO PRINCIPAL)
-- ------------------------------------------------------------------------------
-- Esta función atómica se invoca cuando el segundo adulto (ej. Papá) abre el enlace
-- temporal y se registra o inicia sesión. Asocia al usuario a la misma familia
-- con paridad total (role = 'FAMILY_ADULT') e invalida el token.
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

  -- Obtener email del usuario autenticado
  select email into v_user_email from auth.users where id = v_user_id;

  -- 1. Buscar la invitación por token
  select * into v_invite 
  from co_admin_invites
  where token_hash = p_token
  limit 1;

  if not found then
    return jsonb_build_object('success', false, 'message', 'El enlace de vinculación no es válido o no existe');
  end if;

  -- 2. Validar que no haya sido utilizada
  if v_invite.used_at is not null then
    return jsonb_build_object('success', false, 'message', 'Este enlace de vinculación ya ha sido utilizado anteriormente');
  end if;

  -- 3. Validar vigencia temporal
  if v_invite.expires_at <= now() then
    return jsonb_build_object('success', false, 'message', 'Este enlace de vinculación ha expirado (vigencia 48h)');
  end if;

  -- 4. Protección contra auto-vinculación (el creador no puede reclamar su propio enlace)
  if v_invite.created_by_user_id = v_user_id then
    return jsonb_build_object('success', false, 'message', 'No puedes utilizar una invitación creada por ti mismo');
  end if;

  -- 5. Validar si el usuario ya pertenece a otra familia
  select * into v_existing_profile from profiles where id = v_user_id;
  if found and v_existing_profile.family_id is not null and v_existing_profile.family_id <> v_invite.family_id then
    return jsonb_build_object('success', false, 'message', 'Tu usuario ya pertenece a otra familia registrada en MELOMUS. Debes usar una cuenta distinta.');
  end if;

  -- 6. Validar si el rol de destino ya está ocupado por otra persona en la familia
  declare
    v_other_adult record;
  begin
    select * into v_other_adult 
    from profiles 
    where family_id = v_invite.family_id 
      and relationship = v_invite.target_relationship
      and id <> v_user_id;
    if found then
      return jsonb_build_object('success', false, 'message', 'El rol de ' || v_invite.target_relationship || ' ya está ocupado en esta familia');
    end if;
  end;

  -- 7. Crear o actualizar perfil como co-administrador (FAMILY_ADULT)
  if v_existing_profile is not null and v_existing_profile.id is not null then
    -- Actualizar familia del perfil existente
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
    -- Crear perfil de adulto principal para el segundo usuario
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

  -- 8. Vincular o actualizar directorio family_members
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

  -- 9. Marcar la invitación como utilizada inmediatamente
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

-- Permisos de ejecución
grant execute on function get_invite_details(text) to anon, authenticated;
grant execute on function register_primary_adult(text, text, text) to authenticated;
grant execute on function create_co_admin_invite(text) to authenticated;
grant execute on function claim_coadmin_link(text, text) to authenticated;

-- ------------------------------------------------------------------------------
-- 5. HABILITAR PUBLICACIÓN SUPABASE REALTIME
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
  health_records, 
  couple_records, 
  home_records, 
  rewards, 
  points_history, 
  notifications, 
  family_members,
  app_customizations;
