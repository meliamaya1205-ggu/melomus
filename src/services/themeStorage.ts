import { ProfileThemePreference } from '../types/theme';

const STORAGE_KEY = 'nuestro_hogar_v1_theme_preferences';

export const DEFAULT_THEME_PREFERENCES: Record<string, ProfileThemePreference> = {
  mama: {
    memberId: 'mama',
    visualStyle: 'familiar',
    personalColor: 'rosa',
    updatedAt: new Date().toISOString(),
  },
  papa: {
    memberId: 'papa',
    visualStyle: 'minimalista',
    personalColor: 'azul',
    updatedAt: new Date().toISOString(),
  },
  annie: {
    memberId: 'annie',
    visualStyle: 'fantasia',
    personalColor: 'lila',
    updatedAt: new Date().toISOString(),
  },
  derek: {
    memberId: 'derek',
    visualStyle: 'aventuras',
    personalColor: 'azul',
    updatedAt: new Date().toISOString(),
  },
  axel: {
    memberId: 'axel',
    visualStyle: 'infantil',
    personalColor: 'verde',
    updatedAt: new Date().toISOString(),
  },
  family: {
    memberId: 'family',
    visualStyle: 'familiar',
    personalColor: 'rosa',
    updatedAt: new Date().toISOString(),
  },
};

export class ThemeStorageService {
  private cache: Record<string, ProfileThemePreference> | null = null;

  public getAll(): Record<string, ProfileThemePreference> {
    if (this.cache) return this.cache;

    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        const result = { ...DEFAULT_THEME_PREFERENCES, ...parsed };
        this.cache = result;
        return result;
      }
    } catch {
      // Ignore JSON parse error and fallback to defaults
    }

    const fallback = { ...DEFAULT_THEME_PREFERENCES };
    this.cache = fallback;
    this.saveAll(fallback);
    return fallback;
  }

  public getForMember(memberId: string, role: 'adult' | 'child' = 'adult'): ProfileThemePreference {
    const all = this.getAll();
    if (all[memberId]) {
      return all[memberId];
    }

    // Default for member according to role
    const fallback: ProfileThemePreference = {
      memberId,
      visualStyle: role === 'child' ? 'infantil' : 'familiar',
      personalColor: role === 'child' ? 'azul' : 'verde',
      updatedAt: new Date().toISOString(),
    };

    all[memberId] = fallback;
    this.saveAll(all);
    return fallback;
  }

  public save(pref: ProfileThemePreference): void {
    const all = this.getAll();
    all[pref.memberId] = {
      ...pref,
      updatedAt: new Date().toISOString(),
    };
    this.saveAll(all);
  }

  public reset(): void {
    this.cache = { ...DEFAULT_THEME_PREFERENCES };
    this.saveAll(this.cache);
  }

  private saveAll(all: Record<string, ProfileThemePreference>): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      this.cache = all;
    } catch {
      // In case quota is exceeded
    }
  }
}

export const themeStorage = new ThemeStorageService();
