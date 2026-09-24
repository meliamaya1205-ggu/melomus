# Informe de Preparación para Producción: "Nuestro Hogar" 🚀⚖️

**Fecha de Evaluación:** 23 de Septiembre de 2026  
**Veredicto Oficial:**  
- ✅ **LISTO PARA PRUEBA PERSONAL Y FAMILIAR (30 días de uso intensivo)**  
- ⛔ **NO LISTO PARA VENTA COMERCIAL / SUSCRIPCIONES (Requiere Fase Cloud)**

---

## 1. Separación Clara: Uso Personal vs. Venta Comercial

> [!CAUTION]
> **Advertencia de Responsabilidad de Producto:**  
> Pasar los tests locales o tener un `npm run build` sin errores es solo el primer escalón de desarrollo frontend. **Bajo ninguna circunstancia se debe comercializar la aplicación en su estado actual de almacenamiento local**, ya que dos padres en teléfonos diferentes no compartirían datos automáticamente y un usuario que borre los datos de navegación perdería su información familiar.

| Criterio | Estado Actual (Uso Familiar / Personal) | Requisito Mandatorio para Comercialización en Chile |
| :--- | :--- | :--- |
| **Persistencia** | `localStorage` del navegador | Base de Datos Relacional PostgreSQL en Nube (Supabase) |
| **Sincronización** | En un solo dispositivo o manual vía backup JSON | En tiempo real por WebSockets (Postgres Realtime / Channels) |
| **Cuentas y Login** | Selector libre de perfiles de la casa | Autenticación real (Email/Password, Magic Link, Google Auth) |
| **Seguridad de Datos** | Filtro lógico en frontend (React) | Row Level Security (RLS) en backend validando `family_id` |
| **Pagos y Activación** | Ninguno (no se requiere para uso propio) | 100% Externo (la app se entrega funcional tras pago externo; sin pasarelas ni suscripciones in-app) |
| **Distribución** | PWA instalable desde navegador | PWA verificada + APK/AAB (Google Play) e IPA (App Store) |
| **Soporte y Backup** | Exportar archivo JSON manual | Respaldos automáticos en la nube cada 24 horas y failover |

---

## 2. Lo que SÍ Está Listo para la Prueba de 30 Días con tu Familia

La aplicación está completamente madura para ser usada por ti y tu familia en el hogar:

1. **Arquitectura Funcional Completa:**
   - Finanzas familiares en pesos chilenos (CLP) con presupuestos, gastos compartidos y cuentas personales por adulto.
   - Calendario con eventos, integración a Google Calendar y descarga `.ics`.
   - Hábitos bajo la filosofía *"Lo mío + lo nuestro"*, con aislamiento de adultos, hábitos compartidos y misiones infantiles con puntos.
   - Salud preventiva con registro de tomas de medicamentos, vacunas y fichas médicas.
   - Pareja y Cuqui Time con privacidad garantizada.
   - Tareas y deberes domésticos asignables.
   - Reset familiar con temporizador sonoro de 10 minutos.
   - PWA instalable con Service Worker y soporte offline para navegación.
2. **Experiencia Móvil Pulida:**
   - Probada físicamente en teléfonos Android.
   - Respeto por safe areas (sin solapamiento de navegación ni notch).
   - Drawers laterales y menús inferiores con jerarquía de z-index probada.
3. **Respaldo y Seguridad de Datos en Fase Local:**
   - La opción de **"Exportar Copia de Seguridad JSON"** en Configuración permite guardar un snapshot completo del hogar en el computador o drive en cualquier momento.

---

## 3. Hoja de Ruta Obligatoria Hacia la Venta Comercial en Chile

Para llevar "Nuestro Hogar" desde el uso familiar hasta la primera venta a familias chilenas, se debe completar la siguiente secuencia técnica:

```
[ AHORA ]
Prueba familiar 30 días (MVP Local PWA)
         ↓
[ FASE A: INFRAESTRUCTURA CLOUD ]
Conexión de Supabase (Tablas, RLS, Auth)
         ↓
[ FASE B: MULTI-DISPOSITIVO ]
Sincronización en tiempo real Mamá ↔ Papá
         ↓
[ FASE C: BETA PRIVADA ]
5 a 10 familias chilenas de prueba
         ↓
[ FASE D: LANZAMIENTO PWA CHILE ]
Comercialización inicial Web / PWA (Pago externo, app desbloqueada)
         ↓
[ FASE E: APP STORES ]
Capacitor / Google Play & App Store
```

### 3.1 Esquema de Base de Datos para Supabase (Fase A)
El contrato de datos ya implementado en `src/services/dataAdapter.ts` (`IDataService`) está diseñado para sustituir `LocalStorageDataService` por `SupabaseDataService` sin modificar los componentes de React:

- `families`: `id`, `name`, `created_at`, `plan_type`
- `family_members`: `id`, `family_id`, `name`, `role` (ADULT / CHILD), `relationship` (mama / papa / hijo), `avatar_emoji`, `avatar_color`, `points`
- `tasks`: `id`, `family_id`, `title`, `responsible_id`, `category`, `status`, `due_date`
- `habits`: `id`, `family_id`, `title`, `type`, `category`, `member_id`, `is_private`, `completed_dates`
- `health_medications`: `id`, `family_id`, `member_id`, `name`, `dose`, `schedules`
- `health_appointments`: `id`, `family_id`, `member_id`, `professional`, `date`, `time`
- `finance_transactions`: `id`, `family_id`, `scope` (family / personal), `member_id`, `amount`, `category`
- `couple_entries`: `id`, `family_id`, `type`, `is_private`, `created_at`

### 3.2 Reglas de Seguridad (RLS - Row Level Security)
Cada consulta de la base de datos debe ser verificada a nivel de base de datos Postgres:
```sql
CREATE POLICY "Familiares solo acceden a datos de su propio family_id"
ON tasks FOR ALL
USING (auth.jwt() ->> 'family_id' = family_id);

CREATE POLICY "Niños no pueden leer registros financieros ni de pareja"
ON finance_transactions FOR SELECT
USING (auth.jwt() ->> 'family_id' = family_id AND auth.jwt() ->> 'role' = 'FAMILY_ADULT');
```

---

## 4. Conclusión

- **¿Puedes empezar a usar la aplicación hoy con tu familia?**  
  **SÍ, rotundo.** La experiencia es estable, amigable, responsive y completa.
- **¿Se debe empezar a cobrar o vender suscripciones ahora?**  
  **NO todavía.** Primero se debe cumplir el período de 30 días de prueba en el hogar, consolidar la retroalimentación real, y luego conectar Supabase para habilitar la sincronización entre teléfonos independientes y la pasarela de pagos.
