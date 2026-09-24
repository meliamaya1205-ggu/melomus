# Design System: Nuestro Hogar 🏡✨
**Concepto:** *Warmth, Modernity & Full Personalization*  
**Versión:** 2.0 (Sistema de Temas Dinámico & Dashboard Reensamblado)  
**Filosofía:** Reducir la carga mental familiar mediante una interfaz cálida, moderna, clara y profundamente personalizada para cada miembro del hogar.

---

## 1. Fundamentos del Sistema de Diseño

"Nuestro Hogar" no es un software empresarial frío ni un tablero administrativo estéril. Es el centro operativo de la familia: un espacio íntimo, vibrante y acogedor donde conviven dos adultos coadministradores (Mamá y Papá) y tres niños (Annie, Derek y Axel).

### Principios Clave:
1. **Calidez Humana y Familiar:** Los colores, gradientes y microdetalles celebran la vida compartida, evitando el minimalismo plano o clínico.
2. **Personalización Real por Perfil:** Cada miembro tiene su propia identidad visual sin asociar colores a estereotipos de género de forma obligatoria.
3. **Claridad Inmediata (Regla de los 3 Segundos):** Identificación visual instantánea de prioridades, tareas urgentes, citas médicas y pendientes del hogar.
4. **Protección de la Experiencia Móvil:** Respeto absoluto por Viewports dinámicos (`100dvh`), *Safe Area Insets* de iOS/Android y navegación táctil sin desbordamientos.

---

## 2. Sistema de Temas Bidimensional (Estilo Visual + Color Personal)

Cada perfil cuenta con una configuración independiente compuesta por dos dimensiones ortogonales:
- **Estilo Visual (`visualStyle`):** Determina la atmósfera general, radios de curvatura, sombras, tipografía y fondos.
- **Color Personal (`personalColor`):** Define el acento cromático primario y secundario, gradientes del hero y badges.

### 2.1 Estilos para Adultos (Mamá & Papá)
| Estilo | Icono | Descripción | Características Tokenizadas |
| :--- | :---: | :--- | :--- |
| **✨ Premium** | `premium` | Elegante, sobrio y refinado. | Sombras suaves de alta gama, bordes de 20px, gradientes sutiles y contraste de precisión. |
| **🫧 Minimalista** | `minimalist` | Limpio, sereno, enfocado en lo esencial. | Bordes redondeados sutiles (14px), micro-sombras, fondos desaturados y máxima legibilidad. |
| **🏡 Familiar** | `family` | Cálido, hogareño, afectuoso y acogedor. | Curvaturas generosas (24px), sombras envolventes, tonos cálidos lino/marfil y acentos vivos. |
| **🌈 Alegre** | `joyful` | Vibrante, optimista y dinámico. | Curvaturas lúdicas (24px), sombras vivas con elevación, contrastes enérgicos. |

### 2.2 Estilos Infantiles (Annie, Derek & Axel)
| Estilo | Icono | Descripción | Características Tokenizadas |
| :--- | :---: | :--- | :--- |
| **🧸 Infantil** | `kids` | Tierno, amigable, con formas muy suaves. | Radios extra grandes (28px), botones tipo píldora (full), fondos pasteles y sombras esponjosas. |
| **🚀 Aventuras** | `adventure` | Espacial, explorador, activo. | Radios modernos (22px), sombras con acento azul/índigo, gradientes cósmicos. |
| **🐻 Animales** | `animals` | Natural, terrenal, juguetón. | Radios orgánicos (24px), sombras suaves en tonos tierra y verde bosque, fondos cálidos. |
| **🌈 Fantasía** | `fantasy` | Mágico, brillante, imaginativo. | Radios de 26px, gradientes irisados, acentos púrpura/fucsia y microdestellos. |

### 2.3 Colores Personales

#### Para Adultos:
- 🌸 **Rosa:** Suave, afectuoso (`#ec4899` / `#be185d`)
- 💙 **Azul:** Sereno, confiable (`#0ea5e9` / `#0284c7`)
- 🌿 **Verde:** Armónico, natural (`#10b981` / `#059669`)
- 💜 **Lavanda:** Introspectivo, relajante (`#8b5cf6` / `#7c3aed`)
- 🖤 **Grafito:** Neutro, sobrio, contemporáneo (`#475569` / `#334155`)

#### Para Niños:
- 🌸 **Rosa** | 💙 **Azul** | 💚 **Verde** | 💜 **Lila** | 🧡 **Naranja** | 💛 **Amarillo** | 🌈 **Arcoíris**

---

## 3. Tokens de Diseño CSS Centralizados

El sistema inyecta tokens en `:root` y en el contenedor principal de la aplicación dinámicamente mediante el hook `useTheme()` y `ThemeContext`:

```css
:root {
  --color-primary: #ec4899;
  --color-primary-hover: #db2777;
  --color-primary-light: #fdf2f8;
  --color-primary-text: #9d174d;
  --color-accent: #f59e0b;
  --color-accent-light: #fffbeb;
  --color-bg: #fff5f8;
  --color-surface: #ffffff;
  --color-border: #fce7f3;
  --radius-card: 24px;
  --radius-btn: 16px;
  --radius-pill: 9999px;
  --shadow-card: 0 4px 20px -2px rgba(236, 72, 153, 0.08);
  --shadow-float: 0 10px 30px -4px rgba(0, 0, 0, 0.12);
  --font-family: 'Inter', system-ui, sans-serif;
  --font-heading: 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif;
}
```

### Configuración Predeterminada por Miembro de la Familia:
- **Mamá (ID: 1):** Estilo *🏡 Familiar* + Color *🌸 Rosa*
- **Papá (ID: 2):** Estilo *🫧 Minimalista* + Color *💙 Azul*
- **Annie (ID: 3):** Estilo *🌈 Fantasía* + Color *💜 Lila*
- **Derek (ID: 4):** Estilo *🚀 Aventuras* + Color *💙 Azul*
- **Axel (ID: 5):** Estilo *🧸 Infantil* + Color *💚 Verde*

---

## 4. Arquitectura de Almacenamiento y Persistencia

El servicio `src/services/themeStorage.ts` implementa una abstracción completamente desacoplada con la siguiente interfaz:

```typescript
export interface ThemeStorageService {
  getPreferences(): Record<number, ProfileThemePreference>;
  getPreferenceForMember(memberId: number, isKid?: boolean): ProfileThemePreference;
  savePreference(preference: ProfileThemePreference): void;
  resetToDefaults(): void;
}
```

- **Almacenamiento Local:** Clave `nuestro_hogar_profile_themes_v1`.
- **Preparado para Supabase:** Cuando se active la sincronización con backend, el servicio puede sustituir la capa de persistencia por llamadas a tabla `user_profile_theme` sin modificar ningún componente UI.

---

## 5. Módulo de Configuración & Vista Previa en Vivo

### 5.1 Enfoque para Adultos (`SettingsView` - Pestaña "Personalización 🎨")
- Selector de perfil familiar (Mamá, Papá, Annie, Derek, Axel) para coadministrar.
- Selector visual en grilla de tarjetas interactivas con badges, iconos y descripciones.
- Muestrario circular de colores personales con anillo de selección activo.
- **Vista Previa en Vivo:** Tarjeta interactiva *"Así se verá Nuestro Hogar"* que replica en tiempo real la combinación elegida (título, tarjetas, checkbox interactivo de tareas y botones primarios).
- Botón de guardado con feedback háptico/visual ("Preferencias guardadas").

### 5.2 Enfoque para Niños (`KidsDashboardView` - Modal "Mi Estilo y Color")
- Respetando la barrera de privacidad donde los niños no acceden a la configuración del sistema, se incorpora un botón de acción en su tablero que abre un modal adaptado a niños con selector visual lúdico.

---

## 6. Jerarquía Visual del Dashboard (Inicio)

1. **Hero Greeting (`GreetingCard.tsx`):**
   - Saludo contextual según la hora del día y nombre del perfil activo.
   - Gradiente de ambientación basado en el tema activo.
   - Píldoras de métricas inmediatas: Tareas hoy, Citas médicas, Compras urgentes.
   - Botón directo "Reset Familiar" para alineación y chequeo rápido del hogar.
2. **Barra Horizontal de la Familia (`FamilyMembersSummary.tsx`):**
   - Muestra a todos los integrantes (Mamá, Papá, Annie, Derek, Axel).
   - Indicador de estado, roles (Coadministrador / Hijos) y resumen de tareas pendientes / puntos canjeables.
3. **Sección Prioritaria "Necesita tu atención" (`NeedsAttentionSection.tsx`):**
   - Tarjetas de atención urgente con avatar del responsable, icono temático (médico, compras, tareas, recordatorios) y etiqueta de categoría.
   - Estado vacío de descanso: *"Todo en orden. La familia está al día."*
4. **Grilla Principal de 2 Columnas:**
   - **Columna Izquierda:** Tareas de Hoy (`TodayTasksList.tsx`) y Resumen de Hábitos Infantiles (`KidsHabitSummary.tsx`) con frase inspiradora familiar y barra de progreso.
   - **Columna Derecha:** Próximos Eventos y Citas (`UpcomingEvents.tsx`) y Estado del Hogar y Lista de Compras (`HomeQuickStatus.tsx`).
5. **Resumen Financiero Sobrio (`FinanceQuickSummary.tsx`):**
   - Ubicado al pie del Dashboard, exclusivo para adultos, mostrando Balance mensual, Gastos y Presupuesto de forma ejecutiva y sin saturar la parte superior.

---

## 7. Garantías Técnicas y de Accesibilidad

- **Responsive estricto:** 0 desbordamiento horizontal en viewports de 320px a 1440px.
- **Áreas Seguras Móviles:** Soporte de `pt-[env(safe-area-inset-top)]` y `pb-[env(safe-area-inset-bottom)]`.
- **Cero Modificaciones a la Lógica de Negocio:** Autenticación, permisos, coadministración paritaria, calendario, finanzas, salud, pareja y hábitos permanecen intactos.
