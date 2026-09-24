# ✅ PRODUCTION CHECKLIST: NUESTRO HOGAR
## Lista de Comprobación Obligatoria: Coadministración Paritaria y Seguridad Familiar

> **Instrucciones:** Esta lista contiene los controles de seguridad, arquitectura y privacidad que deben estar **100% verificados y aprobados** antes de permitir que familias reales ingresen datos bancarios, diagnósticos médicos confidenciales o información íntima en "Nuestro Hogar".

---

## 1. 👥 Coadministración Paritaria de Adultos Principales (Mamá y Papá)

- [ ] **Igualdad Jerárquica Total:** Mamá y Papá están registrados como `FAMILY_ADULT` (`ADULT_PRIMARY`) de la misma familia, con idéntico nivel de privilegios sobre la administración del hogar.
- [ ] **Sin Roles de Invitado:** Se confirma la inexistencia de roles tipo `GUEST`, `SPOUSE_GUEST`, `INVITED_SPOUSE` u `OWNER_ONLY`.
- [ ] **Cuentas y Credenciales Independientes:**
  - [ ] Mamá tiene su propia cuenta `User` con su correo electrónico personal y contraseña segura.
  - [ ] Papá tiene su propia cuenta `User` con su correo electrónico personal y contraseña segura.
  - [ ] Ambos comparten el mismo `family_id` en base de datos.
- [ ] **Flujo de Creación Conjunta:** La experiencia de bienvenida solicita los datos de Mamá, Papá y los hijos desde el primer paso.
- [ ] **Vinculación Conyugal Respetuosa:**
  - [ ] El proceso para el segundo dispositivo utiliza la terminología oficial: *"Vincular adulto principal"* o *"Configurar cuenta del otro adulto"*.
  - [ ] Se prohíbe explícitamente en la interfaz cualquier texto de *"invitar cónyuge"*, *"invitado"* o *"guest"*.
  - [ ] El token de vinculación conyugal (`co_admin_linking_token`) es de un solo uso, expira en 48 horas y se invalida automáticamente tras vincularse el segundo adulto.

---

## 2. 🔑 Autenticación y Manejo Seguro de Sesiones

- [ ] **Hashing Criptográfico de Contraseñas:** Las contraseñas se hashean en backend usando **Argon2id** o **bcrypt** (factor de costo $\ge 12$). Nunca se almacenan ni registran contraseñas en texto claro.
- [ ] **Manejo Seguro de Sesiones:**
  - [ ] Las sesiones se emiten exclusivamente mediante cookies `HttpOnly`, `Secure`, `SameSite=Lax`.
  - [ ] Ningún token de sesión o JWT confidencial es legible desde JavaScript (`document.cookie` / `localStorage`).
  - [ ] Las sesiones se invalidan en el servidor (Redis) ante logout explícito o cambio de credenciales.
- [ ] **Protección contra Fuerza Bruta:** Rate limiting activo en endpoints de autenticación y vinculación (máximo 5 intentos por IP cada 15 minutos).
- [ ] **Flujo de Recuperación de Cuenta:** Tokens de restablecimiento de contraseña de un solo uso con caducidad no mayor a 15 minutos y notificación por correo.
- [ ] **PIN de Acceso Doméstico Rápido (Opcional):** Si se utiliza PIN para cambio rápido de perfil en tablet compartida, se valida en backend con bloqueo automático tras 5 intentos fallidos.

---

## 3. 🛡️ Control de Acceso y Aislamiento Familiar (Multi-Tenancy)

- [ ] **Validación Estricta de `familyId`:** Cada consulta SQL a recursos familiares (`tasks`, `calendar`, `health`, etc.) incluye `WHERE family_id = :current_family_id` verificado desde la sesión del servidor.
- [ ] **Row-Level Security (RLS) en Base de Datos:** Políticas RLS activas en PostgreSQL para impedir filtraciones accidentales entre familias incluso si un desarrollador olvida una cláusula `WHERE`.
- [ ] **Verificación de Perfil Infantil:** Las peticiones originadas desde perfiles infantiles son rechazadas con `403 Forbidden` en cualquier endpoint administrativo, financiero, médico o de pareja.

---

## 4. 👤 Aislamiento de Privacidad Personal del Adulto ("Mi Organización")

- [ ] **Titularidad en Backend (`ownerId`):** Los registros de finanzas personales, check-ins privados y borradores conyugales exigen `owner_id === req.user.id`.
- [ ] **Inmunidad ante Manipulación de IDs:** Un adulto no puede visualizar ni modificar los registros personales de su cónyuge alterando parámetros de URL o IDs JSON en la petición.
- [ ] **Filtrado en Respuestas API:** Los endpoints de finanzas familiares jamás retornan registros con `scope = 'personal'` que no pertenezcan al usuario autenticado.

---

## 5. 💕 Módulo Pareja y Protección de "Cuqui Time"

- [ ] **Exclusividad para los Dos Adultos Principales:** Middleware de servidor que valida `role === 'FAMILY_ADULT'` antes de responder a cualquier ruta `/api/v1/couple/*`.
- [ ] **Aislamiento Total de Cuqui Time:**
  - [ ] No existe ninguna ruta pública o compartida que exponga sesiones íntimas.
  - [ ] Los niños no tienen acceso ni visual ni por API a Cuqui Time.
  - [ ] No se sincroniza con calendarios generales ni notificaciones del hogar.
- [ ] **Cifrado de Notas Íntimas:** Las notas privadas y preparativos de intimidad se cifran en reposo con AES-256-GCM antes de persistirse.
- [ ] **Check-ins y Conversaciones Privadas:**
  - [ ] Los check-ins marcados con `isPrivate = true` solo se retornan al adulto que los redactó.
  - [ ] Las conversaciones marcadas como borrador privado solo son visibles para su creador hasta que decida compartirlas.

---

## 6. 🏥 Módulo Salud y Medicamentos

- [ ] **Bloqueo a Perfiles Infantiles:** Los niños no pueden ver citas médicas de adultos, recetas de medicamentos ni historiales de consultas pediátricas.
- [ ] **Prohibición de Modificación Infantil:** La API rechaza cualquier intento de crear, pausar, finalizar o editar medicamentos si no proviene de un adulto verificado.
- [ ] **Auditoría de Administración:** Toda dosis registrada almacena `recorded_by_user_id` y timestamp del servidor.
- [ ] **Ausencia de Cálculos Médicos:** Se verifica que el sistema no realice sugerencias ni recálculos automáticos de dosificación farmacéutica.

---

## 7. 💰 Módulo Finanzas

- [ ] **Separación Arquitectónica Real:**
  - [ ] `Nuestro Dinero`: Accesible y gestionable por ambos adultos principales de la familia.
  - [ ] `Mi Organización`: Accesible única y exclusivamente para el adulto dueño de la cuenta.
- [ ] **Cero Visibilidad Infantil:** Bloqueo absoluto de todos los datos financieros frente a perfiles infantiles.
- [ ] **Protección de Datos Bancarios:** La aplicación no almacena números completos de tarjeta de crédito (PAN) ni códigos CVV en ninguna tabla.

---

## 8. 🔒 Seguridad de Red, Infraestructura y Criptografía

- [ ] **HTTPS Forzado:** Certificado TLS válido con soporte exclusivo de **TLS 1.3** y **TLS 1.2 fuerte**.
- [ ] **HSTS Activado:** Cabecera `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`.
- [ ] **Content Security Policy (CSP):** Cabeceras restrictivas que bloqueen scripts no autorizados y fuentes externas desconocidas.
- [ ] **Cabeceras de Endurecimiento:**
  - [ ] `X-Frame-Options: DENY` (anti-clickjacking).
  - [ ] `X-Content-Type-Options: nosniff`.
  - [ ] `Referrer-Policy: strict-origin-when-cross-origin`.
- [ ] **Prevención de Inyección SQL:** Todas las consultas a la base de datos utilizan sentencias parametrizadas / ORM tipado (Prisma / Drizzle).
- [ ] **Sanitización de Entradas:** Validación estricta con esquemas Zod en todas las rutas del backend.

---

## 9. 📦 Estrategia de Migración y Datos Demo

- [ ] **Respaldo Local Pre-Migración:** Se genera una copia inmutable en localStorage (`nuestro_hogar_backup_pre_migration`) antes de subir datos a la nube.
- [ ] **Transacción Atómica:** La importación inicial hacia PostgreSQL se ejecuta dentro de un bloque `BEGIN ... COMMIT` con `ROLLBACK` ante cualquier error.
- [ ] **Separación Clara Demo vs. Real:**
  - [ ] Posibilidad de limpiar datos demo con un solo clic sin afectar cuentas en la nube.
  - [ ] Ningún dato personal real mezclado en los scripts de siembra (`seedData.ts`).

---

## 10. ⚖️ Cumplimiento Legal y Privacidad del Hogar

- [ ] **Política de Privacidad Transparente:** Explicación clara a los padres sobre el tratamiento y almacenamiento de los datos de sus hijos menores.
- [ ] **Mecanismo de "Derecho al Olvido":** Funcionalidad operativa de eliminación completa de la familia y todos sus datos asociados con confirmación por correo de ambos adultos principales.
- [ ] **Registro de Logs Seguro:** Los logs del servidor (Winston / Pino) registran eventos operativos sin volcar contraseñas, notas privadas ni datos médicos en texto plano.
