import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import {
  VisualStyle,
  PersonalColor,
  ProfileThemePreference,
  ThemeTokens,
} from '../types/theme';
import { getThemeTokens } from '../services/themeTokens';
import { themeStorage } from '../services/themeStorage';

interface ThemeContextType {
  activeMemberId: string;
  setActiveMemberId: (id: string) => void;
  currentPreference: ProfileThemePreference;
  previewPreference: ProfileThemePreference | null;
  effectivePreference: ProfileThemePreference;
  themeStyle: VisualStyle;
  themeColor: PersonalColor;
  tokens: ThemeTokens;
  isPremium: boolean;
  isMinimalista: boolean;
  isFamiliar: boolean;
  isAlegre: boolean;
  isKidTheme: boolean;
  setPreviewTheme: (pref: ProfileThemePreference | null) => void;
  savePreference: (memberId: string, visualStyle: VisualStyle, personalColor: PersonalColor) => void;
  getPreferenceForMember: (memberId: string, role?: 'adult' | 'child') => ProfileThemePreference;
  resetAllPreferences: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  activeProfileId?: string;
  activeRole?: 'adult' | 'child';
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  activeProfileId = 'mama',
  activeRole = 'adult',
}) => {
  const [memberId, setMemberId] = useState<string>(activeProfileId);
  const [preferencesVersion, setPreferencesVersion] = useState<number>(0);
  const [previewPreference, setPreviewPreference] = useState<ProfileThemePreference | null>(null);

  // Sync internal memberId whenever activeProfileId prop changes
  useEffect(() => {
    setMemberId(activeProfileId);
    setPreviewPreference(null); // Clear preview when switching profiles
  }, [activeProfileId]);

  // Current preference for the active member
  const currentPreference = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    preferencesVersion; // dependency to trigger recalculation on save
    return themeStorage.getForMember(memberId, activeRole);
  }, [memberId, activeRole, preferencesVersion]);

  // Effective preference: preview takes precedence if active
  const effectivePreference = useMemo(() => {
    return previewPreference || currentPreference;
  }, [previewPreference, currentPreference]);

  const themeStyle = effectivePreference.visualStyle;
  const themeColor = effectivePreference.personalColor;

  // Calculated theme tokens
  const tokens = useMemo(() => {
    return getThemeTokens(themeStyle, themeColor);
  }, [themeStyle, themeColor]);

  // Style boolean helpers
  const isPremium = themeStyle === 'premium';
  const isMinimalista = themeStyle === 'minimalista';
  const isFamiliar = themeStyle === 'familiar';
  const isAlegre = themeStyle === 'alegre';
  const isKidTheme = ['infantil', 'aventuras', 'animales', 'fantasia'].includes(themeStyle);

  // Apply CSS Variables and style classes to DOM root and body
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    // Palette Colors
    root.style.setProperty('--color-primary', tokens.primary);
    root.style.setProperty('--color-primary-soft', tokens.primarySoft);
    root.style.setProperty('--color-primary-hover', tokens.primaryHover);
    root.style.setProperty('--color-primary-fg', tokens.primaryForeground);

    root.style.setProperty('--color-accent', tokens.accent);
    root.style.setProperty('--color-accent-soft', tokens.accentSoft);
    root.style.setProperty('--color-accent-fg', tokens.accentForeground);

    // Surfaces & Background
    root.style.setProperty('--color-bg', tokens.background);
    root.style.setProperty('--color-surface', tokens.surface);
    root.style.setProperty('--color-surface-secondary', tokens.surfaceSecondary);
    root.style.setProperty('--color-surface-elevated', tokens.surfaceElevated);

    root.style.setProperty('--color-text-main', tokens.textMain);
    root.style.setProperty('--color-text-muted', tokens.textMuted);
    root.style.setProperty('--color-text-subtle', tokens.textSubtle);

    root.style.setProperty('--color-border', tokens.border);
    root.style.setProperty('--color-border-subtle', tokens.borderSubtle);

    // Structural tokens
    root.style.setProperty('--theme-card-bg', tokens.cardBg);
    root.style.setProperty('--theme-card-border', tokens.cardBorder);
    root.style.setProperty('--theme-card-shadow', tokens.cardShadow);
    root.style.setProperty('--theme-card-radius', tokens.cardRadius);
    root.style.setProperty('--theme-inner-radius', tokens.innerRadius);
    root.style.setProperty('--theme-button-radius', tokens.buttonRadius);
    root.style.setProperty('--theme-button-shadow', tokens.buttonShadow);
    root.style.setProperty('--theme-badge-radius', tokens.badgeRadius);

    root.style.setProperty('--theme-item-bg', tokens.itemBg);
    root.style.setProperty('--theme-item-border', tokens.itemBorder);
    root.style.setProperty('--theme-item-hover-bg', tokens.itemHoverBg);

    // Legacy compatibility variables
    root.style.setProperty('--radius-card', tokens.cardRadius);
    root.style.setProperty('--radius-button', tokens.buttonRadius);
    root.style.setProperty('--shadow-card', tokens.cardShadow);
    root.style.setProperty('--shadow-elevated', tokens.elevatedShadow);
    root.style.setProperty('--banner-gradient', tokens.banner.background);

    body.style.backgroundColor = tokens.background;
    body.style.color = tokens.textMain;

    // Remove older theme classes from body
    const classList = Array.from(body.classList);
    classList.forEach((cls) => {
      if (cls.startsWith('theme-style-') || cls.startsWith('theme-color-')) {
        body.classList.remove(cls);
      }
    });

    // Add current theme classes
    body.classList.add(`theme-style-${themeStyle}`);
    body.classList.add(`theme-color-${themeColor}`);
  }, [tokens, themeStyle, themeColor]);

  const savePreference = (targetMemberId: string, visualStyle: VisualStyle, personalColor: PersonalColor) => {
    themeStorage.save({
      memberId: targetMemberId,
      visualStyle,
      personalColor,
    });
    setPreviewPreference(null);
    setPreferencesVersion((v) => v + 1);
  };

  const getPreferenceForMember = (targetMemberId: string, role: 'adult' | 'child' = 'adult') => {
    return themeStorage.getForMember(targetMemberId, role);
  };

  const resetAllPreferences = () => {
    themeStorage.reset();
    setPreviewPreference(null);
    setPreferencesVersion((v) => v + 1);
  };

  return (
    <ThemeContext.Provider
      value={{
        activeMemberId: memberId,
        setActiveMemberId: setMemberId,
        currentPreference,
        previewPreference,
        effectivePreference,
        themeStyle,
        themeColor,
        tokens,
        isPremium,
        isMinimalista,
        isFamiliar,
        isAlegre,
        isKidTheme,
        setPreviewTheme: setPreviewPreference,
        savePreference,
        getPreferenceForMember,
        resetAllPreferences,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme debe ser utilizado dentro de un ThemeProvider');
  }
  return context;
};
