export type AdultVisualStyle = 'premium' | 'minimalista' | 'familiar' | 'alegre';
export type KidVisualStyle = 'infantil' | 'aventuras' | 'animales' | 'fantasia';
export type VisualStyle = AdultVisualStyle | KidVisualStyle;

export type AdultColor = 'rosa' | 'azul' | 'verde' | 'lavanda' | 'grafito';
export type KidColor = 'rosa' | 'azul' | 'verde' | 'lila' | 'naranja' | 'amarillo' | 'arcoiris';
export type PersonalColor = AdultColor | KidColor;

export interface ProfileThemePreference {
  memberId: string;
  visualStyle: VisualStyle;
  personalColor: PersonalColor;
  updatedAt?: string;
}

export interface BannerStyleTokens {
  background: string;
  textColor: string;
  subtitleColor: string;
  badgeBg: string;
  badgeTextColor: string;
  border: string;
  shadow: string;
  buttonBg: string;
  buttonTextColor: string;
  metricCardBg: string;
  metricBorder: string;
  metricTextColor: string;
  decorativeElements: 'champagne-rings' | 'none' | 'warm-sun' | 'sparkles' | 'stars' | 'cosmic';
}

export interface ThemeTokens {
  // Identification
  styleId: VisualStyle;
  colorId: PersonalColor;
  styleName: string;
  colorName: string;

  // Brand & Palette colors (driven by personalColor)
  primary: string;
  primarySoft: string;
  primaryHover: string;
  primaryForeground: string;
  
  accent: string;
  accentSoft: string;
  accentForeground: string;

  // Backgrounds & Surfaces (driven by visualStyle + personalColor tint)
  background: string;
  surface: string;
  surfaceSecondary: string;
  surfaceElevated: string;

  // Typography colors
  textMain: string;
  textMuted: string;
  textSubtle: string;

  // Borders
  border: string;
  borderSubtle: string;
  borderAccent: string;

  // Feedback
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;

  // Structural Tokens (driven by visualStyle)
  cardRadius: string;
  innerRadius: string;
  buttonRadius: string;
  badgeRadius: string;

  // Depth & Shadows (driven by visualStyle)
  cardShadow: string;
  elevatedShadow: string;
  buttonShadow: string;

  // Card Appearance (driven by visualStyle)
  cardBg: string;
  cardBorder: string;
  itemBg: string;
  itemBorder: string;
  itemHoverBg: string;

  // Hero / Banner Specific (driven by visualStyle + personalColor combination)
  banner: BannerStyleTokens;

  // Premium Accents
  accentGold: string;
  accentGoldSoft: string;
}

export interface VisualStyleOption {
  id: VisualStyle;
  name: string;
  description: string;
  badge: string;
  icon: string;
  targetRole: 'adult' | 'child';
}

export interface PersonalColorOption {
  id: PersonalColor;
  name: string;
  hex: string;
  secondaryHex: string;
  targetRole: 'adult' | 'child' | 'both';
}
