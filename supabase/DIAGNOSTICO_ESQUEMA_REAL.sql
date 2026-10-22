-- ==============================================================================
-- MELOMUS HOGAR — SCRIPT DE DIAGNÓSTICO DE ESQUEMA REAL (100% SOLO LECTURA)
-- ==============================================================================
-- Archivo: DIAGNOSTICO_ESQUEMA_REAL.sql
-- Propósito: Inspeccionar con absoluta seguridad el esquema exacto de producción
--            en Supabase PostgreSQL sin modificar ningún dato ni estructura.
-- Garantía: 100% READ-ONLY (solo sentencias SELECT sobre catálogos del sistema).
-- Ejecución: Copiar y pegar en Supabase -> SQL Editor -> Run (Ctrl+Enter)
-- ==============================================================================

-- ==============================================================================
-- 1. RESUMEN EJECUTIVO EN UN SOLO OBJETO JSON (COPIABLE EN 1 CLIC)
-- ==============================================================================
select jsonb_build_object(
  'generated_at', now(),
  'database_version', version(),
  'tables', (
    select jsonb_agg(
      jsonb_build_object(
        'table_name', t.table_name,
        'rls_enabled', c.relrowsecurity,
        'replica_identity', case c.relreplident
          when 'd' then 'default'
          when 'n' then 'nothing'
          when 'f' then 'full'
          when 'i' then 'index'
          else c.relreplident::text
        end,
        'in_supabase_realtime', exists (
          select 1 from pg_publication_tables pt
          where pt.pubname = 'supabase_realtime' and pt.tablename = t.table_name
        ),
        'columns', (
          select jsonb_agg(
            jsonb_build_object(
              'column_name', col.column_name,
              'ordinal_position', col.ordinal_position,
              'data_type', col.data_type,
              'udt_name', col.udt_name,
              'is_nullable', col.is_nullable,
              'column_default', col.column_default
            ) order by col.ordinal_position
          )
          from information_schema.columns col
          where col.table_schema = 'public' and col.table_name = t.table_name
        ),
        'primary_keys', (
          select coalesce(jsonb_agg(kcu.column_name order by kcu.ordinal_position), '[]'::jsonb)
          from information_schema.table_constraints tc
          join information_schema.key_column_usage kcu
            on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
          where tc.table_schema = 'public' and tc.table_name = t.table_name and tc.constraint_type = 'PRIMARY KEY'
        ),
        'foreign_keys', (
          select coalesce(jsonb_agg(
            jsonb_build_object(
              'constraint_name', tc.constraint_name,
              'column_name', kcu.column_name,
              'foreign_table', ccu.table_name,
              'foreign_column', ccu.column_name,
              'on_delete', rc.delete_rule,
              'on_update', rc.update_rule
            )
          ), '[]'::jsonb)
          from information_schema.table_constraints tc
          join information_schema.key_column_usage kcu
            on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
          join information_schema.referential_constraints rc
            on tc.constraint_name = rc.constraint_name and tc.table_schema = rc.constraint_schema
          join information_schema.constraint_column_usage ccu
            on rc.unique_constraint_name = ccu.constraint_name and rc.unique_constraint_schema = ccu.constraint_schema
          where tc.table_schema = 'public' and tc.table_name = t.table_name and tc.constraint_type = 'FOREIGN KEY'
        ),
        'policies', (
          select coalesce(jsonb_agg(
            jsonb_build_object(
              'policyname', pol.policyname,
              'cmd', pol.cmd,
              'permissive', pol.permissive,
              'roles', pol.roles,
              'qual', pol.qual,
              'with_check', pol.with_check
            )
          ), '[]'::jsonb)
          from pg_policies pol
          where pol.schemaname = 'public' and pol.tablename = t.table_name
        ),
        'triggers', (
          select coalesce(jsonb_agg(
            jsonb_build_object(
              'trigger_name', trg.trigger_name,
              'event_manipulation', trg.event_manipulation,
              'action_timing', trg.action_timing,
              'action_statement', trg.action_statement
            )
          ), '[]'::jsonb)
          from information_schema.triggers trg
          where trg.event_object_schema = 'public' and trg.event_object_table = t.table_name
        )
      ) order by t.table_name
    )
    from information_schema.tables t
    join pg_class c on c.relname = t.table_name
    join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
    where t.table_schema = 'public' and t.table_type = 'BASE TABLE'
  ),
  'functions', (
    select jsonb_agg(
      jsonb_build_object(
        'name', p.proname,
        'arguments', pg_get_function_arguments(p.oid),
        'return_type', pg_get_function_result(p.oid),
        'security_type', case when p.prosecdef then 'SECURITY DEFINER' else 'SECURITY INVOKER' end,
        'volatility', case p.provolatile
          when 'i' then 'IMMUTABLE'
          when 's' then 'STABLE'
          when 'v' then 'VOLATILE'
        end
      ) order by p.proname
    )
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
  )
) as diagnostico_completo_json;


-- ==============================================================================
-- 2. DETALLE TABULAR DE TABLAS Y RLS
-- ==============================================================================
select 
  c.relname as tabla,
  c.relrowsecurity as rls_habilitado,
  c.relforcerowsecurity as rls_forzado,
  case c.relreplident
    when 'd' then 'default (solo PK)'
    when 'n' then 'nothing'
    when 'f' then 'FULL (elimina con fila completa)'
    when 'i' then 'index'
    else c.relreplident::text
  end as replica_identity,
  exists (
    select 1 from pg_publication_tables pt
    where pt.pubname = 'supabase_realtime' and pt.tablename = c.relname
  ) as en_realtime_publication
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by c.relname;


-- ==============================================================================
-- 3. DETALLE DE COLUMNAS (VERIFICACIÓN DE ESQUEMA REAL)
-- ==============================================================================
select 
  table_name,
  ordinal_position as pos,
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
order by table_name, ordinal_position;


-- ==============================================================================
-- 4. POLÍTICAS RLS ACTIVAS
-- ==============================================================================
select 
  tablename,
  policyname,
  cmd,
  permissive,
  roles,
  qual as using_expression,
  with_check as check_expression
from pg_policies
where schemaname = 'public'
order by tablename, policyname;


-- ==============================================================================
-- 5. FUNCIONES Y PROCEDIMIENTOS ALMACENADOS (RPC)
-- ==============================================================================
select 
  p.proname as nombre_funcion,
  pg_get_function_arguments(p.oid) as parametros,
  pg_get_function_result(p.oid) as retorno,
  case when p.prosecdef then 'SECURITY DEFINER' else 'SECURITY INVOKER' end as tipo_seguridad,
  case p.provolatile
    when 'i' then 'IMMUTABLE'
    when 's' then 'STABLE'
    when 'v' then 'VOLATILE'
  end as volatilidad
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
order by p.proname;


-- ==============================================================================
-- 6. TRIGGERS Y DISPARADORES ACTIVOS
-- ==============================================================================
select 
  event_object_table as tabla,
  trigger_name,
  action_timing as momento,
  event_manipulation as evento,
  action_statement as definicion
from information_schema.triggers
where event_object_schema = 'public'
order by event_object_table, trigger_name;


-- ==============================================================================
-- 7. CLAVES FORÁNEAS Y RELACIONES REFERENCIALES
-- ==============================================================================
select 
  tc.table_name as tabla_origen,
  kcu.column_name as columna_origen,
  ccu.table_name as tabla_destino,
  ccu.column_name as columna_destino,
  rc.delete_rule as al_eliminar,
  rc.update_rule as al_actualizar,
  tc.constraint_name as nombre_constraint
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
join information_schema.referential_constraints rc
  on tc.constraint_name = rc.constraint_name and tc.table_schema = rc.constraint_schema
join information_schema.constraint_column_usage ccu
  on rc.unique_constraint_name = ccu.constraint_name and rc.unique_constraint_schema = ccu.constraint_schema
where tc.table_schema = 'public' and tc.constraint_type = 'FOREIGN KEY'
order by tc.table_name, kcu.column_name;
