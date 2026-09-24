# Checklist de Pruebas Funcionales: "Nuestro Hogar" 🏡✅

Esta lista de verificación está diseñada para realizar la **validación operativa diaria durante el período de prueba de 30 días** con tu familia antes de avanzar a la beta cerrada.

---

## 1. Inicio / Dashboard
- [ ] **Carga Inicial:** La aplicación carga fluidamente sin pantallas en blanco ni destellos erráticos de estilos.
- [ ] **Hero Saludo:** Muestra la fecha del día correcta en español chileno, el nombre de la familia y la frase motivacional.
- [ ] **Métricas Rápidas:** Los contadores de tareas del día, eventos próximos y compras pendientes coinciden con la realidad.
- [ ] **Bloque "Necesita tu Atención":** Se activa automáticamente ante tareas vencidas o tomas urgentes de medicamentos.
- [ ] **Widget de Hábitos:**
  - [ ] Permite alternar entre pestañas *Mis Hábitos*, *Familia* y *Niños*.
  - [ ] Permite marcar un hábito como completado hoy con un solo toque y actualiza el contador.
- [ ] **Lista de Tareas:** Muestra las tareas programadas para hoy y permite marcarlas como completadas.
- [ ] **Resumen Financiero:** Solo aparece cuando el perfil activo es un adulto (Mamá o Papá). Permanece invisible para perfiles infantiles.

---

## 2. Selector de Perfiles & Paridad de Coadministración
- [ ] **Cambio de Perfil a Mamá:**
  - [ ] La interfaz se adapta al tema y color personal de Mamá.
  - [ ] Acceso completo a Finanzas, Pareja, Salud, Configuración y Hábitos personales de Mamá.
- [ ] **Cambio de Perfil a Papá:**
  - [ ] La interfaz se adapta al tema y color personal de Papá.
  - [ ] Hábitos personales muestran exclusivamente los de Papá (sin mezclar con Mamá).
  - [ ] "Mi Organización" en Finanzas muestra las cuentas personales de Papá.
- [ ] **Cambio de Perfil a un Niño (Annie / Derek):**
  - [ ] La vista conmuta automáticamente al entorno visual infantil (*KidsDashboardView*).
  - [ ] Saldo de puntos y catálogo de recompensas visibles.
  - [ ] Intentos de acceder a `/finance`, `/couple`, `/health` o `/settings` son redirigidos de inmediato a la vista de niños.

---

## 3. Hábitos "Lo Mío + Lo Nuestro"
- [ ] **Pestaña TODOS:**
  - [ ] Lista ordenada de hábitos del hogar.
  - [ ] Hábitos marcados como privados por un adulto no son visibles si el otro adulto está conectado.
- [ ] **Pestaña MÍOS:**
  - [ ] Exclusivo para el usuario activo (aislamiento total Mamá vs. Papá).
- [ ] **Pestaña FAMILIA:**
  - [ ] Hábitos compartidos de convivencia (cenas sin pantallas, reset express, gratitud).
- [ ] **Pestaña NIÑOS:**
  - [ ] Selector entre Annie y Derek con sus puntos acumulados.
  - [ ] Rutinas agrupadas por momentos del día (Mañana, Llegada a Casa, Noche, Misiones).
  - [ ] Completar una misión de un niño suma puntos a su alcancía; completar un hábito de un adulto no altera la alcancía.
- [ ] **Acciones de Gestión:**
  - [ ] Crear un nuevo hábito con categoría, frecuencia y recordatorio.
  - [ ] Pausar un hábito (muestra insignia "En pausa" y opacidad reducida).
  - [ ] Reanudar un hábito pausado.
  - [ ] Editar título y parámetros.
  - [ ] Eliminar hábito con confirmación.
  - [ ] Racha actual (`🔥 X días`) y matriz semanal de 7 días (L M X J V S D) se actualizan correctamente.

---

## 4. Tareas y Deberes
- [ ] **Creación:** Permite crear tarea asignada a Mamá, Papá, Ambos o un hijo.
- [ ] **Prioridades:** Insignias visuales de prioridad alta (rojo), media (ámbar) y baja (verde).
- [ ] **Completado:** Checkbox tacha la tarea y la envía a la sección de completadas.
- [ ] **Filtros:** Búsqueda por texto y filtro por categoría y por integrante.

---

## 5. Calendario Familiar & Google Calendar
- [ ] **Navegación:** Cambio fluido entre vista de Mes, Semana y Día.
- [ ] **Creación de Evento:** Formulario con fecha, hora inicio/fin, ubicación y miembro responsable.
- [ ] **Google Calendar:**
  - [ ] Clic en el icono de exportar abre la plantilla oficial de Google Calendar en una pestaña nueva con el título, fecha y hora pre-llenados.
- [ ] **iCalendar (.ics):**
  - [ ] Clic en descargar genera y guarda el archivo `.ics` estándar en el teléfono o computador.

---

## 6. Salud y Medicamentos
- [ ] **Aviso Médico:** Cartel visible advirtiendo que la app es un registro informativo y no formula recomendaciones médicas.
- [ ] **Medicamentos:**
  - [ ] Registro de medicamento con dosis, vía (gotas, ml, comprimidos), frecuencia y horarios.
  - [ ] Marcado de dosis administrada en el día de hoy con registro de hora.
- [ ] **Citas Médicas:** Agendar control médico con profesional, lugar y fecha.
- [ ] **Vacunas:** Visualización del plan de vacunación infantil y marcado de dosis recibidas.
- [ ] **Fichas Médicas:** Grupo sanguíneo, alergias y contactos de emergencia por integrante.

---

## 7. Pareja & Cuqui Time
- [ ] **Privacidad Adulta:** Totalmente inaccesible desde perfiles infantiles.
- [ ] **Check-in Emocional:** Registro de estado de ánimo y necesidad afectiva del día.
- [ ] **Tiempo Juntos:** Explorador de ideas de citas filtradas por duración (15m, 30m, 1h, cita larga).
- [ ] **Cuqui Time:**
  - [ ] Permanece como subsección dentro de Pareja.
  - [ ] Botón de privacidad ("Ocultar detalles") difumina o protege la pantalla de miradas indiscretas.

---

## 8. Finanzas Familiares
- [ ] **Moneda:** Todos los montos se despliegan en Pesos Chilenos (CLP: `$400.000`).
- [ ] **Ámbitos:**
  - [ ] Pestaña *Nuestro Dinero*: Gastos compartidos de la casa.
  - [ ] Pestaña *Mi Organización*: Cuentas personales del adulto activo.
- [ ] **Cuentas por Pagar:** Registro de facturas con fecha de vencimiento y alerta de pendientes.
- [ ] **Metas de Ahorro:** Barra de progreso y posibilidad de registrar abonos hacia la meta familiar.

---

## 9. Reset Familiar de 10 Minutos
- [ ] **Modal de Reset:** Se abre desde el Navbar, Sidebar o botón flotante.
- [ ] **Temporizador:** Cuenta regresiva de 10:00 con botones de Pausa, Reanudar y Reinicio.
- [ ] **Reparto de Tareas:** Muestra microtareas asignadas a cada miembro para ordenar la casa en equipo.
- [ ] **Fin de Sesión:** Reproduce aviso de logro y muestra confeti festivo.

---

## 10. Notificaciones & Recordatorios
- [ ] **NotificationDrawer:** Se despliega suavemente desde el lateral derecho sin desbordar la pantalla (`100dvh`).
- [ ] **Permisos Web Push:** Botón para solicitar permisos nativos en el navegador.
- [ ] **Modo Discreto:** Permite enmascarar temas sensibles en la pantalla de bloqueo.
- [ ] **Acciones:** Marcar recordatorio como completado o enviarlo a Google Calendar.

---

## 11. Personalización & Temas
- [ ] **Adultos:** Comprobar que cambiar entre **Premium**, **Minimalista**, **Familiar** y **Alegre** modifica las sombras, bordes y tarjetas del Dashboard.
- [ ] **Colores:** Cambiar entre Rosa, Azul, Verde y Lavanda manteniendo el estilo visual elegido.
- [ ] **Persistencia:** Al recargar la página o volver a entrar desde el teléfono, se conservan los estilos guardados de cada integrante.

---

## 12. Responsive y Pantallas Móviles
- [ ] **Probado en Anchos Estándar:**
  - [ ] 360px (Android compacto)
  - [ ] 390px (iPhone estándar)
  - [ ] 412px (Android moderno / Galaxy / Pixel)
  - [ ] Desktop (pantallas anchas 1280px+)
- [ ] **Sin scroll horizontal accidental** en ninguna vista.
- [ ] **Safe Areas:** Los botones inferiores no quedan tapados por la barra gestual de Android o iOS.
- [ ] **Modales Centrados:** Se pueden cerrar fácilmente tocando fuera o en el botón de cancelar.
