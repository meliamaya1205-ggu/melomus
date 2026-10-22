-- ==============================================================================
-- NUESTRO HOGAR — POLÍTICAS RLS (ROW LEVEL SECURITY)
-- ==============================================================================
-- 1. Aislamiento total multi-tenant por family_id (imposible leer datos de otra familia)
-- 2. Privacidad individual de finanzas (gastos e ingresos personales)
-- 3. Privacidad individual de hábitos (hábitos privados de Mamá o Papá)
-- 4. Protección estricta de intimidad en pareja (Cuqui Time exclusivo para adultos)
-- 5. Direccionamiento de notificaciones por usuario
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. FUNCIONES AUXILIARES DE SEGURIDAD (SECURITY DEFINER)
-- ------------------------------------------------------------------------------

-- Devuelve el family_id del usuario autenticado
create or replace function get_auth_family_id()
returns uuid language sql stable security definer as $$
  select family_id from profiles where id = auth.uid();
$$;

-- Devuelve la relación ('mama' o 'papa') del usuario autenticado
create or replace function get_auth_relationship()
returns text language sql stable security definer as $$
  select relationship from profiles where id = auth.uid();
$$;

-- Verifica si el usuario autenticado es un adulto coadministrador
create or replace function is_family_adult()
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from profiles 
    where id = auth.uid() 
      and role in ('FAMILY_ADULT', 'SUPER_ADMIN')
  );
$$;

-- ------------------------------------------------------------------------------
-- 2. HABILITACIÓN DE RLS EN TODAS LAS TABLAS
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

-- ------------------------------------------------------------------------------
-- 3. POLÍTICAS PARA FAMILIAS Y PERFILES
-- ------------------------------------------------------------------------------

-- families
create policy "families_select_member" on families
  for select using (id = get_auth_family_id());

create policy "families_update_adult" on families
  for update using (id = get_auth_family_id() and is_family_adult());

-- profiles
create policy "profiles_select_family" on profiles
  for select using (family_id = get_auth_family_id());

create policy "profiles_update_self" on profiles
  for update using (id = auth.uid());

-- co_admin_invites (Solo lectura para adultos; mutaciones estrictamente por RPCs)
create policy "co_admin_invites_select_adults" on co_admin_invites
  for select using (family_id = get_auth_family_id() and is_family_adult());

revoke insert, update, delete on co_admin_invites from authenticated, anon, public;
grant select on co_admin_invites to authenticated;

-- family_members
create policy "family_members_select_family" on family_members
  for select using (family_id = get_auth_family_id());

create policy "family_members_manage_adult" on family_members
  for all using (family_id = get_auth_family_id() and is_family_adult());

-- ------------------------------------------------------------------------------
-- 4. POLÍTICAS PARA TAREAS Y CALENDARIO
-- ------------------------------------------------------------------------------

-- tasks
create policy "tasks_select_family" on tasks
  for select using (family_id = get_auth_family_id());

create policy "tasks_insert_family" on tasks
  for insert with check (family_id = get_auth_family_id());

create policy "tasks_update_family" on tasks
  for update using (family_id = get_auth_family_id());

create policy "tasks_delete_family" on tasks
  for delete using (family_id = get_auth_family_id() and is_family_adult());

-- calendar_events
create policy "calendar_events_select_family" on calendar_events
  for select using (family_id = get_auth_family_id());

create policy "calendar_events_insert_family" on calendar_events
  for insert with check (family_id = get_auth_family_id());

create policy "calendar_events_update_family" on calendar_events
  for update using (family_id = get_auth_family_id());

create policy "calendar_events_delete_family" on calendar_events
  for delete using (family_id = get_auth_family_id() and is_family_adult());

-- ------------------------------------------------------------------------------
-- 5. POLÍTICAS PARA HÁBITOS (PRIVACIDAD INDIVIDUAL ESTRICTA)
-- ------------------------------------------------------------------------------
-- Un hábito con is_private = true SOLO es visible para quien lo creó
create policy "habits_select_privacy" on habits
  for select using (
    family_id = get_auth_family_id()
    and (is_private = false or created_by_user_id = auth.uid())
  );

create policy "habits_insert_family" on habits
  for insert with check (family_id = get_auth_family_id());

create policy "habits_update_privacy" on habits
  for update using (
    family_id = get_auth_family_id()
    and (is_private = false or created_by_user_id = auth.uid())
  );

create policy "habits_delete_privacy" on habits
  for delete using (
    family_id = get_auth_family_id()
    and (is_private = false or created_by_user_id = auth.uid())
  );

-- ------------------------------------------------------------------------------
-- 6. POLÍTICAS PARA FINANZAS (PRIVACIDAD PERSONAL VS NUESTRO DINERO)
-- ------------------------------------------------------------------------------

-- Gastos: Si scope = 'personal', SOLO visible para el usuario creador
create policy "finances_expenses_select" on finances_expenses
  for select using (
    family_id = get_auth_family_id()
    and (scope = 'family' or created_by_user_id = auth.uid())
  );

create policy "finances_expenses_insert" on finances_expenses
  for insert with check (family_id = get_auth_family_id());

create policy "finances_expenses_update" on finances_expenses
  for update using (
    family_id = get_auth_family_id()
    and (scope = 'family' or created_by_user_id = auth.uid())
  );

create policy "finances_expenses_delete" on finances_expenses
  for delete using (
    family_id = get_auth_family_id()
    and (scope = 'family' or created_by_user_id = auth.uid())
  );

-- Ingresos: Si scope = 'personal', SOLO visible para el usuario creador
create policy "finances_incomes_select" on finances_incomes
  for select using (
    family_id = get_auth_family_id()
    and (scope = 'family' or created_by_user_id = auth.uid())
  );

create policy "finances_incomes_insert" on finances_incomes
  for insert with check (family_id = get_auth_family_id());

create policy "finances_incomes_update" on finances_incomes
  for update using (
    family_id = get_auth_family_id()
    and (scope = 'family' or created_by_user_id = auth.uid())
  );

create policy "finances_incomes_delete" on finances_incomes
  for delete using (
    family_id = get_auth_family_id()
    and (scope = 'family' or created_by_user_id = auth.uid())
  );

-- Cuentas por Pagar
create policy "finances_bills_all" on finances_bills
  for all using (
    family_id = get_auth_family_id()
    and (scope = 'family' or created_by_user_id = auth.uid())
  );

-- Deudas
create policy "finances_debts_all" on finances_debts
  for all using (
    family_id = get_auth_family_id()
    and (scope = 'family' or created_by_user_id = auth.uid())
  );

-- Presupuestos y Metas (Familiares)
create policy "finances_budgets_all" on finances_budgets
  for all using (family_id = get_auth_family_id() and is_family_adult());

create policy "finances_goals_all" on finances_goals
  for all using (family_id = get_auth_family_id() and is_family_adult());

-- ------------------------------------------------------------------------------
-- 7. POLÍTICAS PARA SALUD, PAREJA Y CUQUI TIME
-- ------------------------------------------------------------------------------

-- Salud Familiar: Accesible para los adultos coadministradores de la familia
create policy "health_records_all" on health_records
  for all using (family_id = get_auth_family_id() and is_family_adult());

-- Pareja y Cuqui Time: Exclusivo para los adultos coadministradores de la misma familia
create policy "couple_records_all" on couple_records
  for all using (family_id = get_auth_family_id() and is_family_adult());

-- Hogar: Accesible para la familia
create policy "home_records_all" on home_records
  for all using (family_id = get_auth_family_id());

-- Recompensas y Alcancía
create policy "rewards_select" on rewards
  for select using (family_id = get_auth_family_id());

create policy "rewards_manage_adult" on rewards
  for all using (family_id = get_auth_family_id() and is_family_adult());

create policy "points_history_all" on points_history
  for all using (family_id = get_auth_family_id());

-- ------------------------------------------------------------------------------
-- 8. POLÍTICAS PARA NOTIFICACIONES MULTIUSUARIO DIRIGIDAS
-- ------------------------------------------------------------------------------
-- El usuario solo ve notificaciones dirigidas a él, a su rol ('mama' o 'papa') o globales ('all')
create policy "notifications_select_target" on notifications
  for select using (
    family_id = get_auth_family_id()
    and (
      target_user_id is null
      or target_user_id = auth.uid()
      or target_member_id = get_auth_relationship()
      or target_member_id = 'all'
    )
  );

create policy "notifications_insert_family" on notifications
  for insert with check (family_id = get_auth_family_id());

create policy "notifications_update_target" on notifications
  for update using (
    family_id = get_auth_family_id()
    and (
      target_user_id is null
      or target_user_id = auth.uid()
      or target_member_id = get_auth_relationship()
      or target_member_id = 'all'
    )
  );

create policy "notifications_delete_target" on notifications
  for delete using (
    family_id = get_auth_family_id()
    and is_family_adult()
  );

-- ------------------------------------------------------------------------------
-- 9. CONFIGURACIÓN Y TEMAS
-- ------------------------------------------------------------------------------
create policy "app_customizations_all" on app_customizations
  for all using (family_id = get_auth_family_id());

-- ------------------------------------------------------------------------------
-- 10. POLÍTICAS PARA SUSCRIPCIONES PUSH WEB / PWA
-- ------------------------------------------------------------------------------
-- Cada usuario solo puede ver, registrar, modificar y eliminar sus propios dispositivos (endpoints).
create policy "push_subscriptions_select_self" on push_subscriptions
  for select using (user_id = auth.uid());

create policy "push_subscriptions_insert_self" on push_subscriptions
  for insert with check (
    user_id = auth.uid() 
    and family_id = get_auth_family_id()
  );

create policy "push_subscriptions_update_self" on push_subscriptions
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "push_subscriptions_delete_self" on push_subscriptions
  for delete using (user_id = auth.uid());

