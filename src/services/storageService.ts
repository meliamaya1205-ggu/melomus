import { AppCustomizationConfig } from '../types/config';
import { FamilyMember } from '../types/family';
import { Task } from '../types/tasks';
import { CalendarEvent } from '../types/calendar';
import { MedicalAppointment, Medication, MedicationDoseLog, PediatricQuery, VaccineRecord } from '../types/health';
import { ShoppingItem, CleaningTask, MaintenanceTask, HomeArea, DEFAULT_HOME_AREAS } from '../types/home';
import { Habit } from '../types/habits';
import { Reward, PointsHistoryEntry } from '../types/rewards';
import { Income, Expense, Bill, Debt, Budget, FinancialGoal } from '../types/finance';
import { ResetMission, FamilyResetSession } from '../types/reset';
import {
  CoupleCheckIn,
  CoupleConversation,
  CoupleDate,
  CoupleGesture,
  CoupleAgreement,
  CoupleSpiritualItem,
  CuquiTimeSession,
  CoupleMemory,
} from '../types/couple';
import {
  NotificationPreferencesState,
  AppReminder,
} from '../types/notifications';
import { ProfileThemePreference } from '../types/theme';
import { themeStorage } from './themeStorage';
import {
  initialConfig,
  initialMembers,
  initialTasks,
  initialEvents,
  initialAppointments,
  initialShoppingItems,
  initialCleaningTasks,
  initialMaintenanceTasks,
  initialHabits,
  initialRewards,
  initialPointsHistory,
  initialIncomes,
  initialExpenses,
  initialBills,
  initialDebts,
  initialBudgets,
  initialGoals,
  initialResetMissions,
  initialMedications,
  initialDoseLogs,
  initialPediatricQueries,
  initialVaccines,
  initialCoupleCheckIns,
  initialCoupleConversations,
  initialCoupleDates,
  initialCoupleGestures,
  initialCoupleAgreements,
  initialCoupleSpiritualItems,
  initialCuquiTimeSessions,
  initialCoupleMemories,
  initialNotificationPreferences,
  initialReminders,
} from './seedData';

const STORAGE_PREFIX = 'nuestro_hogar_v1_';

export interface FullAppState {
  config: AppCustomizationConfig;
  members: FamilyMember[];
  tasks: Task[];
  events: CalendarEvent[];
  appointments: MedicalAppointment[];
  shoppingItems: ShoppingItem[];
  cleaningTasks: CleaningTask[];
  maintenanceTasks: MaintenanceTask[];
  homeAreas: HomeArea[];
  habits: Habit[];
  rewards: Reward[];
  pointsHistory: PointsHistoryEntry[];
  incomes: Income[];
  expenses: Expense[];
  bills: Bill[];
  debts: Debt[];
  budgets: Budget[];
  goals: FinancialGoal[];
  resetMissions: ResetMission[];
  resetSession?: FamilyResetSession | null;
  medications: Medication[];
  doseLogs: MedicationDoseLog[];
  pediatricQueries: PediatricQuery[];
  vaccineRecords: VaccineRecord[];
  coupleCheckIns: CoupleCheckIn[];
  coupleConversations: CoupleConversation[];
  coupleDates: CoupleDate[];
  coupleGestures: CoupleGesture[];
  coupleAgreements: CoupleAgreement[];
  coupleSpiritualItems: CoupleSpiritualItem[];
  cuquiTimeSessions: CuquiTimeSession[];
  coupleMemories: CoupleMemory[];
  reminders: AppReminder[];
  notificationPreferences: NotificationPreferencesState;
  themePreferences?: Record<string, ProfileThemePreference>;
}

function getItem<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return defaultValue;
    return JSON.parse(raw) as T;
  } catch (e) {
    console.error(`Error loading key ${key} from storage:`, e);
    return defaultValue;
  }
}

function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error saving key ${key} to storage:`, e);
  }
}

export const storageService = {
  loadFullState(): FullAppState {
    const rawConfig = getItem<AppCustomizationConfig>('config', initialConfig);
    const mergedConfig: AppCustomizationConfig = {
      ...initialConfig,
      ...rawConfig,
      modules: {
        ...initialConfig.modules,
        ...(rawConfig?.modules || {}),
      },
    };

    if (mergedConfig.appName === 'Nuestro Hogar' || !mergedConfig.appName) {
      mergedConfig.appName = 'MELOMUS';
    }

    return {
      config: mergedConfig,
      members: getItem<FamilyMember[]>('members', initialMembers),
      tasks: getItem<Task[]>('tasks', initialTasks),
      events: getItem<CalendarEvent[]>('events', initialEvents),
      appointments: getItem<MedicalAppointment[]>('appointments', initialAppointments),
      shoppingItems: getItem<ShoppingItem[]>('shoppingItems', initialShoppingItems),
      cleaningTasks: getItem<CleaningTask[]>('cleaningTasks', initialCleaningTasks),
      maintenanceTasks: getItem<MaintenanceTask[]>('maintenanceTasks', initialMaintenanceTasks),
      homeAreas: getItem<HomeArea[]>('homeAreas', DEFAULT_HOME_AREAS),
      habits: getItem<Habit[]>('habits', initialHabits),
      rewards: getItem<Reward[]>('rewards', initialRewards),
      pointsHistory: getItem<PointsHistoryEntry[]>('pointsHistory', initialPointsHistory),
      incomes: getItem<Income[]>('incomes', initialIncomes),
      expenses: getItem<Expense[]>('expenses', initialExpenses),
      bills: getItem<Bill[]>('bills', initialBills),
      debts: getItem<Debt[]>('debts', initialDebts),
      budgets: getItem<Budget[]>('budgets', initialBudgets),
      goals: getItem<FinancialGoal[]>('goals', initialGoals),
      resetMissions: getItem<ResetMission[]>('resetMissions', initialResetMissions),
      resetSession: getItem<FamilyResetSession | null>('resetSession', null),
      medications: getItem<Medication[]>('medications', initialMedications),
      doseLogs: getItem<MedicationDoseLog[]>('doseLogs', initialDoseLogs),
      pediatricQueries: getItem<PediatricQuery[]>('pediatricQueries', initialPediatricQueries),
      vaccineRecords: getItem<VaccineRecord[]>('vaccineRecords', initialVaccines),
      coupleCheckIns: getItem<CoupleCheckIn[]>('coupleCheckIns', initialCoupleCheckIns),
      coupleConversations: getItem<CoupleConversation[]>('coupleConversations', initialCoupleConversations),
      coupleDates: getItem<CoupleDate[]>('coupleDates', initialCoupleDates),
      coupleGestures: getItem<CoupleGesture[]>('coupleGestures', initialCoupleGestures),
      coupleAgreements: getItem<CoupleAgreement[]>('coupleAgreements', initialCoupleAgreements),
      coupleSpiritualItems: getItem<CoupleSpiritualItem[]>('coupleSpiritualItems', initialCoupleSpiritualItems),
      cuquiTimeSessions: getItem<CuquiTimeSession[]>('cuquiTimeSessions', initialCuquiTimeSessions),
      coupleMemories: getItem<CoupleMemory[]>('coupleMemories', initialCoupleMemories),
      reminders: getItem<AppReminder[]>('reminders', initialReminders),
      notificationPreferences: getItem<NotificationPreferencesState>('notificationPreferences', initialNotificationPreferences),
      themePreferences: themeStorage.getAll(),
    };
  },

  saveStateKey<K extends keyof FullAppState>(key: K, data: FullAppState[K]): void {
    setItem(key, data);
  },

  resetToDemo(): FullAppState {
    const freshState: FullAppState = {
      config: initialConfig,
      members: initialMembers,
      tasks: initialTasks,
      events: initialEvents,
      appointments: initialAppointments,
      shoppingItems: initialShoppingItems,
      cleaningTasks: initialCleaningTasks,
      maintenanceTasks: initialMaintenanceTasks,
      homeAreas: DEFAULT_HOME_AREAS,
      habits: initialHabits,
      rewards: initialRewards,
      pointsHistory: initialPointsHistory,
      incomes: initialIncomes,
      expenses: initialExpenses,
      bills: initialBills,
      debts: initialDebts,
      budgets: initialBudgets,
      goals: initialGoals,
      resetMissions: initialResetMissions,
      resetSession: null,
      medications: initialMedications,
      doseLogs: initialDoseLogs,
      pediatricQueries: initialPediatricQueries,
      vaccineRecords: initialVaccines,
      coupleCheckIns: initialCoupleCheckIns,
      coupleConversations: initialCoupleConversations,
      coupleDates: initialCoupleDates,
      coupleGestures: initialCoupleGestures,
      coupleAgreements: initialCoupleAgreements,
      coupleSpiritualItems: initialCoupleSpiritualItems,
      cuquiTimeSessions: initialCuquiTimeSessions,
      coupleMemories: initialCoupleMemories,
      reminders: initialReminders,
      notificationPreferences: initialNotificationPreferences,
      themePreferences: themeStorage.getAll(),
    };

    themeStorage.reset();

    Object.keys(freshState).forEach((key) => {
      setItem(key, freshState[key as keyof FullAppState]);
    });

    return freshState;
  },

  exportJSON(): string {
    const state = this.loadFullState();
    const backupPayload = {
      _meta: {
        appName: 'MELOMUS',
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        description: 'Respaldo completo de datos familiares, hábitos, finanzas, salud y personalización',
      },
      ...state,
    };
    return JSON.stringify(backupPayload, null, 2);
  },

  importJSON(jsonString: string): FullAppState | null {
    try {
      // 1. Boundary & type validation
      if (typeof jsonString !== 'string' || !jsonString.trim()) {
        throw new Error('Contenido JSON vacío o no válido');
      }

      // Max payload limit (15MB) to protect localStorage quotas and memory
      if (jsonString.length > 15 * 1024 * 1024) {
        throw new Error('El archivo excede el tamaño máximo permitido (15MB)');
      }

      // 2. Parse with prototype pollution guard
      const data = JSON.parse(jsonString, (key, value) => {
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
          return undefined; // Strip forbidden prototype keys
        }
        return value;
      });

      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new Error('Estructura de datos raíz inválida');
      }

      // 3. Strict validation of critical core entities
      if (!Array.isArray(data.members) || data.members.length === 0) {
        throw new Error('El archivo de respaldo debe contener una lista válida de integrantes');
      }

      // Verify at least one adult exists so the family is never locked out of administration
      const hasAdultMember = data.members.some(
        (m: unknown) => typeof m === 'object' && m !== null && (m as { role?: string }).role === 'adult'
      );
      if (!hasAdultMember) {
        throw new Error('El archivo de respaldo debe incluir al menos un adulto para administrar el hogar');
      }

      // 4. Safe array extractor helper guaranteeing Array.isArray
      const safeArray = <T>(val: unknown, fallback: T[]): T[] => {
        if (!Array.isArray(val)) return fallback;
        // Basic element validity check
        return val.filter((item) => typeof item === 'object' && item !== null) as T[];
      };

      // 5. Clean merge with defaults
      const rawConfig = (typeof data.config === 'object' && data.config !== null) ? data.config : initialConfig;
      const mergedConfig: AppCustomizationConfig = {
        ...initialConfig,
        ...rawConfig,
        modules: {
          ...initialConfig.modules,
          ...(rawConfig.modules || {}),
        },
      };

      // Restore Theme Preferences if included in backup
      if (data.themePreferences && typeof data.themePreferences === 'object') {
        Object.values(data.themePreferences).forEach((pref: any) => {
          if (pref && typeof pref === 'object' && pref.memberId && pref.visualStyle && pref.personalColor) {
            themeStorage.save(pref);
          }
        });
      }

      const mergedState: FullAppState = {
        config: mergedConfig,
        members: safeArray(data.members, initialMembers),
        tasks: safeArray(data.tasks, initialTasks),
        events: safeArray(data.events, initialEvents),
        appointments: safeArray(data.appointments, initialAppointments),
        shoppingItems: safeArray(data.shoppingItems, initialShoppingItems),
        cleaningTasks: safeArray(data.cleaningTasks, initialCleaningTasks),
        maintenanceTasks: safeArray(data.maintenanceTasks, initialMaintenanceTasks),
        homeAreas: safeArray(data.homeAreas, DEFAULT_HOME_AREAS),
        habits: safeArray(data.habits, initialHabits),
        rewards: safeArray(data.rewards, initialRewards),
        pointsHistory: safeArray(data.pointsHistory, initialPointsHistory),
        incomes: safeArray(data.incomes, initialIncomes),
        expenses: safeArray(data.expenses, initialExpenses),
        bills: safeArray(data.bills, initialBills),
        debts: safeArray(data.debts, initialDebts),
        budgets: safeArray(data.budgets, initialBudgets),
        goals: safeArray(data.goals, initialGoals),
        resetMissions: safeArray(data.resetMissions, initialResetMissions),
        resetSession: data.resetSession || null,
        medications: safeArray(data.medications, initialMedications),
        doseLogs: safeArray(data.doseLogs, initialDoseLogs),
        pediatricQueries: safeArray(data.pediatricQueries, initialPediatricQueries),
        vaccineRecords: safeArray(data.vaccineRecords, initialVaccines),
        coupleCheckIns: safeArray(data.coupleCheckIns, initialCoupleCheckIns),
        coupleConversations: safeArray(data.coupleConversations, initialCoupleConversations),
        coupleDates: safeArray(data.coupleDates, initialCoupleDates),
        coupleGestures: safeArray(data.coupleGestures, initialCoupleGestures),
        coupleAgreements: safeArray(data.coupleAgreements, initialCoupleAgreements),
        coupleSpiritualItems: safeArray(data.coupleSpiritualItems, initialCoupleSpiritualItems),
        cuquiTimeSessions: safeArray(data.cuquiTimeSessions, initialCuquiTimeSessions),
        coupleMemories: safeArray(data.coupleMemories, initialCoupleMemories),
        reminders: safeArray(data.reminders, initialReminders),
        notificationPreferences: (typeof data.notificationPreferences === 'object' && data.notificationPreferences !== null)
          ? data.notificationPreferences
          : initialNotificationPreferences,
        themePreferences: themeStorage.getAll(),
      };

      // 6. Atomic save to localStorage
      Object.keys(mergedState).forEach((key) => {
        setItem(key, mergedState[key as keyof FullAppState]);
      });

      return mergedState;
    } catch (e) {
      console.error('Error importing backup:', e);
      return null;
    }
  },
};
