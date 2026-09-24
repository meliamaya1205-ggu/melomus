import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { AppCustomizationConfig, ModuleKey } from '../types/config';
import { FamilyMember, ActiveProfileId } from '../types/family';
import { Task } from '../types/tasks';
import { CalendarEvent } from '../types/calendar';
import { MedicalAppointment, Medication, MedicationDoseLog, PediatricQuery, VaccineRecord } from '../types/health';
import { ShoppingItem, CleaningTask, MaintenanceTask } from '../types/home';
import { Habit } from '../types/habits';
import { Reward, PointsHistoryEntry } from '../types/rewards';
import { Income, Expense, Bill, Debt, Budget, FinancialGoal } from '../types/finance';
import { ResetMission } from '../types/reset';
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
import { FullAppState } from '../services/storageService';
import { dataService, dataServiceManager } from '../services/dataAdapter';
import { AuthUser, FamilyAccount, DataMode } from '../types/auth';
import { authService } from '../services/authService';
import { getTodayString } from '../services/dateUtils';
import {
  NotificationPreferencesState,
  AdultNotificationPreferences,
  CategoryPreference,
  NotificationCategory,
  AppReminder,
  AppNotification,
} from '../types/notifications';
import { notificationService } from '../services/notificationService';

interface FamilyContextType {
  // Navigation & Active Profile
  currentTab: ModuleKey;
  setCurrentTab: (tab: ModuleKey) => void;
  activeProfileId: ActiveProfileId;
  setActiveProfileId: (id: ActiveProfileId) => void;
  activeMember?: FamilyMember;
  isAdultView: boolean;
  isKidView: boolean;

  // Customization & Labels
  config: AppCustomizationConfig;
  updateConfig: (newConfig: Partial<AppCustomizationConfig>) => void;
  getModuleTitle: (key: ModuleKey) => string;
  getCategoryName: (type: 'task' | 'expense' | 'income' | 'event' | 'appointment', key: string) => string;
  getMemberName: (id: string) => string;
  getMember: (id: string) => FamilyMember | undefined;

  // Members
  members: FamilyMember[];
  addMember: (member: Omit<FamilyMember, 'id' | 'points'>) => void;
  updateMember: (id: string, updates: Partial<FamilyMember>) => void;

  // Tasks
  tasks: Task[];
  addTask: (task: Omit<Task, 'id' | 'createdAt'>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleTaskComplete: (id: string) => void;

  // Calendar
  events: CalendarEvent[];
  addEvent: (event: Omit<CalendarEvent, 'id'>) => void;
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => void;
  deleteEvent: (id: string) => void;

  // Health & Medications
  appointments: MedicalAppointment[];
  addAppointment: (app: Omit<MedicalAppointment, 'id'>) => void;
  updateAppointment: (id: string, updates: Partial<MedicalAppointment>) => void;
  deleteAppointment: (id: string) => void;
  medications: Medication[];
  addMedication: (med: Omit<Medication, 'id' | 'createdAt'>) => void;
  updateMedication: (id: string, updates: Partial<Medication>) => void;
  deleteMedication: (id: string) => void;
  doseLogs: MedicationDoseLog[];
  logDose: (log: Omit<MedicationDoseLog, 'id'>) => void;
  pediatricQueries: PediatricQuery[];
  addPediatricQuery: (q: Omit<PediatricQuery, 'id' | 'createdAt'>) => void;
  togglePediatricQuery: (id: string) => void;
  deletePediatricQuery: (id: string) => void;
  vaccineRecords: VaccineRecord[];
  toggleVaccineStatus: (id: string) => void;
  addVaccineRecord: (vac: Omit<VaccineRecord, 'id'>) => void;

  // Home
  shoppingItems: ShoppingItem[];
  addShoppingItem: (item: Omit<ShoppingItem, 'id' | 'createdAt'>) => void;
  toggleShoppingItem: (id: string) => void;
  deleteShoppingItem: (id: string) => void;
  clearCompletedShopping: () => void;
  cleaningTasks: CleaningTask[];
  toggleCleaningTask: (id: string) => void;
  maintenanceTasks: MaintenanceTask[];
  toggleMaintenanceTask: (id: string) => void;

  // Habits & Rewards
  habits: Habit[];
  toggleHabitForToday: (habitId: string, dateStr?: string) => void;
  addHabit: (habit: Omit<Habit, 'id' | 'completedDates'>) => void;
  updateHabit: (id: string, updates: Partial<Habit>) => void;
  deleteHabit: (id: string) => void;
  toggleHabitActive: (id: string) => void;
  rewards: Reward[];
  addReward: (reward: Omit<Reward, 'id'>) => void;
  redeemReward: (rewardId: string, childId: string) => boolean;
  pointsHistory: PointsHistoryEntry[];

  // Finances (Adults)
  incomes: Income[];
  addIncome: (inc: Omit<Income, 'id'>) => void;
  deleteIncome: (id: string) => void;
  expenses: Expense[];
  addExpense: (exp: Omit<Expense, 'id'>) => void;
  deleteExpense: (id: string) => void;
  bills: Bill[];
  addBill: (bill: Omit<Bill, 'id'>) => void;
  toggleBillPaid: (id: string) => void;
  deleteBill: (id: string) => void;
  debts: Debt[];
  addDebt: (debt: Omit<Debt, 'id'>) => void;
  updateDebtBalance: (id: string, newBalance: number) => void;
  budgets: Budget[];
  updateBudget: (categoryKey: string, monthlyLimit: number) => void;
  goals: FinancialGoal[];
  addGoal: (goal: Omit<FinancialGoal, 'id'>) => void;
  contributeToGoal: (goalId: string, amount: number) => void;

  // Family Reset
  resetMissions: ResetMission[];
  toggleResetMission: (id: string) => void;
  resetMissionsStatus: () => void;

  // Couple Module (Mamá & Papá)
  coupleCheckIns: CoupleCheckIn[];
  addCoupleCheckIn: (checkIn: Omit<CoupleCheckIn, 'id' | 'createdAt'>) => void;
  coupleConversations: CoupleConversation[];
  addCoupleConversation: (conv: Omit<CoupleConversation, 'id'>) => void;
  updateCoupleConversation: (id: string, updates: Partial<CoupleConversation>) => void;
  deleteCoupleConversation: (id: string) => void;
  coupleDates: CoupleDate[];
  addCoupleDate: (dateItem: Omit<CoupleDate, 'id'>) => void;
  updateCoupleDate: (id: string, updates: Partial<CoupleDate>) => void;
  deleteCoupleDate: (id: string) => void;
  coupleGestures: CoupleGesture[];
  recordCoupleGesture: (gestureId: string, performedBy?: string) => void;
  coupleAgreements: CoupleAgreement[];
  addCoupleAgreement: (agr: Omit<CoupleAgreement, 'id'>) => void;
  updateCoupleAgreement: (id: string, updates: Partial<CoupleAgreement>) => void;
  deleteCoupleAgreement: (id: string) => void;
  coupleSpiritualItems: CoupleSpiritualItem[];
  addCoupleSpiritualItem: (item: Omit<CoupleSpiritualItem, 'id'>) => void;
  toggleCoupleSpiritualItem: (id: string) => void;
  deleteCoupleSpiritualItem: (id: string) => void;
  cuquiTimeSessions: CuquiTimeSession[];
  addCuquiTimeSession: (session: Omit<CuquiTimeSession, 'id'>) => void;
  updateCuquiTimeSession: (id: string, updates: Partial<CuquiTimeSession>) => void;
  deleteCuquiTimeSession: (id: string) => void;
  coupleMemories: CoupleMemory[];
  addCoupleMemory: (mem: Omit<CoupleMemory, 'id'>) => void;
  deleteCoupleMemory: (id: string) => void;

  // Modals & System
  quickActionModalOpen: boolean;
  setQuickActionModalOpen: (open: boolean) => void;
  familyResetModalOpen: boolean;
  setFamilyResetModalOpen: (open: boolean) => void;
  notificationDrawerOpen: boolean;
  setNotificationDrawerOpen: (open: boolean) => void;
  resetAllToDemo: () => void;
  importBackup: (jsonStr: string) => boolean;
  exportBackup: () => string;

  // Storage Adapter & Co-administration (Phase 1 & 2)
  dataMode: DataMode;
  currentUser: AuthUser | null;
  familyAccount: FamilyAccount | null;
  switchDataMode: (mode: DataMode) => void;
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  authModalMode: 'signin' | 'signup' | 'reset' | 'claim_invite';
  setAuthModalMode: (mode: 'signin' | 'signup' | 'reset' | 'claim_invite') => void;
  inviteToken: string | null;
  setInviteToken: (token: string | null) => void;
  linkCoAdminModalOpen: boolean;
  setLinkCoAdminModalOpen: (open: boolean) => void;
  openAuthModal: (mode?: 'signin' | 'signup' | 'reset' | 'claim_invite', token?: string) => void;
  openLinkCoAdminModal: () => void;
  logoutAuthUser: () => Promise<void>;
  isSupabaseAuthActive: boolean;
  isAuthLoading: boolean;
  authenticatedUser: AuthUser | null;
  handleAuthSuccess: (user: AuthUser) => void;

  // Reminders & Notifications
  reminders: AppReminder[];
  addReminder: (rem: Omit<AppReminder, 'id' | 'createdAt'>) => void;
  updateReminder: (id: string, updates: Partial<AppReminder>) => void;
  deleteReminder: (id: string) => void;
  toggleReminderCompleted: (id: string) => void;
  notificationPreferences: NotificationPreferencesState;
  updateNotificationPreferences: (
    memberId: 'mama' | 'papa',
    updates: Partial<AdultNotificationPreferences>
  ) => void;
  updateCategoryPreference: (
    memberId: 'mama' | 'papa',
    category: NotificationCategory,
    updates: Partial<CategoryPreference>
  ) => void;
  activeNotifications: AppNotification[];
  markNotificationRead: (id: string) => void;
  clearAllNotifications: () => void;
  testNotification: (profileId: 'mama' | 'papa') => Promise<boolean>;
}

const FamilyContext = createContext<FamilyContextType | null>(null);

export const FamilyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [dataMode, setDataMode] = useState<DataMode>(dataService.mode);
  const [state, setState] = useState<FullAppState>(() => dataService.loadFullState());
  const [currentTab, setCurrentTab] = useState<ModuleKey>('dashboard');
  const [activeProfileId, setActiveProfileId] = useState<ActiveProfileId>('mama');
  const [quickActionModalOpen, setQuickActionModalOpen] = useState(false);
  const [familyResetModalOpen, setFamilyResetModalOpen] = useState(false);
  const [notificationDrawerOpen, setNotificationDrawerOpen] = useState(false);
  const [activeNotifications, setActiveNotifications] = useState<AppNotification[]>([]);

  // Auth & Co-administration (Phase 2)
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup' | 'reset' | 'claim_invite'>('signin');
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [linkCoAdminModalOpen, setLinkCoAdminModalOpen] = useState(false);
  const [authenticatedUser, setAuthenticatedUser] = useState<AuthUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  const isSyncingFromRemoteRef = useRef(false);

  // Sync Supabase Auth session on mount and initialize Realtime cloud session
  useEffect(() => {
    authService.getCurrentUser().then(async (user) => {
      if (user) {
        setAuthenticatedUser(user);
        setActiveProfileId(user.relationship);
        if (authService.isConfigured()) {
          dataServiceManager.useCloudSync();
          setDataMode('cloud_sync');
          const family = dataService.getFamilyAccount() || {
            id: user.familyId,
            name: 'Nuestra Familia',
            isBothCoAdminsActive: true,
            createdAt: new Date().toISOString(),
          };
          if (dataService.initCloudSession) {
            const cloudState = await dataService.initCloudSession(user, family);
            isSyncingFromRemoteRef.current = true;
            setState(cloudState);
            setTimeout(() => {
              isSyncingFromRemoteRef.current = false;
            }, 60);
          }
        }
      }
      setIsAuthLoading(false);
    }).catch(() => {
      setIsAuthLoading(false);
    });

    if (authService.isConfigured()) {
      const { unsubscribe } = authService.onAuthStateChange(async (user) => {
        setAuthenticatedUser(user);
        if (user) {
          setActiveProfileId(user.relationship);
          dataServiceManager.useCloudSync();
          setDataMode('cloud_sync');
          const family = dataService.getFamilyAccount() || {
            id: user.familyId,
            name: 'Nuestra Familia',
            isBothCoAdminsActive: true,
            createdAt: new Date().toISOString(),
          };
          if (dataService.initCloudSession) {
            const cloudState = await dataService.initCloudSession(user, family);
            isSyncingFromRemoteRef.current = true;
            setState(cloudState);
            setTimeout(() => {
              isSyncingFromRemoteRef.current = false;
            }, 60);
          }
        } else {
          dataService.disconnectRealtime?.();
          dataServiceManager.useLocalDemo();
          setDataMode('local_demo');
        }
        setIsAuthLoading(false);
      });

      return () => unsubscribe();
    }
  }, []);

  // Listen to remote changes across all devices via Realtime
  useEffect(() => {
    if (dataService.onRemoteChange) {
      const unsub = dataService.onRemoteChange((key, data, meta) => {
        isSyncingFromRemoteRef.current = true;
        setState((prev) => ({
          ...prev,
          [key]: data,
        }));
        setTimeout(() => {
          isSyncingFromRemoteRef.current = false;
        }, 60);

        // Inbound notifications for actions authored by the other adult
        if (meta?.authorId && authenticatedUser && meta.authorId !== authenticatedUser.id && meta.eventType !== 'DELETE') {
          const currentAdultKey: 'mama' | 'papa' = authenticatedUser.relationship === 'papa' ? 'papa' : 'mama';
          const partnerName = currentAdultKey === 'mama' ? 'Papá' : 'Mamá';
          const prefs = state.notificationPreferences?.[currentAdultKey];

          let notifCategory: NotificationCategory | null = null;
          let targetMemberId: string = currentAdultKey;
          let notifTitle = '🔔 Aviso de MELOMUS';
          let notifBody = `Nueva actualización de ${partnerName}`;

          if (key === 'tasks') {
            const task = (data as Task[]).find((t) => t.id === meta.entityId);
            if (task) {
              notifCategory = 'tasks';
              targetMemberId = task.responsibleId;
              notifTitle = '📋 Nueva tarea asignada';
              notifBody = `${task.title} (asignada por ${partnerName})`;
            }
          } else if (key === 'events') {
            const ev = (data as CalendarEvent[]).find((e) => e.id === meta.entityId);
            if (ev) {
              notifCategory = 'events';
              targetMemberId = ev.memberId || 'family';
              notifTitle = '📅 Nuevo evento familiar';
              notifBody = `${ev.title} (${ev.date}) - Agregado por ${partnerName}`;
            }
          } else if (key === 'habits') {
            const hab = (data as Habit[]).find((h) => h.id === meta.entityId);
            if (hab) {
              notifCategory = 'habits';
              targetMemberId = hab.memberId || 'family';
              notifTitle = '🌱 Hábito familiar';
              notifBody = `${hab.title} - Actualizado por ${partnerName}`;
            }
          } else if (key === 'medications') {
            const med = (data as any[]).find((m) => m.id === meta.entityId);
            notifCategory = 'medications';
            targetMemberId = 'family';
            notifTitle = '💊 Indicación médica';
            notifBody = med?.title ? `${med.title} - Registrado por ${partnerName}` : `Nuevo medicamento por ${partnerName}`;
          } else if (key === 'appointments') {
            const appt = (data as any[]).find((a) => a.id === meta.entityId);
            notifCategory = 'appointments';
            targetMemberId = 'family';
            notifTitle = '🏥 Cita médica';
            notifBody = appt?.title ? `${appt.title} - Agendada por ${partnerName}` : `Nueva cita médica por ${partnerName}`;
          } else if (key === 'cuquiTimeSessions') {
            notifCategory = 'cuquiTime';
            targetMemberId = currentAdultKey;
            notifTitle = '💕 Tiempo de pareja';
            notifBody = 'Momento especial reservado en MELOMUS.';
          } else if (
            key === 'coupleDates' ||
            key === 'coupleConversations' ||
            key === 'coupleCheckIns' ||
            key === 'coupleGestures'
          ) {
            notifCategory = 'couple';
            targetMemberId = currentAdultKey;
            notifTitle = '💕 Momento de pareja';
            notifBody = `Nuevo momento de conexión propuesto por ${partnerName}`;
          } else if (key === 'shoppingItems') {
            notifCategory = 'shopping';
            targetMemberId = 'family';
            notifTitle = '🛒 Lista de compras';
            notifBody = `Lista de compras actualizada por ${partnerName}`;
          } else if (
            key === 'cleaningTasks' ||
            key === 'maintenanceTasks' ||
            key === 'resetMissions'
          ) {
            notifCategory = 'reminders';
            targetMemberId = 'family';
            notifTitle = '🏡 Tarea del hogar';
            notifBody = `Actualización del hogar registrada por ${partnerName}`;
          } else if (key === 'expenses' || key === 'bills' || key === 'debts') {
            notifCategory = 'finance';
            targetMemberId = currentAdultKey;
            notifTitle = '💰 Movimiento financiero';
            notifBody = `Nuevo registro de finanzas compartido por ${partnerName}`;
          }

          if (notifCategory) {
            const shouldNotify = notificationService.shouldNotifyUser({
              targetMemberId,
              authorId: meta.authorId,
              currentUserId: authenticatedUser.id,
              currentMemberRole: currentAdultKey,
              category: notifCategory,
              preferences: prefs,
            });

            if (shouldNotify.allow) {
              let finalTitle = notifTitle;
              let finalBody = notifBody;

              if (prefs?.discreteMode) {
                const discrete = notificationService.formatDiscreteText(notifCategory, notifTitle, notifBody);
                finalTitle = discrete.title;
                finalBody = discrete.body;
              }

              const newNotif: AppNotification = {
                id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                title: finalTitle,
                body: finalBody,
                category: notifCategory,
                targetMemberId,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                read: false,
                isDiscrete: prefs?.discreteMode,
              };

              setActiveNotifications((prev) => [newNotif, ...prev]);

              notificationService.showNotification({
                title: finalTitle,
                body: finalBody,
                category: notifCategory,
                isDiscrete: prefs?.discreteMode,
              });
            }
          }
        }
      });

      return () => unsub();
    }
  }, [authenticatedUser, activeProfileId, state.notificationPreferences]);

  // Detect URL parameter ?vincular=... on startup
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('vincular') || params.get('token');
      if (token) {
        setInviteToken(token);
        setAuthModalMode('claim_invite');
        setAuthModalOpen(true);
      }
    }
  }, []);

  const openAuthModal = (mode: 'signin' | 'signup' | 'reset' | 'claim_invite' = 'signin', token?: string) => {
    setAuthModalMode(mode);
    if (token) setInviteToken(token);
    setAuthModalOpen(true);
  };

  const openLinkCoAdminModal = () => {
    setLinkCoAdminModalOpen(true);
  };

  const logoutAuthUser = async () => {
    dataService.disconnectRealtime?.();
    await authService.signOut();
    dataServiceManager.useLocalDemo();
    setDataMode('local_demo');
    setAuthenticatedUser(null);
    setActiveProfileId('mama');
    setState(dataService.loadFullState());
  };

  const handleAuthSuccess = async (user: AuthUser) => {
    setAuthenticatedUser(user);
    setActiveProfileId(user.relationship);
    if (authService.isConfigured()) {
      dataServiceManager.useCloudSync();
      setDataMode('cloud_sync');
      const family = dataService.getFamilyAccount() || {
        id: user.familyId,
        name: 'Nuestra Familia',
        isBothCoAdminsActive: true,
        createdAt: new Date().toISOString(),
      };
      if (dataService.initCloudSession) {
        const cloudState = await dataService.initCloudSession(user, family);
        isSyncingFromRemoteRef.current = true;
        setState(cloudState);
        setTimeout(() => {
          isSyncingFromRemoteRef.current = false;
        }, 60);
      }
    }
    setAuthModalOpen(false);
  };

  const activeMember = state.members.find((m) => m.id === activeProfileId);
  const isAdultView = !activeMember || activeMember.role === 'adult' || activeProfileId === 'family';
  const isKidView = !!activeMember && activeMember.role === 'child';

  // Save changes to storage whenever relevant state updates (with remote echo-loop guard)
  useEffect(() => {
    if (isSyncingFromRemoteRef.current) return;
    dataService.saveStateKey('config', state.config);
  }, [state.config]);

  useEffect(() => {
    if (isSyncingFromRemoteRef.current) return;
    dataService.saveStateKey('members', state.members);
  }, [state.members]);

  useEffect(() => {
    if (isSyncingFromRemoteRef.current) return;
    dataService.saveStateKey('tasks', state.tasks);
  }, [state.tasks]);

  useEffect(() => {
    if (isSyncingFromRemoteRef.current) return;
    dataService.saveStateKey('events', state.events);
  }, [state.events]);

  useEffect(() => {
    if (isSyncingFromRemoteRef.current) return;
    dataService.saveStateKey('appointments', state.appointments);
  }, [state.appointments]);

  useEffect(() => {
    if (isSyncingFromRemoteRef.current) return;
    dataService.saveStateKey('shoppingItems', state.shoppingItems);
  }, [state.shoppingItems]);

  useEffect(() => {
    if (isSyncingFromRemoteRef.current) return;
    dataService.saveStateKey('cleaningTasks', state.cleaningTasks);
  }, [state.cleaningTasks]);

  useEffect(() => {
    if (isSyncingFromRemoteRef.current) return;
    dataService.saveStateKey('maintenanceTasks', state.maintenanceTasks);
  }, [state.maintenanceTasks]);

  useEffect(() => {
    if (isSyncingFromRemoteRef.current) return;
    dataService.saveStateKey('habits', state.habits);
  }, [state.habits]);

  useEffect(() => {
    if (isSyncingFromRemoteRef.current) return;
    dataService.saveStateKey('rewards', state.rewards);
  }, [state.rewards]);

  useEffect(() => {
    if (isSyncingFromRemoteRef.current) return;
    dataService.saveStateKey('pointsHistory', state.pointsHistory);
  }, [state.pointsHistory]);

  useEffect(() => {
    if (isSyncingFromRemoteRef.current) return;
    dataService.saveStateKey('incomes', state.incomes);
  }, [state.incomes]);

  useEffect(() => {
    if (isSyncingFromRemoteRef.current) return;
    dataService.saveStateKey('expenses', state.expenses);
  }, [state.expenses]);

  useEffect(() => {
    if (isSyncingFromRemoteRef.current) return;
    dataService.saveStateKey('bills', state.bills);
  }, [state.bills]);

  useEffect(() => {
    if (isSyncingFromRemoteRef.current) return;
    dataService.saveStateKey('debts', state.debts);
  }, [state.debts]);

  useEffect(() => {
    if (isSyncingFromRemoteRef.current) return;
    dataService.saveStateKey('budgets', state.budgets);
  }, [state.budgets]);

  useEffect(() => {
    if (isSyncingFromRemoteRef.current) return;
    dataService.saveStateKey('goals', state.goals);
  }, [state.goals]);

  useEffect(() => {
    if (isSyncingFromRemoteRef.current) return;
    dataService.saveStateKey('resetMissions', state.resetMissions);
  }, [state.resetMissions]);

  useEffect(() => {
    if (isSyncingFromRemoteRef.current) return;
    dataService.saveStateKey('medications', state.medications);
  }, [state.medications]);

  useEffect(() => {
    if (isSyncingFromRemoteRef.current) return;
    dataService.saveStateKey('doseLogs', state.doseLogs);
  }, [state.doseLogs]);

  useEffect(() => {
    if (isSyncingFromRemoteRef.current) return;
    dataService.saveStateKey('pediatricQueries', state.pediatricQueries);
  }, [state.pediatricQueries]);

  useEffect(() => {
    if (isSyncingFromRemoteRef.current) return;
    dataService.saveStateKey('vaccineRecords', state.vaccineRecords);
  }, [state.vaccineRecords]);

  useEffect(() => {
    if (isSyncingFromRemoteRef.current) return;
    dataService.saveStateKey('coupleCheckIns', state.coupleCheckIns);
  }, [state.coupleCheckIns]);

  useEffect(() => {
    if (isSyncingFromRemoteRef.current) return;
    dataService.saveStateKey('coupleConversations', state.coupleConversations);
  }, [state.coupleConversations]);

  useEffect(() => {
    if (isSyncingFromRemoteRef.current) return;
    dataService.saveStateKey('coupleDates', state.coupleDates);
  }, [state.coupleDates]);

  useEffect(() => {
    if (isSyncingFromRemoteRef.current) return;
    dataService.saveStateKey('coupleGestures', state.coupleGestures);
  }, [state.coupleGestures]);

  useEffect(() => {
    if (isSyncingFromRemoteRef.current) return;
    dataService.saveStateKey('coupleAgreements', state.coupleAgreements);
  }, [state.coupleAgreements]);

  useEffect(() => {
    if (isSyncingFromRemoteRef.current) return;
    dataService.saveStateKey('coupleSpiritualItems', state.coupleSpiritualItems);
  }, [state.coupleSpiritualItems]);

  useEffect(() => {
    if (isSyncingFromRemoteRef.current) return;
    dataService.saveStateKey('cuquiTimeSessions', state.cuquiTimeSessions);
  }, [state.cuquiTimeSessions]);

  useEffect(() => {
    if (isSyncingFromRemoteRef.current) return;
    dataService.saveStateKey('coupleMemories', state.coupleMemories);
  }, [state.coupleMemories]);

  useEffect(() => {
    if (isSyncingFromRemoteRef.current) return;
    dataService.saveStateKey('reminders', state.reminders);
  }, [state.reminders]);

  useEffect(() => {
    if (isSyncingFromRemoteRef.current) return;
    dataService.saveStateKey('notificationPreferences', state.notificationPreferences);
  }, [state.notificationPreferences]);

  // Initial Service Worker registration & Web Push subscription if permission granted
  useEffect(() => {
    notificationService.registerServiceWorker().then(() => {
      const family = dataService.getFamilyAccount();
      if (authenticatedUser?.id && family?.id) {
        if (notificationService.getPermissionStatus() === 'granted') {
          notificationService.subscribeToPush().then((sub) => {
            if (sub) {
              notificationService.savePushSubscription(authenticatedUser.id, family.id, sub);
            }
          });
        }
      }
    });
  }, [authenticatedUser?.id]);

  // Periodic reminder checking (every 60s and on state/profile changes)
  useEffect(() => {
    const checkReminders = () => {
      const isAdult = activeProfileId === 'mama' || activeProfileId === 'papa' || activeProfileId === 'family';
      const adultKey = activeProfileId === 'papa' ? 'papa' : 'mama';
      const prefs = state.notificationPreferences?.[adultKey];

      state.reminders.forEach((rem) => {
        if (rem.completed) return;

        // Privacy check: If kid view, only show reminders assigned to this kid
        if (!isAdult && rem.responsibleId !== activeProfileId) return;

        // Privacy check: If adult view, don't show private items of the other adult
        if (
          isAdult &&
          rem.isPrivate &&
          rem.responsibleId !== adultKey &&
          rem.responsibleId !== 'both' &&
          rem.responsibleId !== 'family'
        ) {
          return;
        }

        // Check if due according to date, time and anticipation
        if (notificationService.isDue(rem.date, rem.time, rem.anticipation)) {
          setActiveNotifications((prev) => {
            const exists = prev.some((n) => n.reminderId === rem.id);
            if (exists) return prev;

            const shouldNotify = notificationService.shouldNotifyUser({
              targetMemberId: rem.responsibleId,
              currentMemberRole: adultKey,
              category: rem.category,
              preferences: prefs,
            });

            if (shouldNotify.allow) {
              notificationService.showNotification({
                title: rem.title,
                body: rem.notes || 'Tienes un recordatorio pendiente en MELOMUS',
                category: rem.category,
                isDiscrete: prefs?.discreteMode,
              });
            }

            const newNotification: AppNotification = {
              id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              title:
                prefs?.discreteMode && rem.category
                  ? notificationService.formatDiscreteText(rem.category, rem.title).title
                  : rem.title,
              body:
                prefs?.discreteMode && rem.category
                  ? notificationService.formatDiscreteText(rem.category, rem.title, rem.notes).body
                  : rem.notes || 'Recordatorio activo',
              category: rem.category,
              targetMemberId: rem.responsibleId,
              timestamp: new Date().toISOString(),
              read: false,
              isDiscrete: prefs?.discreteMode,
              reminderId: rem.id,
            };

            return [newNotification, ...prev];
          });
        }
      });
    };

    checkReminders();
    const interval = setInterval(checkReminders, 60000);
    return () => clearInterval(interval);
  }, [state.reminders, state.notificationPreferences, activeProfileId]);

  // Labels & Customization resolvers
  const getModuleTitle = (key: ModuleKey): string => {
    return state.config.modules[key]?.displayName || key;
  };

  const getCategoryName = (
    type: 'task' | 'expense' | 'income' | 'event' | 'appointment',
    key: string
  ): string => {
    if (type === 'task') {
      const found = state.config.taskCategories.find((c) => c.technicalKey === key);
      return found ? found.displayName : key;
    }
    if (type === 'expense') {
      const found = state.config.expenseCategories.find((c) => c.technicalKey === key);
      return found ? found.displayName : key;
    }
    if (type === 'income') {
      const found = state.config.incomeSources.find((c) => c.technicalKey === key);
      return found ? found.displayName : key;
    }
    if (type === 'event') {
      const found = state.config.eventTypes.find((c) => c.technicalKey === key);
      return found ? found.displayName : key;
    }
    if (type === 'appointment') {
      const found = state.config.appointmentTypes.find((c) => c.technicalKey === key);
      return found ? found.displayName : key;
    }
    return key;
  };

  const getMemberName = (id: string): string => {
    if (id === 'both') return 'Mamá y Papá';
    if (id === 'family') return 'Toda la Familia';
    const found = state.members.find((m) => m.id === id);
    return found ? found.name : id;
  };

  const getMember = (id: string): FamilyMember | undefined => {
    return state.members.find((m) => m.id === id);
  };

  const updateConfig = (newConfig: Partial<AppCustomizationConfig>) => {
    setState((prev) => ({
      ...prev,
      config: { ...prev.config, ...newConfig },
    }));
  };

  // Members
  const addMember = (member: Omit<FamilyMember, 'id' | 'points'>) => {
    const id = 'mem_' + Date.now();
    const newMember: FamilyMember = { ...member, id, points: 0 };
    setState((prev) => ({ ...prev, members: [...prev.members, newMember] }));
  };

  const updateMember = (id: string, updates: Partial<FamilyMember>) => {
    setState((prev) => ({
      ...prev,
      members: prev.members.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    }));
  };

  // Tasks
  const addTask = (taskData: Omit<Task, 'id' | 'createdAt'>) => {
    const id = 't_' + Date.now();
    const newTask: Task = {
      ...taskData,
      id,
      createdAt: getTodayString(),
    };
    setState((prev) => ({ ...prev, tasks: [newTask, ...prev.tasks] }));
  };

  const updateTask = (id: string, updates: Partial<Task>) => {
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }));
  };

  const deleteTask = (id: string) => {
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((t) => t.id !== id),
    }));
  };

  const toggleTaskComplete = (id: string) => {
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => {
        if (t.id === id) {
          const isDone = t.status === 'completed';
          return {
            ...t,
            status: isDone ? 'pending' : 'completed',
            completedAt: isDone ? undefined : getTodayString(),
          };
        }
        return t;
      }),
    }));
  };

  // Calendar
  const addEvent = (eventData: Omit<CalendarEvent, 'id'>) => {
    const id = 'ev_' + Date.now();
    setState((prev) => ({ ...prev, events: [...prev.events, { ...eventData, id }] }));
  };

  const updateEvent = (id: string, updates: Partial<CalendarEvent>) => {
    setState((prev) => ({
      ...prev,
      events: prev.events.map((e) => (e.id === id ? { ...e, ...updates } : e)),
    }));
  };

  const deleteEvent = (id: string) => {
    setState((prev) => ({
      ...prev,
      events: prev.events.filter((e) => e.id !== id),
    }));
  };

  // Health
  const addAppointment = (appData: Omit<MedicalAppointment, 'id'>) => {
    const id = 'app_' + Date.now();
    setState((prev) => ({ ...prev, appointments: [...prev.appointments, { ...appData, id }] }));
  };

  const updateAppointment = (id: string, updates: Partial<MedicalAppointment>) => {
    setState((prev) => ({
      ...prev,
      appointments: prev.appointments.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    }));
  };

  const deleteAppointment = (id: string) => {
    setState((prev) => ({
      ...prev,
      appointments: prev.appointments.filter((a) => a.id !== id),
    }));
  };

  // Medications
  const addMedication = (medData: Omit<Medication, 'id' | 'createdAt'>) => {
    const id = 'med_' + Date.now();
    const newMed: Medication = {
      ...medData,
      id,
      createdAt: getTodayString(),
    };
    setState((prev) => ({ ...prev, medications: [newMed, ...prev.medications] }));
  };

  const updateMedication = (id: string, updates: Partial<Medication>) => {
    setState((prev) => ({
      ...prev,
      medications: prev.medications.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    }));
  };

  const deleteMedication = (id: string) => {
    setState((prev) => ({
      ...prev,
      medications: prev.medications.filter((m) => m.id !== id),
    }));
  };

  const logDose = (logData: Omit<MedicationDoseLog, 'id'>) => {
    const id = 'dose_' + Date.now();
    const newLog: MedicationDoseLog = { ...logData, id };
    setState((prev) => {
      const existingIdx = prev.doseLogs.findIndex(
        (l) =>
          l.medicationId === logData.medicationId &&
          l.date === logData.date &&
          l.scheduledTime === logData.scheduledTime
      );
      if (existingIdx >= 0) {
        const updated = [...prev.doseLogs];
        updated[existingIdx] = newLog;
        return { ...prev, doseLogs: updated };
      }
      return { ...prev, doseLogs: [newLog, ...prev.doseLogs] };
    });
  };

  const addPediatricQuery = (qData: Omit<PediatricQuery, 'id' | 'createdAt'>) => {
    const id = 'query_' + Date.now();
    const newQ: PediatricQuery = { ...qData, id, createdAt: getTodayString() };
    setState((prev) => ({ ...prev, pediatricQueries: [newQ, ...prev.pediatricQueries] }));
  };

  const togglePediatricQuery = (id: string) => {
    setState((prev) => ({
      ...prev,
      pediatricQueries: prev.pediatricQueries.map((q) =>
        q.id === id ? { ...q, status: q.status === 'pending' ? 'resolved' : 'pending' } : q
      ),
    }));
  };

  const deletePediatricQuery = (id: string) => {
    setState((prev) => ({
      ...prev,
      pediatricQueries: prev.pediatricQueries.filter((q) => q.id !== id),
    }));
  };

  const toggleVaccineStatus = (id: string) => {
    setState((prev) => ({
      ...prev,
      vaccineRecords: prev.vaccineRecords.map((v) => {
        if (v.id === id) {
          const isApplied = v.status === 'applied';
          return {
            ...v,
            status: isApplied ? 'upcoming' : 'applied',
            appliedDate: isApplied ? undefined : getTodayString(),
          };
        }
        return v;
      }),
    }));
  };

  const addVaccineRecord = (vacData: Omit<VaccineRecord, 'id'>) => {
    const id = 'vac_' + Date.now();
    setState((prev) => ({ ...prev, vaccineRecords: [...prev.vaccineRecords, { ...vacData, id }] }));
  };

  // Home (Shopping, Cleaning, Maintenance)
  const addShoppingItem = (itemData: Omit<ShoppingItem, 'id' | 'createdAt'>) => {
    const id = 's_' + Date.now();
    const newItem: ShoppingItem = {
      ...itemData,
      id,
      createdAt: getTodayString(),
    };
    setState((prev) => ({ ...prev, shoppingItems: [newItem, ...prev.shoppingItems] }));
  };

  const toggleShoppingItem = (id: string) => {
    setState((prev) => ({
      ...prev,
      shoppingItems: prev.shoppingItems.map((s) =>
        s.id === id ? { ...s, completed: !s.completed } : s
      ),
    }));
  };

  const deleteShoppingItem = (id: string) => {
    setState((prev) => ({
      ...prev,
      shoppingItems: prev.shoppingItems.filter((s) => s.id !== id),
    }));
  };

  const clearCompletedShopping = () => {
    setState((prev) => ({
      ...prev,
      shoppingItems: prev.shoppingItems.filter((s) => !s.completed),
    }));
  };

  const toggleCleaningTask = (id: string) => {
    setState((prev) => ({
      ...prev,
      cleaningTasks: prev.cleaningTasks.map((c) =>
        c.id === id ? { ...c, completedToday: !c.completedToday } : c
      ),
    }));
  };

  const toggleMaintenanceTask = (id: string) => {
    setState((prev) => ({
      ...prev,
      maintenanceTasks: prev.maintenanceTasks.map((m) =>
        m.id === id ? { ...m, completed: !m.completed } : m
      ),
    }));
  };

  // Habits & Rewards
  const toggleHabitForToday = (habitId: string, dateStr: string = getTodayString()) => {
    setState((prev) => {
      const habit = prev.habits.find((h) => h.id === habitId);
      if (!habit) return prev;

      const isCompleted = habit.completedDates.includes(dateStr);
      const newDates = isCompleted
        ? habit.completedDates.filter((d) => d !== dateStr)
        : [...habit.completedDates, dateStr];

      // Points adjustment for child (only if habit has childId and points > 0)
      const pointsDiff = isCompleted ? -habit.points : habit.points;
      const targetChildId = habit.childId || (habit.type === 'child' ? habit.memberId : undefined);
      const child = targetChildId ? prev.members.find((m) => m.id === targetChildId) : null;

      const updatedMembers = (child && habit.points > 0)
        ? prev.members.map((m) => {
            if (m.id === child.id) {
              return { ...m, points: Math.max(0, m.points + pointsDiff) };
            }
            return m;
          })
        : prev.members;

      // Add to points history if completed and has child with points
      let updatedHistory = prev.pointsHistory;
      if (!isCompleted && child && habit.points > 0) {
        const newHistoryEntry: PointsHistoryEntry = {
          id: 'ph_' + Date.now(),
          childId: child.id,
          childName: child.name,
          points: habit.points,
          description: `Completó hábito: ${habit.title}`,
          date: dateStr,
        };
        updatedHistory = [newHistoryEntry, ...prev.pointsHistory];
      }

      return {
        ...prev,
        members: updatedMembers,
        pointsHistory: updatedHistory,
        habits: prev.habits.map((h) => (h.id === habitId ? { ...h, completedDates: newDates } : h)),
      };
    });
  };

  const addHabit = (habitData: Omit<Habit, 'id' | 'completedDates'>) => {
    const id = 'h_' + Date.now();
    const newHabit: Habit = {
      ...habitData,
      id,
      completedDates: [],
      active: habitData.active !== undefined ? habitData.active : true,
    };

    setState((prev) => {
      let updatedReminders = prev.reminders;
      if (newHabit.reminderEnabled && newHabit.reminderTime) {
        const newReminder: AppReminder = {
          id: 'rem_h_' + id,
          title: `Hábito: ${newHabit.title}`,
          category: 'habits',
          date: getTodayString(),
          time: newHabit.reminderTime,
          anticipation: 'at_time',
          recurrence: 'daily',
          responsibleId: newHabit.memberId || newHabit.childId || 'mama',
          isPrivate: newHabit.isPrivate,
          relatedEntityId: id,
          relatedEntityType: 'habit',
          completed: false,
          createdAt: new Date().toISOString(),
        };
        updatedReminders = [newReminder, ...prev.reminders];
      }

      return {
        ...prev,
        habits: [...prev.habits, newHabit],
        reminders: updatedReminders,
      };
    });
  };

  const updateHabit = (id: string, updates: Partial<Habit>) => {
    setState((prev) => {
      const existing = prev.habits.find((h) => h.id === id);
      if (!existing) return prev;

      const updatedHabit = { ...existing, ...updates };

      // Update or delete associated reminder
      let updatedReminders = prev.reminders.filter((r) => r.relatedEntityId !== id);
      if (updatedHabit.reminderEnabled && updatedHabit.reminderTime) {
        const reminder: AppReminder = {
          id: 'rem_h_' + id,
          title: `Hábito: ${updatedHabit.title}`,
          category: 'habits',
          date: getTodayString(),
          time: updatedHabit.reminderTime,
          anticipation: 'at_time',
          recurrence: 'daily',
          responsibleId: updatedHabit.memberId || updatedHabit.childId || 'mama',
          isPrivate: updatedHabit.isPrivate,
          relatedEntityId: id,
          relatedEntityType: 'habit',
          completed: false,
          createdAt: new Date().toISOString(),
        };
        updatedReminders = [reminder, ...updatedReminders];
      }

      return {
        ...prev,
        habits: prev.habits.map((h) => (h.id === id ? updatedHabit : h)),
        reminders: updatedReminders,
      };
    });
  };

  const deleteHabit = (id: string) => {
    setState((prev) => ({
      ...prev,
      habits: prev.habits.filter((h) => h.id !== id),
      reminders: prev.reminders.filter((r) => r.relatedEntityId !== id),
    }));
  };

  const toggleHabitActive = (id: string) => {
    setState((prev) => ({
      ...prev,
      habits: prev.habits.map((h) => (h.id === id ? { ...h, active: !h.active } : h)),
    }));
  };

  const addReward = (rewardData: Omit<Reward, 'id'>) => {
    const id = 'rew_' + Date.now();
    setState((prev) => ({
      ...prev,
      rewards: [...prev.rewards, { ...rewardData, id }],
    }));
  };

  const redeemReward = (rewardId: string, childId: string): boolean => {
    const reward = state.rewards.find((r) => r.id === rewardId);
    const child = state.members.find((m) => m.id === childId);
    if (!reward || !child) return false;
    if (child.points < reward.pointsCost) return false;

    setState((prev) => {
      const updatedMembers = prev.members.map((m) => {
        if (m.id === childId) {
          return { ...m, points: m.points - reward.pointsCost };
        }
        return m;
      });

      const newHistoryEntry: PointsHistoryEntry = {
        id: 'ph_' + Date.now(),
        childId,
        childName: child.name,
        points: -reward.pointsCost,
        description: `Canjeó recompensa: ${reward.title}`,
        date: getTodayString(),
      };

      return {
        ...prev,
        members: updatedMembers,
        pointsHistory: [newHistoryEntry, ...prev.pointsHistory],
      };
    });

    return true;
  };

  // Finances
  const addIncome = (incData: Omit<Income, 'id'>) => {
    const id = 'inc_' + Date.now();
    setState((prev) => ({ ...prev, incomes: [{ ...incData, id }, ...prev.incomes] }));
  };

  const deleteIncome = (id: string) => {
    setState((prev) => ({ ...prev, incomes: prev.incomes.filter((i) => i.id !== id) }));
  };

  const addExpense = (expData: Omit<Expense, 'id'>) => {
    const id = 'exp_' + Date.now();
    setState((prev) => ({ ...prev, expenses: [{ ...expData, id }, ...prev.expenses] }));
  };

  const deleteExpense = (id: string) => {
    setState((prev) => ({ ...prev, expenses: prev.expenses.filter((e) => e.id !== id) }));
  };

  const addBill = (billData: Omit<Bill, 'id'>) => {
    const id = 'bill_' + Date.now();
    setState((prev) => ({ ...prev, bills: [...prev.bills, { ...billData, id }] }));
  };

  const toggleBillPaid = (id: string) => {
    setState((prev) => ({
      ...prev,
      bills: prev.bills.map((b) => {
        if (b.id === id) {
          const isPaid = b.status === 'paid';
          return {
            ...b,
            status: isPaid ? 'pending' : 'paid',
            paidDate: isPaid ? undefined : getTodayString(),
          };
        }
        return b;
      }),
    }));
  };

  const deleteBill = (id: string) => {
    setState((prev) => ({ ...prev, bills: prev.bills.filter((b) => b.id !== id) }));
  };

  const addDebt = (debtData: Omit<Debt, 'id'>) => {
    const id = 'debt_' + Date.now();
    setState((prev) => ({ ...prev, debts: [...prev.debts, { ...debtData, id }] }));
  };

  const updateDebtBalance = (id: string, newBalance: number) => {
    setState((prev) => ({
      ...prev,
      debts: prev.debts.map((d) => (d.id === id ? { ...d, pendingBalance: Math.max(0, newBalance) } : d)),
    }));
  };

  const updateBudget = (categoryKey: string, monthlyLimit: number) => {
    setState((prev) => {
      const exists = prev.budgets.some((b) => b.categoryKey === categoryKey);
      if (exists) {
        return {
          ...prev,
          budgets: prev.budgets.map((b) =>
            b.categoryKey === categoryKey ? { ...b, monthlyLimit } : b
          ),
        };
      }
      return {
        ...prev,
        budgets: [
          ...prev.budgets,
          { id: 'b_' + Date.now(), categoryKey, monthlyLimit, month: getTodayString().substring(0, 7) },
        ],
      };
    });
  };

  const addGoal = (goalData: Omit<FinancialGoal, 'id'>) => {
    const id = 'goal_' + Date.now();
    setState((prev) => ({ ...prev, goals: [...prev.goals, { ...goalData, id }] }));
  };

  const contributeToGoal = (goalId: string, amount: number) => {
    setState((prev) => ({
      ...prev,
      goals: prev.goals.map((g) =>
        g.id === goalId ? { ...g, currentAmount: g.currentAmount + amount } : g
      ),
    }));
  };

  // Reset Familiar
  const toggleResetMission = (id: string) => {
    setState((prev) => ({
      ...prev,
      resetMissions: prev.resetMissions.map((rm) =>
        rm.id === id ? { ...rm, completed: !rm.completed } : rm
      ),
    }));
  };

  const resetMissionsStatus = () => {
    setState((prev) => ({
      ...prev,
      resetMissions: prev.resetMissions.map((rm) => ({ ...rm, completed: false })),
    }));
  };

  // Couple Handlers (Mamá & Papá)
  const addCoupleCheckIn = (checkInData: Omit<CoupleCheckIn, 'id' | 'createdAt'>) => {
    const id = 'chk_' + Date.now();
    const createdAt = new Date().toISOString();
    const newCheckIn: CoupleCheckIn = { ...checkInData, id, createdAt };
    setState((prev) => ({
      ...prev,
      coupleCheckIns: [newCheckIn, ...prev.coupleCheckIns],
    }));
  };

  const addCoupleConversation = (convData: Omit<CoupleConversation, 'id'>) => {
    const id = 'conv_' + Date.now();
    setState((prev) => ({
      ...prev,
      coupleConversations: [{ ...convData, id }, ...prev.coupleConversations],
    }));
  };

  const updateCoupleConversation = (id: string, updates: Partial<CoupleConversation>) => {
    setState((prev) => ({
      ...prev,
      coupleConversations: prev.coupleConversations.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    }));
  };

  const deleteCoupleConversation = (id: string) => {
    setState((prev) => ({
      ...prev,
      coupleConversations: prev.coupleConversations.filter((c) => c.id !== id),
    }));
  };

  const addCoupleDate = (dateData: Omit<CoupleDate, 'id'>) => {
    const id = 'date_' + Date.now();
    const newDate: CoupleDate = { ...dateData, id };
    setState((prev) => {
      let updatedEvents = prev.events;
      if (dateData.syncedToCalendar) {
        const evId = 'ev_cpl_' + Date.now();
        updatedEvents = [
          ...prev.events,
          {
            id: evId,
            title: `❤️ ${dateData.title}`,
            description: dateData.notes || 'Tiempo especial de pareja',
            eventTypeKey: 'family',
            date: dateData.date,
            startTime: dateData.time,
            memberId: 'both',
            allDay: false,
          },
        ];
      }
      return {
        ...prev,
        events: updatedEvents,
        coupleDates: [newDate, ...prev.coupleDates],
      };
    });
  };

  const updateCoupleDate = (id: string, updates: Partial<CoupleDate>) => {
    setState((prev) => ({
      ...prev,
      coupleDates: prev.coupleDates.map((d) => (d.id === id ? { ...d, ...updates } : d)),
    }));
  };

  const deleteCoupleDate = (id: string) => {
    setState((prev) => ({
      ...prev,
      coupleDates: prev.coupleDates.filter((d) => d.id !== id),
    }));
  };

  const recordCoupleGesture = (gestureId: string, performedBy?: string) => {
    setState((prev) => ({
      ...prev,
      coupleGestures: prev.coupleGestures.map((g) =>
        g.id === gestureId
          ? {
              ...g,
              completedCount: g.completedCount + 1,
              lastDoneDate: getTodayString(),
              lastDoneBy: performedBy || g.lastDoneBy,
            }
          : g
      ),
    }));
  };

  const addCoupleAgreement = (agrData: Omit<CoupleAgreement, 'id'>) => {
    const id = 'agr_' + Date.now();
    setState((prev) => ({
      ...prev,
      coupleAgreements: [{ ...agrData, id }, ...prev.coupleAgreements],
    }));
  };

  const updateCoupleAgreement = (id: string, updates: Partial<CoupleAgreement>) => {
    setState((prev) => ({
      ...prev,
      coupleAgreements: prev.coupleAgreements.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    }));
  };

  const deleteCoupleAgreement = (id: string) => {
    setState((prev) => ({
      ...prev,
      coupleAgreements: prev.coupleAgreements.filter((a) => a.id !== id),
    }));
  };

  const addCoupleSpiritualItem = (itemData: Omit<CoupleSpiritualItem, 'id'>) => {
    const id = 'sp_' + Date.now();
    setState((prev) => ({
      ...prev,
      coupleSpiritualItems: [{ ...itemData, id }, ...prev.coupleSpiritualItems],
    }));
  };

  const toggleCoupleSpiritualItem = (id: string) => {
    setState((prev) => ({
      ...prev,
      coupleSpiritualItems: prev.coupleSpiritualItems.map((s) => {
        if (s.id === id) {
          const nextStatus = s.status === 'fulfilled' ? 'pending' : 'fulfilled';
          return { ...s, status: nextStatus };
        }
        return s;
      }),
    }));
  };

  const deleteCoupleSpiritualItem = (id: string) => {
    setState((prev) => ({
      ...prev,
      coupleSpiritualItems: prev.coupleSpiritualItems.filter((s) => s.id !== id),
    }));
  };

  const addCuquiTimeSession = (sessionData: Omit<CuquiTimeSession, 'id'>) => {
    const id = 'cuqui_' + Date.now();
    setState((prev) => ({
      ...prev,
      cuquiTimeSessions: [{ ...sessionData, id }, ...prev.cuquiTimeSessions],
    }));
  };

  const updateCuquiTimeSession = (id: string, updates: Partial<CuquiTimeSession>) => {
    setState((prev) => ({
      ...prev,
      cuquiTimeSessions: prev.cuquiTimeSessions.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    }));
  };

  const deleteCuquiTimeSession = (id: string) => {
    setState((prev) => ({
      ...prev,
      cuquiTimeSessions: prev.cuquiTimeSessions.filter((c) => c.id !== id),
    }));
  };

  const addCoupleMemory = (memData: Omit<CoupleMemory, 'id'>) => {
    const id = 'mem_' + Date.now();
    setState((prev) => ({
      ...prev,
      coupleMemories: [{ ...memData, id }, ...prev.coupleMemories],
    }));
  };

  const deleteCoupleMemory = (id: string) => {
    setState((prev) => ({
      ...prev,
      coupleMemories: prev.coupleMemories.filter((m) => m.id !== id),
    }));
  };

  // System & Storage Adapter (Phase 1)
  const resetAllToDemo = () => {
    const fresh = dataService.resetToDemo();
    setState(fresh);
  };

  const importBackup = (jsonStr: string): boolean => {
    const imported = dataService.importJSON(jsonStr);
    if (imported) {
      setState(imported);
      return true;
    }
    return false;
  };

  const exportBackup = (): string => {
    return dataService.exportJSON();
  };

  const switchDataMode = (mode: DataMode) => {
    dataService.switchMode(mode);
    setDataMode(mode);
    setState(dataService.loadFullState());
  };

  const currentUser = authenticatedUser || dataService.getCurrentUser(activeProfileId);
  const familyAccount = dataService.getFamilyAccount();
  const isSupabaseAuthActive = Boolean(authenticatedUser);

  // Reminders & Notifications methods
  const addReminder = (rem: Omit<AppReminder, 'id' | 'createdAt'>) => {
    const newRem: AppReminder = {
      ...rem,
      id: `rem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    setState((prev) => ({
      ...prev,
      reminders: [newRem, ...prev.reminders],
    }));
  };

  const updateReminder = (id: string, updates: Partial<AppReminder>) => {
    setState((prev) => ({
      ...prev,
      reminders: prev.reminders.map((r) => (r.id === id ? { ...r, ...updates } : r)),
    }));
  };

  const deleteReminder = (id: string) => {
    setState((prev) => ({
      ...prev,
      reminders: prev.reminders.filter((r) => r.id !== id),
    }));
  };

  const toggleReminderCompleted = (id: string) => {
    setState((prev) => ({
      ...prev,
      reminders: prev.reminders.map((r) =>
        r.id === id ? { ...r, completed: !r.completed } : r
      ),
    }));
  };

  const updateNotificationPreferences = (
    memberId: 'mama' | 'papa',
    updates: Partial<AdultNotificationPreferences>
  ) => {
    setState((prev) => ({
      ...prev,
      notificationPreferences: {
        ...prev.notificationPreferences,
        [memberId]: {
          ...prev.notificationPreferences[memberId],
          ...updates,
        },
      },
    }));
  };

  const updateCategoryPreference = (
    memberId: 'mama' | 'papa',
    category: NotificationCategory,
    updates: Partial<CategoryPreference>
  ) => {
    setState((prev) => ({
      ...prev,
      notificationPreferences: {
        ...prev.notificationPreferences,
        [memberId]: {
          ...prev.notificationPreferences[memberId],
          categories: {
            ...prev.notificationPreferences[memberId].categories,
            [category]: {
              ...prev.notificationPreferences[memberId].categories[category],
              ...updates,
            },
          },
        },
      },
    }));
  };

  const markNotificationRead = (id: string) => {
    setActiveNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const clearAllNotifications = () => {
    setActiveNotifications([]);
  };

  const testNotification = async (profileId: 'mama' | 'papa'): Promise<boolean> => {
    const prefs = state.notificationPreferences[profileId];
    const perm = await notificationService.requestPermission();
    if (perm === 'granted') {
      const family = dataService.getFamilyAccount();
      if (authenticatedUser?.id && family?.id) {
        notificationService.subscribeToPush().then((sub) => {
          if (sub) {
            notificationService.savePushSubscription(authenticatedUser.id, family.id, sub);
          }
        });
      }

      return await notificationService.showNotification({
        title: '🔔 Notificación de Prueba — MELOMUS',
        body: `Hola ${profileId === 'mama' ? 'Mamá' : 'Papá'}, tus notificaciones están configuradas y funcionando con éxito.`,
        category: 'reminders',
        isDiscrete: prefs?.discreteMode,
      });
    }
    return false;
  };

  return (
    <FamilyContext.Provider
      value={{
        currentTab,
        setCurrentTab,
        activeProfileId,
        setActiveProfileId,
        activeMember,
        isAdultView,
        isKidView,
        config: state.config,
        updateConfig,
        getModuleTitle,
        getCategoryName,
        getMemberName,
        getMember,
        members: state.members,
        addMember,
        updateMember,
        tasks: state.tasks,
        addTask,
        updateTask,
        deleteTask,
        toggleTaskComplete,
        events: state.events,
        addEvent,
        updateEvent,
        deleteEvent,
        appointments: state.appointments,
        addAppointment,
        updateAppointment,
        deleteAppointment,
        medications: state.medications,
        addMedication,
        updateMedication,
        deleteMedication,
        doseLogs: state.doseLogs,
        logDose,
        pediatricQueries: state.pediatricQueries,
        addPediatricQuery,
        togglePediatricQuery,
        deletePediatricQuery,
        vaccineRecords: state.vaccineRecords,
        toggleVaccineStatus,
        addVaccineRecord,
        shoppingItems: state.shoppingItems,
        addShoppingItem,
        toggleShoppingItem,
        deleteShoppingItem,
        clearCompletedShopping,
        cleaningTasks: state.cleaningTasks,
        toggleCleaningTask,
        maintenanceTasks: state.maintenanceTasks,
        toggleMaintenanceTask,
        habits: state.habits,
        toggleHabitForToday,
        addHabit,
        updateHabit,
        deleteHabit,
        toggleHabitActive,
        rewards: state.rewards,
        addReward,
        redeemReward,
        pointsHistory: state.pointsHistory,
        incomes: state.incomes,
        addIncome,
        deleteIncome,
        expenses: state.expenses,
        addExpense,
        deleteExpense,
        bills: state.bills,
        addBill,
        toggleBillPaid,
        deleteBill,
        debts: state.debts,
        addDebt,
        updateDebtBalance,
        budgets: state.budgets,
        updateBudget,
        goals: state.goals,
        addGoal,
        contributeToGoal,
        resetMissions: state.resetMissions,
        toggleResetMission,
        resetMissionsStatus,
        coupleCheckIns: state.coupleCheckIns,
        addCoupleCheckIn,
        coupleConversations: state.coupleConversations,
        addCoupleConversation,
        updateCoupleConversation,
        deleteCoupleConversation,
        coupleDates: state.coupleDates,
        addCoupleDate,
        updateCoupleDate,
        deleteCoupleDate,
        coupleGestures: state.coupleGestures,
        recordCoupleGesture,
        coupleAgreements: state.coupleAgreements,
        addCoupleAgreement,
        updateCoupleAgreement,
        deleteCoupleAgreement,
        coupleSpiritualItems: state.coupleSpiritualItems,
        addCoupleSpiritualItem,
        toggleCoupleSpiritualItem,
        deleteCoupleSpiritualItem,
        cuquiTimeSessions: state.cuquiTimeSessions,
        addCuquiTimeSession,
        updateCuquiTimeSession,
        deleteCuquiTimeSession,
        coupleMemories: state.coupleMemories,
        addCoupleMemory,
        deleteCoupleMemory,
        quickActionModalOpen,
        setQuickActionModalOpen,
        familyResetModalOpen,
        setFamilyResetModalOpen,
        notificationDrawerOpen,
        setNotificationDrawerOpen,
        resetAllToDemo,
        importBackup,
        exportBackup,
        dataMode,
        currentUser,
        familyAccount,
        switchDataMode,
        authModalOpen,
        setAuthModalOpen,
        authModalMode,
        setAuthModalMode,
        inviteToken,
        setInviteToken,
        linkCoAdminModalOpen,
        setLinkCoAdminModalOpen,
        openAuthModal,
        openLinkCoAdminModal,
        logoutAuthUser,
        isSupabaseAuthActive,
        isAuthLoading,
        authenticatedUser,
        handleAuthSuccess,
        reminders: state.reminders,
        addReminder,
        updateReminder,
        deleteReminder,
        toggleReminderCompleted,
        notificationPreferences: state.notificationPreferences,
        updateNotificationPreferences,
        updateCategoryPreference,
        activeNotifications,
        markNotificationRead,
        clearAllNotifications,
        testNotification,
      }}
    >
      {children}
    </FamilyContext.Provider>
  );
};

export const useFamily = () => {
  const context = useContext(FamilyContext);
  if (!context) {
    throw new Error('useFamily must be used within a FamilyProvider');
  }
  return context;
};
