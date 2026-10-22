# INFORME DE AUDITORÍA TÉCNICA DEFINITIVA — ESTADO DEL SISTEMA MELOMUS
**Fecha de Auditoría:** 28 de Septiembre de 2026  
**Rol del Auditor:** Arquitecto de Software & Lead Auditor Full Stack  
**Alcance:** Inspección forense de código fuente, servicios de sincronización, persistencia en Supabase, seguridad RLS, Realtime, Service Worker y preparación para despliegue en Producción (Vercel + Supabase).

---

## 1. Estado de los Procesos en Cola y CRUD

### 1.1 Diagnóstico de Reparación CRUD Módulo por Módulo
Tras inspeccionar los componentes de vista (`src/views/`), el contexto global (`src/context/FamilyContext.tsx`), el adaptador de datos (`src/services/dataAdapter.ts`) y el servicio de persistencia en la nube (`src/services/supabaseDataService.ts`), se confirma el estado de implementación de extremo a extremo:

| Módulo / Entidad | Archivo de Vista | Creación (CREATE) | Edición (UPDATE) | Eliminación (DELETE) | Persistencia Supabase |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Tareas del Hogar** | `src/views/TasksView.tsx` | ✅ Sí | ✅ Sí (`updateTask`) | ✅ Sí (`deleteTask`) | ✅ `tasks` table |
| **Calendario Familiar** | `src/views/CalendarView.tsx` | ✅ Sí | ✅ Sí (`updateEvent`) | ✅ Sí (`deleteEvent`) | ✅ `calendar_events` |
| **Hábitos** | `src/views/HabitsView.tsx` | ✅ Sí | ✅ Sí (`updateHabit`) | ✅ Sí (`deleteHabit`) | ✅ `habits` table |
| **Finanzas — Ingresos** | `src/views/FinanceView.tsx` | ✅ Sí | ✅ Sí (`updateIncome`) | ✅ Sí (`deleteIncome`) | ✅ `finances_incomes` |
| **Finanzas — Gastos** | `src/views/FinanceView.tsx` | ✅ Sí | ✅ Sí (`updateExpense`) | ✅ Sí (`deleteExpense`) | ✅ `finances_expenses` |
| **Finanzas — Cuentas por Pagar** | `src/views/FinanceView.tsx` | ✅ Sí | ✅ Sí (`updateBill`) | ✅ Sí (`deleteBill`) | ✅ `finances_bills` |
| **Finanzas — Deudas** | `src/views/FinanceView.tsx` | ✅ Sí | ✅ Sí (`updateDebt`, `updateDebtBalance`) | ✅ Sí (`deleteDebt`) | ✅ `finances_debts` |
| **Finanzas — Presupuestos** | `src/views/FinanceView.tsx` | ✅ Sí | ✅ Sí (`updateBudget`) | ✅ Sí (`deleteBudget`) | ✅ `finances_budgets` |
| **Finanzas — Metas de Ahorro** | `src/views/FinanceView.tsx` | ✅ Sí | ✅ Sí (`updateGoal`, `contributeToGoal`) | ✅ Sí (`deleteGoal`) | ✅ `finances_goals` |
| **Salud — Citas Médicas** | `src/views/HealthView.tsx` | ✅ Sí | ✅ Sí (`updateAppointment`) | ✅ Sí (`deleteAppointment`) | ✅ `health_records` (`record_type='appointment'`) |
| **Salud — Medicamentos & Dosis**| `src/views/HealthView.tsx` | ✅ Sí | ✅ Sí (`updateMedication`) | ✅ Sí (`deleteMedication`) | ✅ `health_records` (`record_type='medication'/'dose_log'`) |
| **Salud — Consultas Pediátricas**| `src/views/HealthView.tsx` | ✅ Sí | ✅ Sí (`updatePediatricQuery`) | ✅ Sí (`deletePediatricQuery`) | ✅ `health_records` (`record_type='pediatric_query'`) |
| **Salud — Vacunas** | `src/views/HealthView.tsx` | ✅ Sí | ✅ Sí (`updateVaccineRecord`) | ✅ Sí (`deleteVaccineRecord`) | ✅ `health_records` (`record_type='vaccine'`) |
| **Pareja — Check-ins** | `src/views/CoupleView.tsx` | ✅ Sí | ✅ Sí (`updateCoupleCheckIn`) | ✅ Sí (`deleteCoupleCheckIn`) | ✅ `couple_records` (`item_type='check_in'`) |
| **Pareja — Conversaciones** | `src/views/CoupleView.tsx` | ✅ Sí | ✅ Sí (`updateCoupleConversation`) | ✅ Sí (`deleteCoupleConversation`) | ✅ `couple_records` (`item_type='conversation'`) |
| **Pareja — Citas** | `src/views/CoupleView.tsx` | ✅ Sí | ✅ Sí (`updateCoupleDate`) | ✅ Sí (`deleteCoupleDate`) | ✅ `couple_records` (`item_type='date'`) |
| **Pareja — Gestos de Cariño** | `src/views/CoupleView.tsx` | ✅ Sí | ✅ Sí (`updateCoupleGesture`, `recordCoupleGesture`) | ✅ Sí (`deleteCoupleGesture`) | ✅ `couple_records` (`item_type='gesture'`) |
| **Pareja — Acuerdos & Espiritual**| `src/views/CoupleView.tsx` | ✅ Sí | ✅ Sí (`updateCoupleAgreement`, `updateCoupleSpiritualItem`) | ✅ Sí (`deleteCoupleAgreement`, `deleteCoupleSpiritualItem`) | ✅ `couple_records` |
| **Pareja — Cuqui Time** | `src/views/CoupleView.tsx` | ✅ Sí | ✅ Sí (`updateCuquiTimeSession`) | ✅ Sí (`deleteCuquiTimeSession`) | ✅ `couple_records` (`item_type='cuqui_time'`) |
| **Pareja — Baúl de Recuerdos** | `src/views/CoupleView.tsx` | ✅ Sí | ✅ Sí (`updateCoupleMemory`) | ✅ Sí (`deleteCoupleMemory`) | ✅ `couple_records` (`item_type='memory'`) |
| **Hogar — Compras, Limpieza, Mant.**| `src/views/HomeView.tsx` | ✅ Sí | ✅ Sí (todos los modales de edición) | ✅ Sí | ✅ `home_records` |
| **Fichas de Niños / Integrantes**| `src/views/FamilyView.tsx` | ✅ Sí | ✅ Sí (`updateMember`) | ✅ Sí (`deleteMember` con modal de confirmación) | ✅ `family_members` |
| **Recompensas y Puntos** | `src/views/RewardsView.tsx`| ✅ Sí | ✅ Sí (`updateReward`, `adjustMemberPoints`) | ✅ Sí (`deleteReward`) | ✅ `rewards`, `points_history` |

### 1.2 Flujo de Persistencia: De la UI a Supabase
El sistema **no** mantiene los cambios congelados en el estado de React. El pipeline opera de la siguiente forma:
1. **Acción UI:** El usuario edita un registro en el modal correspondiente (ej. `FinanceView.tsx:414` ejecutando `updateDebt(id, updates)`).
2. **Context Dispatch:** `FamilyContext.tsx` muta la colección correspondiente en su estado `state.debts`.
3. **Reactive Watcher:** Un hook `useEffect` dedicado (ej. `FamilyContext.tsx:631-634`) detecta el cambio y ejecuta:
   ```typescript
   dataService.saveStateKey('debts', state.debts);
   ```
4. **Adapter Proxy:** `DataServiceManager` delega a la instancia activa (`SupabaseDataService`).
5. **Debounced Push & Deletion:** En `SupabaseDataService.pushKeyToSupabase`:
   - Se realiza un `.upsert(rows, { onConflict: 'family_id,id' })`.
   - Se identifican las bajas mediante eliminación diferencial: `.delete().eq('family_id', familyId).not('id', 'in', ids)`.

### 1.3 Módulo Family Reset — Verificación de Duración Personalizable
Se inspeccionó `src/types/reset.ts` y `src/components/reset/FamilyResetModal.tsx`:
- **Presets de Duración:** Ya **no** está fijado a 10 minutos. Incluye **18 presets predefinidos**:
  `15m`, `30m`, `45m`, `1h`, `1.5h`, `2h`, `3h`, `4h`, `5h`, `6h`, `8h`, `12h`, `24h`, `2d`, `3d`, `7d`, `14d`, `30d`.
- **Modo Personalizado Libre:** Permite seleccionar cualquier número y elegir la unidad: **minutos**, **horas**, **días** o **semanas**.
- **Metadatos y Auditoría:** Al iniciar la sesión, se registran en la entidad `FamilyResetSession`:
  - `startedAt` (ISO Timestamp de inicio).
  - `endsAt` (ISO Timestamp calculado de finalización).
  - `durationValue` y `durationUnit`.
  - `remainingSeconds` y `status` (`'idle' | 'active' | 'paused' | 'completed'`).
  - `startedBy` (adulto que inició la sesión).
- **Heartbeat de Conclusión:** En `FamilyContext.tsx:657-684`, un `setInterval` cada 1000ms valida si `now >= endsAt` y finaliza la sesión de forma autónoma con `completedAt`.

---

## 2. Diagnóstico del Adapter de Datos y Fallbacks

### 2.1 Arquitectura del Adapter (`dataAdapter.ts` y `supabaseDataService.ts`)
El sistema utiliza el patrón Strategy gestionado por `DataServiceManager`:
- **`LocalStorageDataService`:** Se inicializa como el adaptador por defecto cuando la aplicación arranca o cuando no hay credenciales de Supabase configuradas.
- **`SupabaseDataService`:** Se activa mediante `dataServiceManager.useCloudSync()` una vez que `authService.getCurrentUser()` resuelve un usuario autenticado y `isSupabaseConfigured()` es verdadero.

### 2.2 Diagnóstico de "Silent Fallbacks" (Caídas Silenciosas a LocalStorage)
Se detectaron **tres escenarios de degradación silenciosa** donde los datos se guardan únicamente en el navegador sin que el usuario sea advertido:

1. **Fallo de Red o Timeout al Iniciar Sesión Cloud (`SupabaseDataService.initCloudSession`):**
   *(Líneas 211-214 de `src/services/supabaseDataService.ts`)*:
   ```typescript
   } catch (err) {
     console.warn('[SupabaseDataService] Error cargando estado desde la nube, usando cache local:', err);
     return this.cachedState;
   }
   ```
   **Riesgo:** Si Supabase arroja un error 500, timeout o rechazo de RLS, el método captura la excepción en un `console.warn` y retorna el `localStorage` previo. El usuario cree estar conectado a la nube, pero está leyendo datos viejos y locales.

2. **Fallo en Mutaciones Asíncronas (`SupabaseDataService.pushKeyToSupabase`):**
   *(Líneas 754-756 de `src/services/supabaseDataService.ts`)*:
   ```typescript
   } catch (err) {
     console.warn(`[SupabaseDataService] Error sincronizando ${String(key)} con Supabase:`, err);
   }
   ```
   **Riesgo:** No existe cola de reintentos (`retry queue`) ni almacenamiento transaccional local (ej. IndexedDB `outbox`). Si la petición `upsert` o `delete` falla (por pérdida momentánea de 4G/WiFi o error de RLS), el error es ignorado tras loguearse en consola. La interfaz local muestra el cambio como exitoso porque React ya actualizó su estado en memoria y en `localStorage`, pero el otro teléfono **nunca** recibirá el cambio.

3. **Modo Local/Demo por Ausencia de Inicio de Sesión:**
   Si el usuario no inicia sesión con correo y contraseña, `dataService.mode` permanece en `'local_demo'`. Las llamadas a `saveStateKey` guardan exclusivamente en el navegador local.

### 2.3 Visibilidad en la UI: ¿Existe Distinción Claro entre Cloud y Local?
- **Deficiencia Crítica en Header/Navbar:**
  En `src/components/layout/Navbar.tsx`, **no existe un badge o píldora visible en el encabezado principal** que indique el estado de conectividad (`Cloud Conectado` vs `Modo Local / Desconectado`).
- La indicación de nube (`Cloud` icon con correo) está **oculta dentro del menú desplegable del avatar** (`Navbar.tsx:238-254`).
- Si la conexión se pierde a mitad del uso, no aparece ningún banner flotante (`toast` o `banner offline`), provocando una falsa sensación de persistencia en la nube.

---

## 3. Matriz de Coadministración Paritaria y Privacidad (RLS)

### 3.1 Paridad Absoluta de Coadministradores Adultos (Mamá y Papá)
El modelo de datos implementa una estructura simétrica paritaria:
- La tabla `families` vincula a ambos adultos principales mediante:
  `primary_adult_mama_id` y `primary_adult_papa_id`.
- La tabla `profiles` restringe el campo `relationship` a `'mama'` o `'papa'`, asignando a ambos el rol `'FAMILY_ADULT'`.
- La función de seguridad `is_family_adult()` (`supabase/rls_policies.sql:28-35`):
  ```sql
  create or replace function is_family_adult()
  returns boolean language sql stable security definer as $$
    select exists (
      select 1 from profiles 
      where id = auth.uid() 
        and role in ('FAMILY_ADULT', 'SUPER_ADMIN')
    );
  $$;
  ```
  Otorga exactamente los mismos privilegios de administración a ambos adultos.

### 3.2 Finanzas: Aislamiento de "Mi Organización" (Personal) vs Gastos Familiares
En `supabase/rls_policies.sql` (líneas 149-198), las políticas de `finances_expenses`, `finances_incomes`, `finances_bills` y `finances_debts` están configuradas con segregación estricta por `scope`:
```sql
create policy "finances_expenses_select" on finances_expenses
  for select using (
    family_id = get_auth_family_id()
    and (scope = 'family' or created_by_user_id = auth.uid())
  );
```
- **Comportamiento Validado:**
  - Registros con `scope = 'family'`: Visibles y editables por ambos adultos coadministradores de la misma familia.
  - Registros con `scope = 'personal'`: **Aislados a nivel de motor de base de datos**. Aunque el otro adulto pertenezca a la misma familia, Supabase Postgres filtra el registro porque `created_by_user_id != auth.uid()`.
  - En la interfaz (`FinanceView.tsx:1438-1615`), el selector de ámbito cambia la visualización entre el espacio familiar compartido y el espacio privado individual de Mamá o Papá.

### 3.3 Pareja y Cuqui Time: Blindaje contra Perfiles Infantiles
- **Nivel de Base de Datos (RLS):**
  La tabla `couple_records` posee la política (`rls_policies.sql:223-225`):
  ```sql
  create policy "couple_records_all" on couple_records
    for all using (family_id = get_auth_family_id() and is_family_adult());
  ```
  Los perfiles infantiles no tienen credenciales de autenticación en Supabase Auth (`auth.uid()` no existe para ellos o no posee `role = 'FAMILY_ADULT'`). Por tanto, cualquier consulta directa a `couple_records` desde un perfil no adulto es rechazada con un conjunto de resultados vacío.
- **Nivel de Interfaz (Defensa en Profundidad):**
  En `src/App.tsx:49-58`, si `isKidView === true`, el enrutador bloquea el renderizado de cualquier vista privada (finanzas, pareja, salud, tareas, configuración) y redirige automáticamente a `KidsDashboardView`, `HabitsView` o `RewardsView`.

### 3.4 Aislamiento Multi-Tenant Familiar (`family_id`)
- Todas las tablas del esquema (`families`, `profiles`, `tasks`, `calendar_events`, `habits`, finanzas, `health_records`, `couple_records`, `home_records`, `rewards`, `points_history`, `notifications`, `app_customizations`, `push_subscriptions`) poseen clave foránea `family_id uuid not null references families(id) on delete cascade`.
- La función de seguridad `get_auth_family_id()` extrae el `family_id` del perfil asociado a `auth.uid()`, impidiendo que un usuario de la Familia A pueda leer o escribir datos de la Familia B.

---

## 4. Sincronización Realtime y Web Push

### 4.1 Estado de Supabase Realtime (`subscribeToRealtime`)
En `src/services/supabaseDataService.ts` (líneas 763-877), se crea un canal único de suscripción `family_realtime_${familyId}` que escucha eventos `postgres_changes` con filtro `family_id=eq.${familyId}`.

#### Tablas con Realtime Activo y Sincronizado:
1. `tasks` (`handleTaskRealtime`)
2. `calendar_events` (`handleCalendarRealtime`)
3. `habits` (`handleHabitRealtime`)
4. `finances_expenses` (`handleExpenseRealtime`)
5. `finances_incomes` (`handleIncomeRealtime`)
6. `finances_bills` (`handleBillRealtime`)
7. `finances_debts` (`handleDebtRealtime`)
8. `finances_budgets` (`handleBudgetRealtime`)
9. `finances_goals` (`handleGoalRealtime`)
10. `health_records` (`handleHealthRealtime`)
11. `couple_records` (`handleCoupleRealtime`)
12. `home_records` (`handleHomeRealtime` — cubre compras, limpieza, mantenimiento y Family Reset)
13. `rewards` (`handleRewardRealtime`)
14. `points_history` (`handlePointsHistoryRealtime`)
15. `family_members` (`handleMemberRealtime`)
16. `notifications` (`handleNotificationRealtime`)

#### ⚠️ Ausencia Detectada en Realtime:
- **`app_customizations`:** No tiene `channel.on(...)` configurado en `subscribeToRealtime()`. Si el Adulto A cambia el nombre de la familia, el tema visual o la configuración de módulos en `SettingsView`, el dispositivo del Adulto B **no** se actualizará en tiempo real hasta que recargue la página.

### 4.2 Web Push y Service Worker: ¿Notificaciones Reales o Mock?
- **Service Worker (`public/sw.js`):**
  - Implementa un handler nativo para el evento `push` (`self.addEventListener('push', ...)`).
  - Incluye soporte de **Modo Discreto**: si la notificación contiene la bandera `isDiscrete`, enmascara el texto sensible en la pantalla de bloqueo (ej. Cuqui Time se muestra como *"Tienes un momento especial reservado"*).
- **Gestión de Suscripciones (`notificationService.ts`):**
  - `subscribeToPush(vapidPublicKey)` interactúa con `PushManager.subscribe()` usando la clave VAPID pública.
  - `savePushSubscription()` envía la suscripción a la tabla `push_subscriptions` en Supabase con `user_id`, `family_id`, `endpoint`, `p256dh`, `auth` y metadatos de dispositivo.
- **🚨 Brecha Crítica en el Backend:**
  **No existen despachadores de notificaciones en el backend** (no hay Supabase Edge Functions ni Webhooks de base de datos configurados en el repositorio).
  - Cuando la aplicación está **abierta en primer plano**, las notificaciones se disparan en el cliente vía `FamilyContext.tsx:354-490` al recibir eventos de Realtime.
  - Cuando la aplicación está **cerrada o en segundo plano**, no hay ningún proceso en el servidor que consuma la tabla `push_subscriptions` y envíe la carga útil a los servidores de FCM/Mozilla Push Service. Por tanto, **las notificaciones push en segundo plano no funcionarán en producción** hasta desplegar una Edge Function de despacho.
- **🚨 Brecha en RLS para `push_subscriptions`:**
  En `supabase/rls_policies.sql`, la tabla `push_subscriptions` **no** tiene políticas RLS definidas, a pesar de existir en `schema.sql`.

---

## 5. Configuración para Producción (Vercel + Supabase)

### 5.1 Variables de Entorno
Inspección de `.env.example`:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_VAPID_PUBLIC_KEY=BD...
```
- **Evaluación:** Las variables requeridas están claramente documentadas.
- **Validación en Cliente:** `supabaseClient.ts` valida correctamente la presencia y formato de estas variables antes de inicializar el cliente singleton de Supabase.

### 5.2 Estado de Compilación (`npm run build`)
- **Resultado:** **EXITOSO (Código de salida: 0)**.
- El bundle de Vite se genera correctamente en `dist/` sin errores de TypeScript ni discrepancias de tipado.

### 5.3 Estado de Linteo (`npm run lint`)
- **Resultado:** **0 errores, 11 advertencias**.
- **Detalle de las advertencias:**
  1. `src/context/FamilyContext.tsx`: Advertencia `react(only-export-components)` por exportar `useFamily` en el mismo archivo del proveedor.
  2. `src/context/FamilyContext.tsx:503`: `set-state-in-effect` al detectar token en query param `?vincular=`.
  3. `src/context/ThemeContext.tsx:50`: `set-state-in-effect` al sincronizar `activeProfileId`.
  4. `src/components/auth/WelcomeScreen.tsx:36`: `set-state-in-effect` al recibir prop `inviteToken`.
  5. `src/components/auth/ClaimInviteView.tsx:82`: `set-state-in-effect` y dependencia faltante en `verifyToken`.
  6. `src/components/auth/AuthModal.tsx:83`: `set-state-in-effect` al resetear estados de error/éxito al abrir.
  7. `src/components/theme/ThemeSelector.tsx:79`: `set-state-in-effect` y dependencias faltantes en `useEffect`.

---

## 6. Matriz "Semáforo" de Estado Real

| Módulo / Función | UI Lista | CRUD Supabase Completo | Realtime Activo | Privacidad / RLS Validada | Estado Final |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Tareas del Hogar** | 🟢 Sí | 🟢 Completo | 🟢 Sí (`tasks`) | 🟢 Aislamiento familiar | 🟢 **Verde** |
| **Calendario Familiar** | 🟢 Sí | 🟢 Completo | 🟢 Sí (`calendar_events`) | 🟢 Aislamiento familiar | 🟢 **Verde** |
| **Hábitos Personales/Familiares** | 🟢 Sí | 🟢 Completo | 🟢 Sí (`habits`) | 🟢 Aislamiento personal (`is_private`) | 🟢 **Verde** |
| **Finanzas Familiares** | 🟢 Sí | 🟢 Completo | 🟢 Sí (6 tablas) | 🟢 Paridad coadministradores | 🟢 **Verde** |
| **Finanzas Personales ("Mi Org")** | 🟢 Sí | 🟢 Completo | 🟢 Sí | 🟢 Aislamiento por `created_by_user_id` | 🟢 **Verde** |
| **Salud Familiar & Vacunas** | 🟢 Sí | 🟢 Completo | 🟢 Sí (`health_records`) | 🟢 Adultos coadministradores | 🟢 **Verde** |
| **Pareja & Gestos de Cariño** | 🟢 Sí | 🟢 Completo | 🟢 Sí (`couple_records`) | 🟢 Adultos coadministradores | 🟢 **Verde** |
| **Cuqui Time (Intimidad)** | 🟢 Sí | 🟢 Completo | 🟢 Sí (`couple_records`) | 🟢 Oculto a niños + RLS `is_family_adult` | 🟢 **Verde** |
| **Family Reset (Duración Libre)** | 🟢 Sí | 🟢 Completo | 🟢 Sí (`home_records`) | 🟢 Aislamiento familiar | 🟢 **Verde** |
| **Hogar (Compras, Limpieza, Mant.)**| 🟢 Sí | 🟢 Completo | 🟢 Sí (`home_records`) | 🟢 Aislamiento familiar | 🟢 **Verde** |
| **Fichas de Niños & Integrantes** | 🟢 Sí | 🟢 Completo | 🟢 Sí (`family_members`) | 🟢 Adultos coadministradores | 🟢 **Verde** |
| **Recompensas & Alcancía** | 🟢 Sí | 🟢 Completo | 🟢 Sí (2 tablas) | 🟢 Aislamiento familiar | 🟢 **Verde** |
| **Configuración y Personalización** | 🟢 Sí | 🟢 Completo | 🟡 **Falta suscripción en Realtime** | 🟢 Aislamiento familiar | 🟡 **Amarillo** |
| **Indicador UI de Estado Cloud/Local**| 🔴 Falta | N/A | N/A | N/A | 🔴 **Rojo** |
| **Cola de Reintentos Offline (Sync)**| 🔴 Falta | 🟡 Optimistic sin reintento | N/A | N/A | 🟡 **Amarillo** |
| **Notificaciones Push en 2° Plano** | 🟢 SW listo | 🟡 Tabla sin RLS | 🟢 In-app vía RT | 🔴 **Falta Edge Function / Backend Dispatcher** | 🔴 **Rojo** |

---

## 7. Lista Priorizada de Tareas Críticas Restantes

### Nivel 1: Bloqueante (Para evitar pérdida de datos o inconsistencias entre dos teléfonos en producción)
1. **Crear Indicador Visible de Conectividad Cloud/Local en el Header:**
   - Agregar en `Navbar.tsx` un indicador de estado visual directo (píldora verde/ámbar/roja con tooltip) que refleje `dataMode` y la presencia de conexión activa con Supabase.
   - Mostrar un banner de alerta si la aplicación entra en fallback local por error de autenticación o caída del backend.
2. **Implementar Suscripción Realtime para `app_customizations`:**
   - En `src/services/supabaseDataService.ts`, agregar el listener de `app_customizations` en `subscribeToRealtime` para que cambios de nombre de familia, temas o configuración de módulos se sincronicen de inmediato entre ambos adultos.
3. **Completar Políticas RLS para `push_subscriptions` en Supabase:**
   - Agregar en `supabase/rls_policies.sql`:
     ```sql
     alter table push_subscriptions enable row level security;
     create policy "push_subscriptions_self" on push_subscriptions
       for all using (user_id = auth.uid());
     ```

### Nivel 2: Alta (Robustez en pruebas simultáneas con 2 dispositivos móviles)
4. **Implementar Despachador Backend para Web Push (Edge Function):**
   - Crear una Supabase Edge Function (ej. `supabase/functions/send-push/index.ts`) que reciba un webhook de inserción en `notifications` o una invocación RPC para enviar el payload cifrado (Web Push) a los endpoints almacenados en `push_subscriptions`.
5. **Manejo de Errores y Notificación de Fallos de Sincronización:**
   - Sustituir los `console.warn` silenciosos en `pushKeyToSupabase` por un estado accesible en el contexto (`syncError` o `pendingSyncCount`) para notificar al usuario cuando una operación no se pudo persistir en la nube.

### Nivel 3: Media (Optimización de código y experiencia de usuario)
6. **Resolución de Advertencias del Linter (11 warnings):**
   - Refactorizar las llamadas síncronas de `setState` dentro de `useEffect` en `WelcomeScreen.tsx`, `ClaimInviteView.tsx`, `ThemeContext.tsx`, `ThemeSelector.tsx` y `AuthModal.tsx` derivando estados o disparando las actualizaciones desde los manejadores de eventos.
   - Extraer `useFamily` a un archivo independiente `useFamily.ts` para cumplir con las directivas de Fast Refresh de React.
7. **Cola Transaccional de Salida (Offline Outbox):**
   - Añadir una cola en IndexedDB para encolar mutaciones cuando el dispositivo pierda la conexión a internet y sincronizarlas automáticamente al recuperar la señal.

---
*Informe emitido en conformidad con los estándares de arquitectura y auditoría de software de MELOMUS.*
