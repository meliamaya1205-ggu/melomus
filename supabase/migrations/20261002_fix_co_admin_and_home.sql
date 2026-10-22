-- ==============================================================================
-- MELOMUS: MIGRACIÓN DEFINITIVA — VINCULACIÓN COADMINISTRADOR Y MÓDULO HOGAR
-- Fecha: 2026-10-02
-- Objetivo:
--   1. Permitir 'area' y 'reset_session' en home_records (Hogar 100% personalizable).
--   2. Agregar app_customizations a publicación supabase_realtime.
--   3. Blindar funciones RPC de vinculación (create_co_admin_invite, get_invite_details, claim_coadmin_link)
--      con protecciones de auto-vinculación, pertenencia a otra familia, e invalidación estricta de token.
-- ==============================================================================

-- 1. ACTUALIZAR CHECK CONSTRAINT DE HOME_RECORDS
-- Permite áreas personalizadas ('area') y sesiones de Family Reset ('reset_session')
do $$
begin
  alter table home_records drop constraint if exists home_records_record_type_check;
  alter table home_records add constraint home_records_record_type_check 
    check (record_type in ('shopping', 'cleaning', 'maintenance', 'reset_mission', 'area', 'reset_session'));
exception
  when others then
    raise notice 'No se pudo actualizar constraint de home_records: %', sqlerrm;
end $$;

-- 2. ASEGURAR PUBLICACIÓN SUPABASE REALTIME PARA APP_CUSTOMIZATIONS
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and tablename = 'app_customizations'
  ) then
    alter publication supabase_realtime add table app_customizations;
  end if;
exception
  when others then
    raise notice 'Publicación app_customizations ya configurada o no soportada: %', sqlerrm;
end $$;

-- 3. RPC: GENERAR INVITACIÓN PARA SEGUNDO ADULTO (VIGENCIA 48 HORAS)
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

  -- Generar token criptográficamente seguro de 64 caracteres hex
  v_token := encode(gen_random_bytes(32), 'hex');
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

-- 4. RPC: OBTENER DETALLES DE INVITACIÓN (PÚBLICO PARA CLAIM VIEW)
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

-- 5. RPC: RECLAMAR VÍNCULO DE COADMINISTRADOR CON BLINDAJE DE SEGURIDAD
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
  v_other_adult record;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return jsonb_build_object('success', false, 'message', 'Usuario no autenticado');
  end if;

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
  select * into v_other_adult 
  from profiles 
  where family_id = v_invite.family_id 
    and relationship = v_invite.target_relationship
    and id <> v_user_id;
  if found then
    return jsonb_build_object('success', false, 'message', 'El rol de ' || v_invite.target_relationship || ' ya está ocupado en esta familia');
  end if;

  -- Obtener email de auth.users
  select email into v_user_email from auth.users where id = v_user_id;

  -- 7. Crear o actualizar perfil como co-administrador (FAMILY_ADULT)
  if v_existing_profile is not null and v_existing_profile.id is not null then
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

  -- 9. Inmediatamente marcar la invitación como utilizada
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

-- 6. PERMISOS
grant execute on function get_invite_details(text) to anon, authenticated;
grant execute on function create_co_admin_invite(text) to authenticated;
grant execute on function claim_coadmin_link(text, text) to authenticated;
