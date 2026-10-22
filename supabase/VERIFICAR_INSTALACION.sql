-- ==============================================================================
-- MELOMUS HOGAR — CONSULTAS DE VERIFICACIÓN DE INSTALACIÓN
-- ==============================================================================
-- Ejecuta estas consultas en el SQL Editor de Supabase después de ejecutar
-- MELOMUS_INSTALACION_INICIAL.sql para confirmar que todo quedó instalado al 100%.
-- ==============================================================================

-- 1. VERIFICACIÓN DE TABLAS CREADAS (Debe devolver exactamente 21 tablas)
select 
  table_name,
  case when table_name in (
    'families', 'profiles', 'co_admin_invites', 'family_members',
    'tasks', 'calendar_events', 'habits', 'finances_incomes',
    'finances_expenses', 'finances_bills', 'finances_debts',
    'finances_budgets', 'finances_goals', 'health_records',
    'couple_records', 'home_records', 'rewards', 'points_history',
    'notifications', 'app_customizations', 'push_subscriptions'
  ) then '✅ VÁLIDA' else '⚠️ NO RECONOCIDA' end as estado
from information_schema.tables 
where table_schema = 'public' and table_type = 'BASE TABLE'
order by table_name;

-- 2. VERIFICACIÓN DE ROW LEVEL SECURITY (RLS HABILITADO AL 100%)
-- Todas las tablas de public deben tener rls_habilitado = '✅ ACTIVO'
select 
  relname as tabla,
  case when relrowsecurity then '✅ ACTIVO' else '❌ INSEGURO / DESACTIVADO' end as rls_habilitado
from pg_class
where relnamespace = 'public'::regnamespace and relkind = 'r'
order by relname;

-- 3. VERIFICACIÓN DEL CONSTRAINT EN home_records
-- Debe permitir 'shopping', 'cleaning', 'maintenance', 'reset_mission', 'area', 'reset_session'
select 
  conname as constraint_name,
  pg_get_constraintdef(c.oid) as definicion_constraint
from pg_constraint c
join pg_class cl on cl.oid = c.conrelid
where cl.relname = 'home_records' and c.contype = 'c';

-- 4. VERIFICACIÓN DE FUNCIONES RPC Y BLINDAJE DE SEGURIDAD
-- Deben figurar las 4 funciones con security_definer = true
select 
  p.proname as funcion,
  pg_get_function_arguments(p.oid) as argumentos,
  case when p.prosecdef then '✅ SECURITY DEFINER' else '❌ NO DEFINER' end as modo_seguridad,
  array_to_string(p.proconfig, ', ') as search_path_config
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('register_primary_adult', 'create_co_admin_invite', 'get_invite_details', 'claim_coadmin_link')
order by p.proname;

-- 5. VERIFICACIÓN DE PUBLICACIÓN SUPABASE REALTIME
-- Debe listar las 20 tablas de datos familiares suscritas a realtime
select 
  tablename as tabla_realtime,
  '✅ TRANSMISIÓN ACTIVA' as estado
from pg_publication_tables
where pubname = 'supabase_realtime'
order by tablename;

-- 6. VERIFICACIÓN DE REPLICA IDENTITY (Debe ser 'f' = FULL en todas las tablas familiares)
select 
  relname as tabla,
  case when relreplident = 'f' then '✅ FULL (Permite Realtime en DELETE)' else '⚠️ ' || relreplident end as replica_identity
from pg_class
where relnamespace = 'public'::regnamespace and relkind = 'r'
order by relname;

-- 7. VERIFICACIÓN DE TRIGGERS DE SEGURIDAD Y PROTECCIÓN DE AUTORÍA
-- Deben figurar los triggers protectores de campos privilegiados y autoría
select 
  event_object_table as tabla,
  trigger_name,
  action_timing,
  event_manipulation as evento,
  '✅ TRIGGER ACTIVO' as estado
from information_schema.triggers
where trigger_schema = 'public'
  and trigger_name in (
    'tr_protect_profile_fields',
    'tr_protect_co_admin_invites',
    'tr_protect_finance_incomes_created_by',
    'tr_protect_finance_expenses_created_by',
    'tr_protect_finance_bills_created_by',
    'tr_protect_finance_debts_created_by',
    'tr_protect_couple_created_by',
    'tr_protect_habits_created_by'
  )
order by event_object_table, trigger_name;

-- 8. VERIFICACIÓN DE PERMISOS RESTRICTIVOS EN co_admin_invites
-- Debe mostrar que solo SELECT está concedido a authenticated y NO hay INSERT/UPDATE/DELETE
select 
  grantee,
  privilege_type,
  case when privilege_type = 'SELECT' then '✅ PERMITIDO' else '⚠️ REVISAR' end as estado
from information_schema.table_privileges
where table_schema = 'public' 
  and table_name = 'co_admin_invites'
  and grantee in ('authenticated', 'anon')
order by grantee, privilege_type;
