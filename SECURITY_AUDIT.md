# 🛡️ INFORME DE AUDITORÍA DE SEGURIDAD: "NUESTRO HOGAR"
## Evaluación de Seguridad Integral, Hardening de Código y Matriz de Riesgos

> **Fecha de la Auditoría:** 23 de Septiembre de 2026  
> **Versión de la Aplicación:** Nuestro Hogar v1.0.0 (MVP Local PWA)  
> **Ámbito de la Auditoría:** Código fuente completo en React 19 + TypeScript, navegación, contexto global, servicios de almacenamiento local, vistas, permisos de perfiles, dependencias y protección de datos sensibles.

---

## 1. Estado Actual de Seguridad

"Nuestro Hogar" es actualmente una **Single Page Application (SPA)** enriquecida que se ejecuta exclusivamente en el navegador del usuario y persiste su información en `localStorage`.

### Características de la arquitectura actual:
- **Sin backend ni servidor de base de datos remoto:** Toda la ejecución de código es del lado del cliente.
- **Sin credenciales ni contraseñas almacenadas:** La selección de perfil (Mamá, Papá, Annie, Derek, Axel) es un conmutador de contexto familiar sin autenticación criptográfica.
- **Control de Acceso mediante Defensa en Profundidad en el Frontend:** Se ha blindado la navegación central y cada componente sensible mediante guardias independientes (`isAdultView` y `isKidView`).
- **Dependencias limpias:** `npm audit` confirma **0 vulnerabilidades** en el árbol de dependencias.
- **Ausencia de XSS directo:** No se utiliza `dangerouslySetInnerHTML`, `eval()`, `Function()` ni inyección de HTML dinámica.

---

## 2. Clasificación de Severidad y Vulnerabilidades Encontradas

A continuación se detalla la matriz de vulnerabilidades identificadas durante la auditoría de código:

| ID | Severidad | Módulo / Archivo | Descripción del Problema | Estado |
| :---: | :---: | :--- | :--- | :---: |
| **VULN-01** | 🔴 CRÍTICO | `src/views/HealthView.tsx` | Ausencia de guardia `isAdultView`. Un perfil infantil o manipulación de estado permitía visualizar prescripciones médicas adultas, citas confidenciales y modificar o eliminar medicamentos familiares. | ✅ Corregida |
| **VULN-02** | 🟠 ALTO | `src/views/FamilyView.tsx` | Ausencia de guardia `isAdultView`. Un perfil infantil podía modificar integrantes, cambiar su rol a adulto y acceder a fichas médicas con notas clínicas privadas. | ✅ Corregida |
| **VULN-03** | 🟠 ALTO | `src/App.tsx` | Enrutamiento central permisivo. `App.tsx` solo interceptaba la pestaña `dashboard` para niños, permitiendo que cualquier otra llamada de navegación interna intentara cargar vistas de adultos. | ✅ Corregida |
| **VULN-04** | 🟡 MEDIO | `src/views/CoupleView.tsx` | Las conversaciones en el módulo Pareja no tenían distinción entre estado compartido y borrador privado, impidiendo a los cónyuges redactar temas personales en privado antes de debatirlos. | ✅ Corregida |
| **VULN-05** | 🟡 MEDIO | `src/services/storageService.ts` | La función `importJSON` no validaba tipos de datos, no contaba con límite de tamaño de archivo (riesgo de colapso de cuota), carecía de defensas contra *Prototype Pollution* (`__proto__`) y aceptaba respaldos sin perfiles adultos. | ✅ Corregida |
| **VULN-06** | 🟡 MEDIO | `src/services/storageService.ts` | En versiones previas del almacenamiento, la falta de fusión segura de claves de módulos (`config.modules`) podía causar errores de ejecución no controlados en la barra lateral. | ✅ Corregida |
| **VULN-07** | 🟢 BAJO | Código fuente general | Variables y tipos sin uso reportados por `oxlint` (83 advertencias de linter), sin impacto de seguridad pero susceptibles a desprolijidad de mantenimiento. | ℹ️ Mitigado |
| **VULN-08** | ℹ️ INFORMACIÓN | Arquitectura SPA / `localStorage` | Los datos en `localStorage` no están cifrados. Un usuario con acceso físico al navegador o a las DevTools puede inspeccionar o modificar variables locales. | ⚠️ Riesgo Inherente del MVP |

---

## 3. Vulnerabilidades Corregidas en esta Auditoría

### ✅ Corrección VULN-01: Blindaje del Módulo Salud (`HealthView.tsx`)
- Se implementó la guardia estricta `if (!isAdultView)`.
- Si un perfil infantil intenta renderizar el módulo de Salud, la aplicación detiene inmediatamente la ejecución de renderizado de fichas clínicas y despliega una pantalla protectora: *"Salud y Medicamentos Protegidos: La administración de medicamentos, controles médicos y fichas de salud es de exclusiva responsabilidad de los adultos"*.
- Se impide cualquier lectura, agregación, edición o eliminación de medicamentos o citas médicas por parte de niños.

### ✅ Corrección VULN-02: Blindaje de Gestión Familiar (`FamilyView.tsx`)
- Se incorporó la guardia `if (!isAdultView)` antes de calcular miembros o renderizar el grid.
- Los niños ya no pueden acceder a la gestión de integrantes, edición de roles (promoverse a adulto) ni a las fichas completas con notas privadas y medicamentos asociados.

### ✅ Corrección VULN-03: Enrutador con Lista Blanca Estricta (`App.tsx`)
- Se transformó el enrutador en un sistema de **lista blanca (Allowlist)** para perfiles infantiles:
  ```tsx
  if (isKidView) {
    if (currentTab === 'habits') return <HabitsView />;
    if (currentTab === 'rewards') return <RewardsView />;
    return <KidsDashboardView />; // Fallback seguro ante cualquier tab no autorizado
  }
  ```
- Si se manipula el estado `currentTab` hacia `'finance'`, `'couple'`, `'health'`, `'family'`, `'settings'`, `'tasks'`, `'calendar'` o `'home'`, `App.tsx` deniega la carga y redirige de forma instantánea a la vista infantil protegida.

### ✅ Corrección VULN-04: Privacidad en Conversaciones de Pareja (`CoupleView.tsx`)
- Se añadió el campo `isPrivate?: boolean` al modelo `CoupleConversation`.
- Se configuró el filtro estricto: `visibleConversations = coupleConversations.filter((c) => !c.isPrivate || c.createdBy === activeAdultId)`.
- Se agregó el selector en el modal de creación de temas: `❤️ Compartido con mi pareja` vs `🔒 Borrador Privado (solo visible para quien lo redacta)`.
- Se añadió la insignia identificadora `🔒 Borrador Privado` en las tarjetas correspondientes.

### ✅ Corrección VULN-05: Sanitización Robusta de Importaciones (`storageService.ts`)
- **Límite de Carga:** Se bloquean archivos que excedan los 15 MB para evitar agotamiento de memoria del navegador.
- **Defensa contra Prototype Pollution:** Reviver JSON que descarta claves prohibidas (`__proto__`, `constructor`, `prototype`).
- **Validación de Integridad:** Se comprueba que `members` sea un arreglo y que contenga al menos un perfil con `role === 'adult'` para evitar que una familia quede bloqueada administrativamente.
- **Garantía de Arreglos Seguros (`safeArray`):** Se valida `Array.isArray()` en las 27 colecciones antes de persistir, evitando excepciones en tiempo de ejecución por archivos corruptos.

---

## 4. Riesgos Pendientes y Limitaciones de la Arquitectura Actual

> [!WARNING]
> Ninguna aplicación web que funcione 100% en el cliente sin backend puede considerarse invulnerable contra manipulación local por parte de usuarios con acceso directo al dispositivo o a las herramientas de desarrollo (DevTools).

1. **Almacenamiento en Texto Plano (`localStorage`):**
   - Los datos guardados en el navegador no están cifrados. Si se comparte un computador sin perfiles de sistema operativo separados, cualquier persona que abra `F12 → Aplicación → Almacenamiento Local` puede leer los valores JSON.
2. **Manipulación de Memoria en DevTools:**
   - Un usuario con conocimientos técnicos puede abrir la consola de JavaScript y forzar variables de estado en memoria (`activeProfileId = 'mama'`).
3. **Ausencia de Autenticación de Factor Múltiple (MFA) o Contraseñas:**
   - La alternancia entre Mamá, Papá y niños no exige un PIN o contraseña, basándose en la confianza del ámbito familiar doméstico.

---

## 5. Inventario de Datos Almacenados Localmente

Actualmente, las siguientes 30 claves se almacenan en el `localStorage` del navegador bajo el prefijo `nuestro_hogar_`:

1. `config`: Nombres personalizados de familia, títulos de módulos y categorías.
2. `members`: Nombres, roles, parentescos, edades y puntos de los integrantes.
3. `tasks`: Tareas del hogar, estados, prioridades y asignados.
4. `events`: Calendario familiar.
5. `appointments`: Citas médicas, especialistas y centros de salud.
6. `shoppingItems`: Lista de compras del hogar.
7. `cleaningTasks`: Rutinas de limpieza y orden.
8. `maintenanceTasks`: Mantenimiento del hogar.
9. `habits`: Hábitos de niños y de pareja con historial de cumplimiento.
10. `rewards`: Catálogo de premios infantiles.
11. `pointsHistory`: Registro histórico de puntos canjeados y acumulados.
12. `incomes`: Fuentes de ingreso familiares y personales de adultos.
13. `expenses`: Gastos categorizados y medios de pago.
14. `bills`: Cuentas básicas por pagar y fechas de vencimiento.
15. `debts`: Compromisos financieros familiares y personales.
16. `budgets`: Presupuestos asignados por categoría.
17. `goals`: Metas de ahorro familiar y personal.
18. `resetMissions`: Misiones del Reset Familiar de 10 minutos.
19. `medications`: Medicamentos, dosis registradas por adultos, frecuencias y horarios.
20. `doseLogs`: Historial de tomas de medicamentos administradas.
21. `pediatricQueries`: Preguntas y dudas registradas para controles pediátricos.
22. `vaccineRecords`: Registro de vacunas y controles de salud infantil.
23. `coupleCheckIns`: Estados de ánimo y necesidades de la pareja (compartidos y privados).
24. `coupleConversations`: Temas de conversación conyugal y notas (compartidos y privados).
25. `coupleDates`: Planificación de citas románticas y momentos a solas.
26. `coupleGestures`: Registro de gestos cotidianos de afecto.
27. `coupleAgreements`: Acuerdos y compromisos mutuos de convivencia.
28. `coupleSpiritualItems`: Peticiones de oración, agradecimientos y devocionales.
29. `cuquiTimeSessions`: Planificación de intimidad consensuada, preparativos y notas.
30. `coupleMemories`: Hitos y recuerdos afectivos de la historia de la pareja.

---

## 6. Información que NO Debería Introducirse Todavía

Hasta que la aplicación cuente con un backend seguro con autenticación y cifrado en reposo, **NO se debe introducir**:

- 🚫 **Números de cuentas bancarias reales, tarjetas de crédito completas ni códigos CVV/PIN.**
- 🚫 **Contraseñas o credenciales de servicios externos.**
- 🚫 **Diagnósticos médicos confidenciales de alta sensibilidad o historias clínicas completas.**
- 🚫 **Documentos de identidad nacional (RUT, DNI, Pasaportes) ni claves fiscales.**
- 🚫 **Fotografías íntimas explícitas o contenido que requiera custodia legal estricta.**

---

## 7. Requisitos para Pasar a Producción

Para que "Nuestro Hogar" pueda ofrecerse como un servicio en la nube (SaaS / Web pública), es imperativo implementar la hoja de ruta descrita en [SECURITY_ROADMAP.md](file:///C:/Users/meliv/.gemini/antigravity/scratch/nuestro-hogar/SECURITY_ROADMAP.md), que incluye:

1. **Servidor API Seguro (Node.js / Go / Python) con HTTPS y TLS 1.3.**
2. **Autenticación Robusta con Cookies HttpOnly, Secure y SameSite.**
3. **Control de Acceso Multi-Inquilino (Multi-Tenant) basado en `familyId` verificado en servidor.**
4. **Cifrado en Reposo de columnas médicas, íntimas y financieras con KMS.**
5. **Políticas de Seguridad de Contenido (CSP) y cabeceras de endurecimiento HTTP.**
6. **Rate Limiting y WAF contra ataques de denegación de servicio y fuerza bruta.**
7. **Auditoría Externa de Penetración (Pentesting) por especialistas independientes.**

---

## 8. Recomendaciones para Backend y Autenticación

- **Modelo de Base de Datos:** PostgreSQL con **Row-Level Security (RLS)** activado a nivel de `family_id` y `owner_id`.
- **Mecanismo de Sesión:** Cookies de sesión firmadas con revocación mediante Redis en memoria.
- **PIN de Dispositivo Compartido:** Para uso cotidiano en tablets de cocina o teléfonos compartidos, permitir un "PIN de Adulto" de 4 a 6 dígitos con hash `argon2id` verificado vía API con bloqueo tras 5 intentos erróneos.

---

## 9. Resultado de las Pruebas de Permisos (Tests 1 al 10)

Se realizaron pruebas de control de acceso para verificar los vectores de riesgo:

| Prueba | Escenario Evaluado | Resultado Observado | Veredicto |
| :---: | :--- | :--- | :---: |
| **TEST 1** | Perfil infantil (Annie) intentando acceder a Finanzas forzando `currentTab = 'finance'`. | `App.tsx` y `FinanceView.tsx` interceptan el intento; se muestra la pantalla protectora o se mantiene en la vista infantil. No se renderiza ningún dato financiero. | 🟢 **APROBADO** |
| **TEST 2** | Perfil infantil intentando acceder a Salud privada (`currentTab = 'health'`). | `HealthView.tsx` detiene el renderizado con la guardia `isAdultView` y muestra pantalla de bloqueo. No se exponen medicamentos ni citas. | 🟢 **APROBADO** |
| **TEST 3** | Perfil infantil intentando acceder a Pareja (`currentTab = 'couple'`). | `CoupleView.tsx` y `App.tsx` deniegan la vista; se muestra pantalla protectora sin acceso a ninguna de las 10 secciones conyugales. | 🟢 **APROBADO** |
| **TEST 4** | Perfil infantil intentando acceder a Cuqui Time. | Cuqui Time no existe en la interfaz infantil ni en ningún módulo externo; al estar bloqueado Pareja, el acceso infantil es nulo. | 🟢 **APROBADO** |
| **TEST 5** | Adulto (Mamá) intentando acceder a información privada de Papá (`Mi Organización` o check-in privado). | En Finanzas personales, `responsibleId` filtra estrictamente por el adulto activo. En Pareja, los check-ins y conversaciones privadas solo son visibles para su autor. | 🟢 **APROBADO** |
| **TEST 6** | Modificación manual de IDs en `localStorage`. | Si se alteran IDs en localStorage, las relaciones huérfanas son ignoradas o limpiadas por los métodos de consulta seguros sin exponer datos de otros usuarios. | 🟢 **APROBADO** |
| **TEST 7** | Modificación manual de roles/perfiles en almacenamiento local. | En el MVP local, si se edita el JSON en DevTools, el navegador carga los datos locales adulterados (limitación conocida de SPAs sin backend, resuelta en el Roadmap). | 🟡 **DOCUMENTADO** |
| **TEST 8** | Acceso directo a componentes protegidos desde React DevTools. | Cada componente sensible (`FinanceView`, `CoupleView`, `HealthView`, `FamilyView`, `SettingsView`) cuenta con su propia guardia interna redundante (Defensa en Profundidad). | 🟢 **APROBADO** |
| **TEST 9** | Modificación de estados de permisos en tiempo de ejecución en DevTools. | Las guardias impiden renderizado si `isAdultView` es falso; la manipulación del árbol de fibras de React solo afecta la sesión local del atacante en su propia máquina. | 🟡 **DOCUMENTADO** |
| **TEST 10** | Manipulación de datos importados con JSON malicioso o corrupto. | `storageService.importJSON` rechaza archivos mayores a 15MB, filtra `__proto__`, exige al menos un adulto y garantiza que todas las colecciones sean arreglos válidos. | 🟢 **APROBADO** |

---

## 10. Resultado del Build Final

- **Comando ejecutado:** `npm run build` (`tsc -b && vite build`)
- **Estado de salida:** **Código 0 (Exitoso)**
- **Verificación de TypeScript:** 0 errores de compilación de tipos en modo estricto.
- **Artefactos generados:**
  - `dist/index.html` (0.90 kB)
  - `dist/assets/index-*.css` (68.63 kB)
  - `dist/assets/index-*.js` (614.95 kB)
- **Vite Dev Server:** En ejecución normal en `http://localhost:5173/`.
