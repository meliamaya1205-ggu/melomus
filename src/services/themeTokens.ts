import {
  VisualStyle,
  PersonalColor,
  ThemeTokens,
  BannerStyleTokens,
  VisualStyleOption,
  PersonalColorOption,
} from '../types/theme';

export const VISUAL_STYLE_OPTIONS: VisualStyleOption[] = [
  // Adult styles
  {
    id: 'premium',
    name: 'Premium',
    description: 'Sofisticado, elegante, sombras profundas suaves, detalles champagne y elevación',
    badge: '✨ Sofisticado',
    icon: 'Sparkles',
    targetRole: 'adult',
  },
  {
    id: 'minimalista',
    name: 'Minimalista',
    description: 'Limpio, superficies planas, sin sombras pesadas, espacio negativo y máxima claridad',
    badge: '🫧 Esencial',
    icon: 'Feather',
    targetRole: 'adult',
  },
  {
    id: 'familiar',
    name: 'Familiar',
    description: 'Cálido, acogedor, tonos crema y arena, formas suaves y sensación de hogar',
    badge: '🏡 Acogedor',
    icon: 'Home',
    targetRole: 'adult',
  },
  {
    id: 'alegre',
    name: 'Alegre',
    description: 'Luminoso, dinámico y positivo con acentos coloridos y microinteracciones vivas',
    badge: '🌈 Luminoso',
    icon: 'Sun',
    targetRole: 'adult',
  },

  // Kid styles
  {
    id: 'infantil',
    name: 'Infantil',
    description: 'Divertido, amigable, formas muy redondeadas y detalles tiernos',
    badge: '🧸 Amigable',
    icon: 'Smile',
    targetRole: 'child',
  },
  {
    id: 'aventuras',
    name: 'Aventuras',
    description: 'Exploración, espacio, bitácora de misiones y energía viva',
    badge: '🚀 Misiones',
    icon: 'Compass',
    targetRole: 'child',
  },
  {
    id: 'animales',
    name: 'Animales',
    description: 'Naturaleza, animales protectores y tonos cálidos del bosque',
    badge: '🐻 Naturaleza',
    icon: 'Trees',
    targetRole: 'child',
  },
  {
    id: 'fantasia',
    name: 'Fantasía',
    description: 'Mágico, lúdico, destellos pasteles y detalles de ensueño',
    badge: '🌈 Mágico',
    icon: 'Wand2',
    targetRole: 'child',
  },
];

export const ADULT_COLOR_OPTIONS: PersonalColorOption[] = [
  {
    id: 'rosa',
    name: 'Rosa',
    hex: '#be3c67',
    secondaryHex: '#fbe9ef',
    targetRole: 'adult',
  },
  {
    id: 'azul',
    name: 'Azul',
    hex: '#1e40af',
    secondaryHex: '#eef2ff',
    targetRole: 'adult',
  },
  {
    id: 'verde',
    name: 'Verde',
    hex: '#1b6343',
    secondaryHex: '#eff8f3',
    targetRole: 'adult',
  },
  {
    id: 'lavanda',
    name: 'Lavanda',
    hex: '#6d28d9',
    secondaryHex: '#f5f3ff',
    targetRole: 'adult',
  },
  {
    id: 'grafito',
    name: 'Grafito',
    hex: '#334155',
    secondaryHex: '#f1f5f9',
    targetRole: 'adult',
  },
];

export const KID_COLOR_OPTIONS: PersonalColorOption[] = [
  {
    id: 'rosa',
    name: 'Rosa',
    hex: '#db2777',
    secondaryHex: '#fdf2f8',
    targetRole: 'child',
  },
  {
    id: 'azul',
    name: 'Azul',
    hex: '#0284c7',
    secondaryHex: '#f0f9ff',
    targetRole: 'child',
  },
  {
    id: 'verde',
    name: 'Verde',
    hex: '#059669',
    secondaryHex: '#ecfdf5',
    targetRole: 'child',
  },
  {
    id: 'lila',
    name: 'Lila',
    hex: '#7c3aed',
    secondaryHex: '#f5f3ff',
    targetRole: 'child',
  },
  {
    id: 'naranja',
    name: 'Naranja',
    hex: '#ea580c',
    secondaryHex: '#fff7ed',
    targetRole: 'child',
  },
  {
    id: 'amarillo',
    name: 'Amarillo',
    hex: '#ca8a04',
    secondaryHex: '#fefce8',
    targetRole: 'child',
  },
  {
    id: 'arcoiris',
    name: 'Arcoíris',
    hex: '#4f46e5',
    secondaryHex: '#eef2ff',
    targetRole: 'child',
  },
];

export const ALL_COLOR_OPTIONS: PersonalColorOption[] = [
  ...ADULT_COLOR_OPTIONS,
  ...KID_COLOR_OPTIONS.filter((kc) => !ADULT_COLOR_OPTIONS.some((ac) => ac.id === kc.id)),
];

interface BaseColorPalette {
  primary: string;
  primarySoft: string;
  primaryHover: string;
  accent: string;
  accentSoft: string;
}

const PALETTES: Record<PersonalColor, BaseColorPalette> = {
  rosa: {
    primary: '#be3c67',
    primarySoft: '#fdf2f5',
    primaryHover: '#9f2850',
    accent: '#d97706',
    accentSoft: '#fef3c7',
  },
  azul: {
    primary: '#1e40af',
    primarySoft: '#f0f4ff',
    primaryHover: '#1d3596',
    accent: '#0284c7',
    accentSoft: '#e0f2fe',
  },
  verde: {
    primary: '#1b6343',
    primarySoft: '#f0fdf4',
    primaryHover: '#154e35',
    accent: '#d97706',
    accentSoft: '#fef3c7',
  },
  lavanda: {
    primary: '#6d28d9',
    primarySoft: '#f5f3ff',
    primaryHover: '#5b21b6',
    accent: '#ec4899',
    accentSoft: '#fdf2f8',
  },
  grafito: {
    primary: '#334155',
    primarySoft: '#f1f5f9',
    primaryHover: '#1e293b',
    accent: '#c5a059',
    accentSoft: '#fbf7ee',
  },
  lila: {
    primary: '#7c3aed',
    primarySoft: '#f5f3ff',
    primaryHover: '#6d28d9',
    accent: '#f43f5e',
    accentSoft: '#ffe4e6',
  },
  naranja: {
    primary: '#ea580c',
    primarySoft: '#fff7ed',
    primaryHover: '#c2410c',
    accent: '#ca8a04',
    accentSoft: '#fefce8',
  },
  amarillo: {
    primary: '#ca8a04',
    primarySoft: '#fefce8',
    primaryHover: '#a16207',
    accent: '#ea580c',
    accentSoft: '#fff7ed',
  },
  arcoiris: {
    primary: '#4f46e5',
    primarySoft: '#eef2ff',
    primaryHover: '#4338ca',
    accent: '#ec4899',
    accentSoft: '#fdf2f8',
  },
};

/**
 * Computes banner tokens strictly dependent on the combination of (visualStyle, personalColor)
 */
function computeBannerTokens(
  visualStyle: VisualStyle,
  personalColor: PersonalColor,
  palette: BaseColorPalette
): BannerStyleTokens {
  switch (visualStyle) {
    case 'premium': {
      // Deep jewel-tone luxury gradient with gold accents
      const jewelGradients: Record<PersonalColor, string> = {
        rosa: 'linear-gradient(135deg, #3d0d1e 0%, #5f132e 50%, #7e193d 100%)',
        azul: 'linear-gradient(135deg, #0b1f4d 0%, #122f70 50%, #184299 100%)',
        verde: 'linear-gradient(135deg, #0a2618 0%, #113f27 50%, #185a38 100%)',
        lavanda: 'linear-gradient(135deg, #280d50 0%, #3d1477 50%, #531c9f 100%)',
        grafito: 'linear-gradient(135deg, #111827 0%, #1f2937 50%, #374151 100%)',
        lila: 'linear-gradient(135deg, #300e57 0%, #46167c 50%, #6020a5 100%)',
        naranja: 'linear-gradient(135deg, #451a03 0%, #662706 50%, #87360a 100%)',
        amarillo: 'linear-gradient(135deg, #3f2203 0%, #5b3307 50%, #78450d 100%)',
        arcoiris: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
      };

      return {
        background: jewelGradients[personalColor] || jewelGradients.rosa,
        textColor: '#ffffff',
        subtitleColor: 'rgba(255, 255, 255, 0.85)',
        badgeBg: 'rgba(217, 119, 6, 0.25)',
        badgeTextColor: '#fde68a',
        border: '1px solid rgba(245, 158, 11, 0.35)',
        shadow: '0 20px 35px -10px rgba(0, 0, 0, 0.3)',
        buttonBg: '#ffffff',
        buttonTextColor: '#1c1917',
        metricCardBg: 'rgba(255, 255, 255, 0.08)',
        metricBorder: '1px solid rgba(255, 255, 255, 0.12)',
        metricTextColor: '#ffffff',
        decorativeElements: 'champagne-rings',
      };
    }

    case 'minimalista': {
      // Clean, light, airy, subtle tinted surface with high-contrast dark text
      return {
        background: '#ffffff',
        textColor: '#18181b',
        subtitleColor: '#71717a',
        badgeBg: palette.primarySoft,
        badgeTextColor: palette.primary,
        border: '1px solid #e4e4e7',
        shadow: '0 1px 3px 0 rgba(0, 0, 0, 0.03)',
        buttonBg: '#18181b',
        buttonTextColor: '#ffffff',
        metricCardBg: '#f4f4f5',
        metricBorder: '1px solid #e4e4e7',
        metricTextColor: '#18181b',
        decorativeElements: 'none',
      };
    }

    case 'familiar': {
      // Warm, cozy hearth gradient (rose/peach/amber blend)
      const warmGradients: Record<PersonalColor, string> = {
        rosa: 'linear-gradient(135deg, #be3c67 0%, #d946ef 50%, #ea580c 100%)',
        azul: 'linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #0d9488 100%)',
        verde: 'linear-gradient(135deg, #166534 0%, #15803d 50%, #ca8a04 100%)',
        lavanda: 'linear-gradient(135deg, #6b21a8 0%, #9333ea 50%, #f43f5e 100%)',
        grafito: 'linear-gradient(135deg, #1f2937 0%, #374151 50%, #b45309 100%)',
        lila: 'linear-gradient(135deg, #6d28d9 0%, #9333ea 50%, #f43f5e 100%)',
        naranja: 'linear-gradient(135deg, #c2410c 0%, #ea580c 50%, #f59e0b 100%)',
        amarillo: 'linear-gradient(135deg, #b45309 0%, #d97706 50%, #eab308 100%)',
        arcoiris: 'linear-gradient(135deg, #4338ca 0%, #db2777 50%, #ea580c 100%)',
      };

      return {
        background: warmGradients[personalColor] || warmGradients.rosa,
        textColor: '#ffffff',
        subtitleColor: 'rgba(255, 255, 255, 0.92)',
        badgeBg: 'rgba(255, 255, 255, 0.22)',
        badgeTextColor: '#ffffff',
        border: '1px solid rgba(255, 255, 255, 0.25)',
        shadow: '0 10px 25px -5px rgba(120, 80, 50, 0.15)',
        buttonBg: '#ffffff',
        buttonTextColor: '#292524',
        metricCardBg: 'rgba(255, 255, 255, 0.18)',
        metricBorder: '1px solid rgba(255, 255, 255, 0.25)',
        metricTextColor: '#ffffff',
        decorativeElements: 'warm-sun',
      };
    }

    case 'alegre': {
      // Radiant, energetic, bright sunny blend with lively contrast
      const cheerfulGradients: Record<PersonalColor, string> = {
        rosa: 'linear-gradient(135deg, #ec4899 0%, #f43f5e 50%, #f59e0b 100%)',
        azul: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 50%, #10b981 100%)',
        verde: 'linear-gradient(135deg, #10b981 0%, #22c55e 50%, #eab308 100%)',
        lavanda: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 50%, #f97316 100%)',
        grafito: 'linear-gradient(135deg, #334155 0%, #0ea5e9 50%, #f59e0b 100%)',
        lila: 'linear-gradient(135deg, #a855f7 0%, #f43f5e 50%, #facc15 100%)',
        naranja: 'linear-gradient(135deg, #f97316 0%, #fb923c 50%, #facc15 100%)',
        amarillo: 'linear-gradient(135deg, #eab308 0%, #facc15 50%, #4ade80 100%)',
        arcoiris: 'linear-gradient(135deg, #f43f5e 0%, #f59e0b 35%, #10b981 70%, #6366f1 100%)',
      };

      return {
        background: cheerfulGradients[personalColor] || cheerfulGradients.rosa,
        textColor: '#ffffff',
        subtitleColor: 'rgba(255, 255, 255, 0.95)',
        badgeBg: 'rgba(255, 255, 255, 0.28)',
        badgeTextColor: '#ffffff',
        border: '1.5px solid rgba(255, 255, 255, 0.35)',
        shadow: '0 12px 30px -4px rgba(236, 72, 153, 0.25)',
        buttonBg: '#ffffff',
        buttonTextColor: '#1c1917',
        metricCardBg: 'rgba(255, 255, 255, 0.22)',
        metricBorder: '1px solid rgba(255, 255, 255, 0.35)',
        metricTextColor: '#ffffff',
        decorativeElements: 'sparkles',
      };
    }

    case 'infantil':
      return {
        background: 'linear-gradient(135deg, #ec4899 0%, #a855f7 50%, #38bdf8 100%)',
        textColor: '#ffffff',
        subtitleColor: 'rgba(255, 255, 255, 0.95)',
        badgeBg: 'rgba(255, 255, 255, 0.3)',
        badgeTextColor: '#ffffff',
        border: '2px solid rgba(255, 255, 255, 0.4)',
        shadow: '0 14px 28px -4px rgba(168, 85, 247, 0.25)',
        buttonBg: '#ffffff',
        buttonTextColor: '#7c3aed',
        metricCardBg: 'rgba(255, 255, 255, 0.25)',
        metricBorder: '1.5px solid rgba(255, 255, 255, 0.4)',
        metricTextColor: '#ffffff',
        decorativeElements: 'sparkles',
      };

    case 'aventuras':
      return {
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #0284c7 100%)',
        textColor: '#ffffff',
        subtitleColor: 'rgba(255, 255, 255, 0.85)',
        badgeBg: 'rgba(14, 165, 233, 0.3)',
        badgeTextColor: '#38bdf8',
        border: '1px solid rgba(56, 189, 248, 0.35)',
        shadow: '0 16px 32px -4px rgba(2, 132, 199, 0.25)',
        buttonBg: '#38bdf8',
        buttonTextColor: '#0f172a',
        metricCardBg: 'rgba(255, 255, 255, 0.1)',
        metricBorder: '1px solid rgba(56, 189, 248, 0.25)',
        metricTextColor: '#ffffff',
        decorativeElements: 'cosmic',
      };

    case 'animales':
      return {
        background: 'linear-gradient(135deg, #14532d 0%, #15803d 50%, #a16207 100%)',
        textColor: '#ffffff',
        subtitleColor: 'rgba(255, 255, 255, 0.9)',
        badgeBg: 'rgba(254, 240, 138, 0.25)',
        badgeTextColor: '#fef08a',
        border: '1px solid rgba(254, 240, 138, 0.3)',
        shadow: '0 14px 28px -4px rgba(20, 83, 45, 0.2)',
        buttonBg: '#ffffff',
        buttonTextColor: '#14532d',
        metricCardBg: 'rgba(255, 255, 255, 0.15)',
        metricBorder: '1px solid rgba(255, 255, 255, 0.25)',
        metricTextColor: '#ffffff',
        decorativeElements: 'warm-sun',
      };

    case 'fantasia':
      return {
        background: 'linear-gradient(135deg, #581c87 0%, #9333ea 50%, #f43f5e 100%)',
        textColor: '#ffffff',
        subtitleColor: 'rgba(255, 255, 255, 0.92)',
        badgeBg: 'rgba(255, 255, 255, 0.25)',
        badgeTextColor: '#fdf4ff',
        border: '1px solid rgba(250, 232, 255, 0.35)',
        shadow: '0 16px 32px -4px rgba(147, 51, 234, 0.25)',
        buttonBg: '#ffffff',
        buttonTextColor: '#6b21a8',
        metricCardBg: 'rgba(255, 255, 255, 0.18)',
        metricBorder: '1px solid rgba(255, 255, 255, 0.3)',
        metricTextColor: '#ffffff',
        decorativeElements: 'stars',
      };
  }
}

/**
 * Computes complete ThemeTokens based on visualStyle and personalColor
 */
export function getThemeTokens(
  visualStyle: VisualStyle,
  personalColor: PersonalColor
): ThemeTokens {
  const palette = PALETTES[personalColor] || PALETTES.rosa;
  const banner = computeBannerTokens(visualStyle, personalColor, palette);

  // Defaults based on style
  switch (visualStyle) {
    case 'premium':
      return {
        styleId: 'premium',
        colorId: personalColor,
        styleName: 'Premium',
        colorName: palette.primary,
        primary: palette.primary,
        primarySoft: palette.primarySoft,
        primaryHover: palette.primaryHover,
        primaryForeground: '#ffffff',
        accent: palette.accent,
        accentSoft: palette.accentSoft,
        accentForeground: '#ffffff',

        // Backgrounds: refined ivory, pure elevated white cards
        background: '#f8f6f0',
        surface: '#ffffff',
        surfaceSecondary: '#f4efe6',
        surfaceElevated: '#ffffff',

        textMain: '#1c1917',
        textMuted: '#57534e',
        textSubtle: '#8c857e',

        border: '#e4dfd7',
        borderSubtle: '#ebe7e0',
        borderAccent: 'rgba(217, 119, 6, 0.4)',

        success: '#10b981',
        successSoft: '#ecfdf5',
        warning: '#f59e0b',
        warningSoft: '#fffbeb',
        danger: '#ef4444',
        dangerSoft: '#fef2f2',

        cardRadius: '1.25rem', // 20px - elegant
        innerRadius: '0.875rem', // 14px
        buttonRadius: '0.875rem',
        badgeRadius: '0.625rem',

        // Deep luxury shadows
        cardShadow: '0 12px 30px -4px rgba(28, 25, 23, 0.08), 0 4px 10px -2px rgba(28, 25, 23, 0.04)',
        elevatedShadow: '0 20px 40px -6px rgba(28, 25, 23, 0.12)',
        buttonShadow: '0 4px 14px -2px rgba(28, 25, 23, 0.15)',

        cardBg: '#ffffff',
        cardBorder: '1px solid #e4dfd7',
        itemBg: '#ffffff',
        itemBorder: '1px solid #ede8e1',
        itemHoverBg: '#faf8f5',

        banner,
        accentGold: '#c5a059',
        accentGoldSoft: '#fdf9ee',
      };

    case 'minimalista':
      return {
        styleId: 'minimalista',
        colorId: personalColor,
        styleName: 'Minimalista',
        colorName: palette.primary,
        primary: palette.primary,
        primarySoft: palette.primarySoft,
        primaryHover: palette.primaryHover,
        primaryForeground: '#ffffff',
        accent: palette.accent,
        accentSoft: palette.accentSoft,
        accentForeground: '#ffffff',

        // Backgrounds: crisp, clean white, stark space
        background: '#fcfcfc',
        surface: '#ffffff',
        surfaceSecondary: '#f8f8f8',
        surfaceElevated: '#ffffff',

        textMain: '#18181b',
        textMuted: '#71717a',
        textSubtle: '#a1a1aa',

        border: '#e4e4e7',
        borderSubtle: '#f4f4f5',
        borderAccent: '#d4d4d8',

        success: '#10b981',
        successSoft: '#f0fdf4',
        warning: '#f59e0b',
        warningSoft: '#fffbeb',
        danger: '#ef4444',
        dangerSoft: '#fef2f2',

        cardRadius: '0.875rem', // 14px - contained & clean
        innerRadius: '0.625rem', // 10px
        buttonRadius: '0.625rem',
        badgeRadius: '0.375rem',

        // Zero heavy shadows - flat aesthetic
        cardShadow: 'none',
        elevatedShadow: '0 2px 6px 0 rgba(0, 0, 0, 0.04)',
        buttonShadow: 'none',

        cardBg: '#ffffff',
        cardBorder: '1px solid #e4e4e7',
        itemBg: '#ffffff',
        itemBorder: '1px solid #f4f4f5',
        itemHoverBg: '#f8f8f8',

        banner,
        accentGold: '#a1a1aa',
        accentGoldSoft: '#f4f4f5',
      };

    case 'familiar':
      return {
        styleId: 'familiar',
        colorId: personalColor,
        styleName: 'Familiar',
        colorName: palette.primary,
        primary: palette.primary,
        primarySoft: palette.primarySoft,
        primaryHover: palette.primaryHover,
        primaryForeground: '#ffffff',
        accent: palette.accent,
        accentSoft: palette.accentSoft,
        accentForeground: '#ffffff',

        // Backgrounds: warm cream, linen, soft sand
        background: '#f8f5f0',
        surface: '#ffffff',
        surfaceSecondary: '#f5efe6',
        surfaceElevated: '#ffffff',

        textMain: '#292524',
        textMuted: '#57534e',
        textSubtle: '#a8a29e',

        border: '#e7ded4',
        borderSubtle: '#f0e8dc',
        borderAccent: '#dfd2c4',

        success: '#16a34a',
        successSoft: '#f0fdf4',
        warning: '#ea580c',
        warningSoft: '#fff7ed',
        danger: '#dc2626',
        dangerSoft: '#fef2f2',

        cardRadius: '1.5rem', // 24px - organic, soft
        innerRadius: '1rem',
        buttonRadius: '1rem',
        badgeRadius: '0.75rem',

        // Soft enveloping warm shadow
        cardShadow: '0 4px 20px -2px rgba(120, 80, 50, 0.06), 0 1px 3px 0 rgba(0, 0, 0, 0.03)',
        elevatedShadow: '0 14px 28px -4px rgba(120, 80, 50, 0.1)',
        buttonShadow: '0 2px 8px -1px rgba(120, 80, 50, 0.12)',

        cardBg: '#ffffff',
        cardBorder: '1px solid #e7ded4',
        itemBg: '#fbf9f6',
        itemBorder: '1px solid #ede5db',
        itemHoverBg: '#f4eee4',

        banner,
        accentGold: '#d97706',
        accentGoldSoft: '#fffbeb',
      };

    case 'alegre':
      return {
        styleId: 'alegre',
        colorId: personalColor,
        styleName: 'Alegre',
        colorName: palette.primary,
        primary: palette.primary,
        primarySoft: palette.primarySoft,
        primaryHover: palette.primaryHover,
        primaryForeground: '#ffffff',
        accent: palette.accent,
        accentSoft: palette.accentSoft,
        accentForeground: '#ffffff',

        // Backgrounds: bright luminous ivory
        background: '#fefdfb',
        surface: '#ffffff',
        surfaceSecondary: '#fef3e7',
        surfaceElevated: '#ffffff',

        textMain: '#1c1917',
        textMuted: '#44403c',
        textSubtle: '#78716c',

        border: '#fed7aa',
        borderSubtle: '#ffedd5',
        borderAccent: '#fdba74',

        success: '#10b981',
        successSoft: '#ecfdf5',
        warning: '#f59e0b',
        warningSoft: '#fffbeb',
        danger: '#ef4444',
        dangerSoft: '#fef2f2',

        cardRadius: '1.5rem', // 24px - bubbly
        innerRadius: '1rem',
        buttonRadius: '1rem',
        badgeRadius: '9999px', // pills

        // Lively dynamic shadow with color tint
        cardShadow: '0 6px 20px -2px rgba(234, 88, 12, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.03)',
        elevatedShadow: '0 16px 32px -4px rgba(234, 88, 12, 0.14)',
        buttonShadow: '0 4px 12px -1px rgba(234, 88, 12, 0.2)',

        cardBg: '#ffffff',
        cardBorder: '1.5px solid #fed7aa',
        itemBg: '#fffbf7',
        itemBorder: '1px solid #fed7aa',
        itemHoverBg: '#ffedd5',

        banner,
        accentGold: '#f59e0b',
        accentGoldSoft: '#fffbeb',
      };

    case 'infantil':
      return {
        styleId: 'infantil',
        colorId: personalColor,
        styleName: 'Infantil',
        colorName: palette.primary,
        primary: palette.primary,
        primarySoft: palette.primarySoft,
        primaryHover: palette.primaryHover,
        primaryForeground: '#ffffff',
        accent: '#f59e0b',
        accentSoft: '#fef3c7',
        accentForeground: '#ffffff',

        background: '#fcf8ff',
        surface: '#ffffff',
        surfaceSecondary: '#f5edff',
        surfaceElevated: '#ffffff',

        textMain: '#1e1b4b',
        textMuted: '#4338ca',
        textSubtle: '#6366f1',

        border: '#e9d5ff',
        borderSubtle: '#f3e8ff',
        borderAccent: '#d8b4fe',

        success: '#10b981',
        successSoft: '#ecfdf5',
        warning: '#f59e0b',
        warningSoft: '#fffbeb',
        danger: '#ef4444',
        dangerSoft: '#fef2f2',

        cardRadius: '1.75rem', // 28px - ultra rounded
        innerRadius: '1.25rem',
        buttonRadius: '9999px', // pill
        badgeRadius: '9999px',

        cardShadow: '0 8px 24px -2px rgba(168, 85, 247, 0.12)',
        elevatedShadow: '0 18px 36px -4px rgba(168, 85, 247, 0.18)',
        buttonShadow: '0 4px 14px -1px rgba(168, 85, 247, 0.25)',

        cardBg: '#ffffff',
        cardBorder: '2px solid #e9d5ff',
        itemBg: '#faf5ff',
        itemBorder: '1.5px solid #e9d5ff',
        itemHoverBg: '#f3e8ff',

        banner,
        accentGold: '#f59e0b',
        accentGoldSoft: '#fef3c7',
      };

    case 'aventuras':
      return {
        styleId: 'aventuras',
        colorId: personalColor,
        styleName: 'Aventuras',
        colorName: palette.primary,
        primary: palette.primary,
        primarySoft: palette.primarySoft,
        primaryHover: palette.primaryHover,
        primaryForeground: '#ffffff',
        accent: '#0ea5e9',
        accentSoft: '#e0f2fe',
        accentForeground: '#ffffff',

        background: '#f1f5f9',
        surface: '#ffffff',
        surfaceSecondary: '#e2e8f0',
        surfaceElevated: '#ffffff',

        textMain: '#0f172a',
        textMuted: '#334155',
        textSubtle: '#64748b',

        border: '#cbd5e1',
        borderSubtle: '#e2e8f0',
        borderAccent: '#38bdf8',

        success: '#10b981',
        successSoft: '#ecfdf5',
        warning: '#f59e0b',
        warningSoft: '#fffbeb',
        danger: '#ef4444',
        dangerSoft: '#fef2f2',

        cardRadius: '1.25rem',
        innerRadius: '0.875rem',
        buttonRadius: '0.875rem',
        badgeRadius: '0.5rem',

        cardShadow: '0 6px 18px -2px rgba(2, 132, 199, 0.1)',
        elevatedShadow: '0 16px 32px -4px rgba(2, 132, 199, 0.18)',
        buttonShadow: '0 4px 12px -1px rgba(2, 132, 199, 0.25)',

        cardBg: '#ffffff',
        cardBorder: '1.5px solid #cbd5e1',
        itemBg: '#f8fafc',
        itemBorder: '1px solid #cbd5e1',
        itemHoverBg: '#f1f5f9',

        banner,
        accentGold: '#38bdf8',
        accentGoldSoft: '#e0f2fe',
      };

    case 'animales':
      return {
        styleId: 'animales',
        colorId: personalColor,
        styleName: 'Animales',
        colorName: palette.primary,
        primary: palette.primary,
        primarySoft: palette.primarySoft,
        primaryHover: palette.primaryHover,
        primaryForeground: '#ffffff',
        accent: '#84cc16',
        accentSoft: '#f7fee7',
        accentForeground: '#ffffff',

        background: '#f6f7f2',
        surface: '#ffffff',
        surfaceSecondary: '#e9ede0',
        surfaceElevated: '#ffffff',

        textMain: '#1c1917',
        textMuted: '#44403c',
        textSubtle: '#78716c',

        border: '#d5ddcc',
        borderSubtle: '#e4ebd9',
        borderAccent: '#a3b899',

        success: '#16a34a',
        successSoft: '#f0fdf4',
        warning: '#ea580c',
        warningSoft: '#fff7ed',
        danger: '#dc2626',
        dangerSoft: '#fef2f2',

        cardRadius: '1.5rem',
        innerRadius: '1rem',
        buttonRadius: '1rem',
        badgeRadius: '9999px',

        cardShadow: '0 6px 18px -2px rgba(20, 83, 45, 0.08)',
        elevatedShadow: '0 16px 30px -4px rgba(20, 83, 45, 0.14)',
        buttonShadow: '0 3px 10px -1px rgba(20, 83, 45, 0.15)',

        cardBg: '#ffffff',
        cardBorder: '1px solid #d5ddcc',
        itemBg: '#fbfcf9',
        itemBorder: '1px solid #d5ddcc',
        itemHoverBg: '#edf2e7',

        banner,
        accentGold: '#ca8a04',
        accentGoldSoft: '#fefce8',
      };

    case 'fantasia':
      return {
        styleId: 'fantasia',
        colorId: personalColor,
        styleName: 'Fantasía',
        colorName: palette.primary,
        primary: palette.primary,
        primarySoft: palette.primarySoft,
        primaryHover: palette.primaryHover,
        primaryForeground: '#ffffff',
        accent: '#f43f5e',
        accentSoft: '#ffe4e6',
        accentForeground: '#ffffff',

        background: '#faf5ff',
        surface: '#ffffff',
        surfaceSecondary: '#f3e8ff',
        surfaceElevated: '#ffffff',

        textMain: '#3b0764',
        textMuted: '#6b21a8',
        textSubtle: '#9333ea',

        border: '#e9d5ff',
        borderSubtle: '#f3e8ff',
        borderAccent: '#c084fc',

        success: '#10b981',
        successSoft: '#ecfdf5',
        warning: '#f59e0b',
        warningSoft: '#fffbeb',
        danger: '#ef4444',
        dangerSoft: '#fef2f2',

        cardRadius: '1.625rem',
        innerRadius: '1.125rem',
        buttonRadius: '1.125rem',
        badgeRadius: '9999px',

        cardShadow: '0 8px 24px -2px rgba(147, 51, 234, 0.12)',
        elevatedShadow: '0 18px 36px -4px rgba(147, 51, 234, 0.18)',
        buttonShadow: '0 4px 14px -1px rgba(147, 51, 234, 0.25)',

        cardBg: '#ffffff',
        cardBorder: '1.5px solid #e9d5ff',
        itemBg: '#faf5ff',
        itemBorder: '1px solid #e9d5ff',
        itemHoverBg: '#f3e8ff',

        banner,
        accentGold: '#e879f9',
        accentGoldSoft: '#fdf4ff',
      };
  }
}
