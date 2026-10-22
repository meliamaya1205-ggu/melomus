import { supabase, isSupabaseConfigured } from './supabaseClient';
import { FullAppState, storageService } from './storageService';
import { AuthUser, FamilyAccount, DataMode, CoAdminLinkPayload } from '../types/auth';
import { Task } from '../types/tasks';
import { CalendarEvent } from '../types/calendar';
import { Habit } from '../types/habits';
import { Income, Expense, Bill, Debt, Budget, FinancialGoal } from '../types/finance';
import { MedicalAppointment, Medication, MedicationDoseLog, PediatricQuery, VaccineRecord } from '../types/health';
import { ShoppingItem, CleaningTask, MaintenanceTask, HomeArea, DEFAULT_HOME_AREAS } from '../types/home';
import { CoupleCheckIn, CoupleConversation, CoupleDate, CoupleGesture, CoupleAgreement, CoupleSpiritualItem, CuquiTimeSession, CoupleMemory } from '../types/couple';
import { Reward, PointsHistoryEntry } from '../types/rewards';
import { FamilyMember } from '../types/family';
import { AppCustomizationConfig } from '../types/config';
import { NotificationPreferencesState } from '../types/notifications';
import { FamilyResetSession } from '../types/reset';
import { ProfileThemePreference } from '../types/theme';
import { IDataService } from './dataAdapter';
import { RealtimeChannel } from '@supabase/supabase-js';
import { outboxService } from './outboxService';
import {
  initialMembers,
  initialTasks,
  initialEvents,
  initialHabits,
  initialExpenses,
  initialIncomes,
  initialBills,
  initialDebts,
  initialBudgets,
  initialGoals,
  initialAppointments,
  initialMedications,
  initialDoseLogs,
  initialPediatricQueries,
  initialVaccines,
  initialShoppingItems,
  initialCleaningTasks,
  initialMaintenanceTasks,
  initialResetMissions,
  initialCoupleCheckIns,
  initialCoupleConversations,
  initialCoupleDates,
  initialCoupleGestures,
  initialCoupleAgreements,
  initialCoupleSpiritualItems,
  initialCuquiTimeSessions,
  initialCoupleMemories,
  initialRewards,
  initialPointsHistory,
  initialConfig,
  initialNotificationPreferences,
} from './seedData';

export type RemoteChangeCallback = <K extends keyof FullAppState>(
  key: K,
  data: FullAppState[K],
  meta?: {
    authorId?: string;
    table?: string;
    eventType?: 'INSERT' | 'UPDATE' | 'DELETE';
    entityId?: string;
  }
) => void;

/**
 * SupabaseDataService
 * 
 * Production-ready multi-user cloud adapter for "Nuestro Hogar".
 * Implements IDataService, connects to Supabase PostgreSQL with RLS,
 * and maintains real-time synchronization via Supabase Realtime postgres_changes.
 * 
 * Features:
 * 1. Multi-tenant isolation by family_id
 * 2. Instant local UI updates with localStorage caching (0ms latency & offline resilience)
 * 3. Bidirectional Realtime sync (Device A <-> Device B)
 * 4. Echo-loop prevention & Last-Write-Wins conflict resolution based on updated_at
 * 5. Strict privacy preservation (personal habits & personal expenses never leak to the other adult)
 * 6. Non-blocking asynchronous sync queue
 */
export class SupabaseDataService implements IDataService {
  public mode: DataMode = 'cloud_sync';
  private cachedState: FullAppState;
  private currentUser: AuthUser | null = null;
  private familyAccount: FamilyAccount | null = null;
  private familyId: string | null = null;
  private realtimeChannel: RealtimeChannel | null = null;
  private remoteListeners: Set<RemoteChangeCallback> = new Set();
  
  // Track recently saved local mutation timestamps and ids to avoid echo loops
  private recentLocalMutations: Map<string, number> = new Map();
  // Debounce timers for batched saving
  private debounceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  constructor() {
    this.cachedState = storageService.loadFullState();

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        if (this.familyId) {
          this.flushOutbox();
        }
      });
    }
  }

  // ----------------------------------------------------------------------------
  // IDataService implementation
  // ----------------------------------------------------------------------------

  public loadFullState(): FullAppState {
    return this.cachedState;
  }

  public saveStateKey<K extends keyof FullAppState>(key: K, data: FullAppState[K]): void {
    // 1. Update memory cache immediately
    this.cachedState[key] = data;

    // 2. Persist to localStorage immediately for offline resilience
    storageService.saveStateKey(key, data);

    // 3. If connected to Supabase family session, push to cloud asynchronously
    if (this.familyId && isSupabaseConfigured() && supabase) {
      this.scheduleCloudPush(key, data);
    }
  }

  public resetToDemo(): FullAppState {
    this.disconnectRealtime();
    return storageService.resetToDemo();
  }

  public exportJSON(): string {
    return storageService.exportJSON();
  }

  public importJSON(jsonString: string): FullAppState | null {
    const imported = storageService.importJSON(jsonString);
    if (imported) {
      this.cachedState = imported;
      if (this.familyId) {
        // Push imported state to cloud
        for (const k of Object.keys(imported) as (keyof FullAppState)[]) {
          this.saveStateKey(k, imported[k]);
        }
      }
    }
    return imported;
  }

  public getCurrentUser(_activeProfileId?: string): AuthUser | null {
    return this.currentUser;
  }

  public getFamilyAccount(): FamilyAccount | null {
    return this.familyAccount;
  }

  public switchMode(mode: DataMode): void {
    this.mode = mode;
    if (mode === 'local_demo') {
      this.disconnectRealtime();
    }
  }

  public async linkCoAdmin(
    _token: string,
    payload: CoAdminLinkPayload
  ): Promise<{ success: boolean; message: string }> {
    return {
      success: true,
      message: `Adulto principal ${payload.name} vinculado con éxito.`,
    };
  }

  // ----------------------------------------------------------------------------
  // Cloud Session & Realtime Lifecycle
  // ----------------------------------------------------------------------------

  /**
   * Initializes cloud session for authenticated user and family.
   * Loads all tables from Supabase, seeds initial records if new family,
   * updates local cache and subscribes to Realtime.
   */
  public async initCloudSession(user: AuthUser, family: FamilyAccount): Promise<FullAppState> {
    this.currentUser = user;
    this.familyAccount = family;
    this.familyId = family.id;
    this.mode = 'cloud_sync';

    if (!isSupabaseConfigured() || !supabase) {
      return this.cachedState;
    }

    try {
      // 1. Fetch remote data from Supabase
      const remoteState = await this.fetchRemoteState(family.id, user.id);

      // 2. Check if this is a brand new family (0 tasks, 0 events, 0 members)
      const isNewFamily = remoteState.members.length === 0 && remoteState.tasks.length === 0;

      if (isNewFamily) {
        // Seed initial family data into Supabase
        await this.seedNewFamilyData(family.id, user);
        // Refresh state after seeding
        const seededState = await this.fetchRemoteState(family.id, user.id);
        this.cachedState = seededState;
      } else {
        this.cachedState = remoteState;
      }

      // 3. Cache in localStorage as offline fallback
      for (const k of Object.keys(this.cachedState) as (keyof FullAppState)[]) {
        storageService.saveStateKey(k, this.cachedState[k]);
      }

      // 4. Subscribe to Realtime postgres_changes
      this.subscribeToRealtime(family.id);

      // 5. Drain pending outbox items that were queued while offline
      await this.flushOutbox();

      const pending = outboxService.getPendingCount();
      outboxService.setStatus(pending > 0 ? 'pending' : 'synced');
      return this.cachedState;
    } catch (err) {
      console.warn('[SupabaseDataService] Error cargando estado desde la nube, usando cache local:', err);
      outboxService.setStatus('error');
      return this.cachedState;
    }
  }

  /**
   * Register listener for Realtime updates from other family devices
   */
  public onRemoteChange(callback: RemoteChangeCallback): () => void {
    this.remoteListeners.add(callback);
    return () => {
      this.remoteListeners.delete(callback);
    };
  }

  /**
   * Unsubscribe from Supabase Realtime
   */
  public disconnectRealtime(): void {
    if (this.realtimeChannel && supabase) {
      supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
  }

  // ----------------------------------------------------------------------------
  // Cloud Push & Debounce
  // ----------------------------------------------------------------------------

  private scheduleCloudPush<K extends keyof FullAppState>(key: K, data: FullAppState[K]): void {
    const timerKey = String(key);
    const existingTimer = this.debounceTimers.get(timerKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // 1. Immediately enqueue in persistent Outbox
    if (this.familyId) {
      outboxService.enqueue(this.familyId, timerKey, data);
    }

    // Debounce fast successive changes by 150ms
    const timer = setTimeout(async () => {
      this.debounceTimers.delete(timerKey);
      try {
        await this.pushKeyToSupabase(key, data);
      } catch {
        // Error recorded in outboxService and syncStatus updated
      }
    }, 150);

    this.debounceTimers.set(timerKey, timer);
  }

  /**
   * Helper to ensure Supabase operations throw on database or RLS errors
   */
  private async checkSupabase(promise: PromiseLike<{ error: any }>): Promise<void> {
    const res = await promise;
    if (res && res.error) {
      throw res.error;
    }
  }

  /**
   * Pushes a specific state slice to the corresponding Supabase PostgreSQL table
   */
  public async pushKeyToSupabase<K extends keyof FullAppState>(key: K, data: FullAppState[K]): Promise<boolean> {
    if (!this.familyId || !supabase) return false;
    const familyId = this.familyId;
    const currentUserId = this.currentUser?.id;
    const now = new Date().toISOString();
    const opId = `op_${familyId}_${String(key)}`;

    // Offline check: do not attempt network request, preserve in Outbox
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      outboxService.setStatus('offline');
      return false;
    }

    outboxService.setStatus('syncing');

    try {
      switch (key) {
        case 'tasks': {
          const tasks = data as unknown as Task[];
          if (tasks.length === 0) {
            await this.checkSupabase(supabase.from('tasks').delete().eq('family_id', familyId));
            break;
          }
          const rows = tasks.map((t) => {
            this.recentLocalMutations.set(`task_${t.id}`, Date.now());
            return {
              id: t.id,
              family_id: familyId,
              title: t.title,
              description: t.description || null,
              assigned_to: t.responsibleId || 'family',
              category_key: t.categoryKey || 'other',
              priority: t.priority || 'medium',
              status: t.status || 'pending',
              due_date: t.date || null,
              created_by: t.responsibleId || 'family',
              created_by_user_id: currentUserId,
              data: t,
              updated_at: now,
            };
          });
          await this.checkSupabase(supabase.from('tasks').upsert(rows, { onConflict: 'family_id,id' }));
          const ids = tasks.map((t) => t.id);
          await this.checkSupabase(supabase.from('tasks').delete().eq('family_id', familyId).not('id', 'in', `(${ids.join(',')})`));
          break;
        }

        case 'events': {
          const events = data as unknown as CalendarEvent[];
          if (events.length === 0) {
            await this.checkSupabase(supabase.from('calendar_events').delete().eq('family_id', familyId));
            break;
          }
          const rows = events.map((e) => {
            this.recentLocalMutations.set(`event_${e.id}`, Date.now());
            return {
              id: e.id,
              family_id: familyId,
              title: e.title,
              description: e.description || null,
              date: e.date,
              time: e.startTime || null,
              category_key: e.eventTypeKey || 'other',
              responsible_id: e.memberId || 'family',
              is_all_day: e.allDay ?? false,
              created_by: e.memberId || 'family',
              created_by_user_id: currentUserId,
              data: e,
              updated_at: now,
            };
          });
          await this.checkSupabase(supabase.from('calendar_events').upsert(rows, { onConflict: 'family_id,id' }));
          const ids = events.map((e) => e.id);
          await this.checkSupabase(supabase.from('calendar_events').delete().eq('family_id', familyId).not('id', 'in', `(${ids.join(',')})`));
          break;
        }

        case 'habits': {
          const habits = data as unknown as Habit[];
          if (habits.length === 0) {
            await this.checkSupabase(supabase.from('habits').delete().eq('family_id', familyId));
            break;
          }
          const rows = habits.map((h) => {
            this.recentLocalMutations.set(`habit_${h.id}`, Date.now());
            return {
              id: h.id,
              family_id: familyId,
              title: h.title,
              type: h.type,
              category: h.category,
              member_id: h.memberId || null,
              child_id: h.childId || null,
              is_private: h.isPrivate ?? false,
              active: h.active ?? true,
              reminder_enabled: h.reminderEnabled ?? false,
              reminder_time: h.reminderTime || null,
              frequency: h.frequency || 'daily',
              custom_days: h.customDays || [],
              points: h.points || 0,
              completed_dates: h.completedDates || [],
              created_by_user_id: currentUserId,
              data: h,
              updated_at: now,
            };
          });
          await this.checkSupabase(supabase.from('habits').upsert(rows, { onConflict: 'family_id,id' }));
          const ids = habits.map((h) => h.id);
          await this.checkSupabase(supabase.from('habits').delete().eq('family_id', familyId).not('id', 'in', `(${ids.join(',')})`));
          break;
        }

        case 'expenses': {
          const expenses = data as unknown as Expense[];
          if (expenses.length === 0) {
            await this.checkSupabase(supabase.from('finances_expenses').delete().eq('family_id', familyId));
            break;
          }
          const rows = expenses.map((e) => {
            this.recentLocalMutations.set(`expense_${e.id}`, Date.now());
            return {
              id: e.id,
              family_id: familyId,
              description: e.description,
              amount: e.amount,
              date: e.date,
              category_key: e.categoryKey,
              responsible_id: e.responsibleId,
              payment_method: e.paymentMethod || 'debit',
              is_recurring: e.isRecurring ?? false,
              scope: e.scope || 'family',
              created_by_user_id: currentUserId,
              data: e,
              updated_at: now,
            };
          });
          await this.checkSupabase(supabase.from('finances_expenses').upsert(rows, { onConflict: 'family_id,id' }));
          const ids = expenses.map((e) => e.id);
          await this.checkSupabase(supabase.from('finances_expenses').delete().eq('family_id', familyId).not('id', 'in', `(${ids.join(',')})`));
          break;
        }

        case 'incomes': {
          const incomes = data as unknown as Income[];
          if (incomes.length === 0) {
            await this.checkSupabase(supabase.from('finances_incomes').delete().eq('family_id', familyId));
            break;
          }
          const rows = incomes.map((i) => {
            this.recentLocalMutations.set(`income_${i.id}`, Date.now());
            return {
              id: i.id,
              family_id: familyId,
              source_key: i.sourceKey,
              description: i.description,
              amount: i.amount,
              date: i.date,
              responsible_id: i.responsibleId,
              is_recurring: i.isRecurring ?? false,
              frequency: i.frequency || null,
              scope: i.scope || 'family',
              created_by_user_id: currentUserId,
              data: i,
              updated_at: now,
            };
          });
          await this.checkSupabase(supabase.from('finances_incomes').upsert(rows, { onConflict: 'family_id,id' }));
          const ids = incomes.map((i) => i.id);
          await this.checkSupabase(supabase.from('finances_incomes').delete().eq('family_id', familyId).not('id', 'in', `(${ids.join(',')})`));
          break;
        }

        case 'bills': {
          const bills = data as unknown as Bill[];
          if (bills.length === 0) {
            await this.checkSupabase(supabase.from('finances_bills').delete().eq('family_id', familyId));
            break;
          }
          const rows = bills.map((b) => {
            this.recentLocalMutations.set(`bill_${b.id}`, Date.now());
            return {
              id: b.id,
              family_id: familyId,
              name: b.name,
              amount: b.amount,
              due_date: b.dueDate,
              category_key: b.categoryKey,
              responsible_id: b.responsibleId,
              recurrence: b.recurrence || 'monthly',
              status: b.status || 'pending',
              paid_date: b.paidDate || null,
              scope: b.scope || 'family',
              created_by_user_id: currentUserId,
              data: b,
              updated_at: now,
            };
          });
          await this.checkSupabase(supabase.from('finances_bills').upsert(rows, { onConflict: 'family_id,id' }));
          const ids = bills.map((b) => b.id);
          await this.checkSupabase(supabase.from('finances_bills').delete().eq('family_id', familyId).not('id', 'in', `(${ids.join(',')})`));
          break;
        }

        case 'debts': {
          const debts = data as unknown as Debt[];
          if (debts.length === 0) {
            await this.checkSupabase(supabase.from('finances_debts').delete().eq('family_id', familyId));
            break;
          }
          const rows = debts.map((d) => {
            this.recentLocalMutations.set(`debt_${d.id}`, Date.now());
            return {
              id: d.id,
              family_id: familyId,
              name: d.name,
              creditor: d.creditor,
              original_amount: d.originalAmount,
              pending_balance: d.pendingBalance,
              installment_amount: d.installmentAmount,
              payment_day: d.paymentDay,
              frequency: d.frequency || 'monthly',
              responsible_id: d.responsibleId,
              notes: d.notes || null,
              scope: d.scope || 'family',
              created_by_user_id: currentUserId,
              data: d,
              updated_at: now,
            };
          });
          await this.checkSupabase(supabase.from('finances_debts').upsert(rows, { onConflict: 'family_id,id' }));
          const ids = debts.map((d) => d.id);
          await this.checkSupabase(supabase.from('finances_debts').delete().eq('family_id', familyId).not('id', 'in', `(${ids.join(',')})`));
          break;
        }

        case 'budgets': {
          const budgets = data as unknown as Budget[];
          if (budgets.length === 0) {
            await this.checkSupabase(supabase.from('finances_budgets').delete().eq('family_id', familyId));
            break;
          }
          const rows = budgets.map((b) => ({
            id: b.id,
            family_id: familyId,
            category_key: b.categoryKey,
            monthly_limit: b.monthlyLimit,
            responsible_id: b.responsibleId || 'family',
            data: b,
            updated_at: now,
          }));
          await this.checkSupabase(supabase.from('finances_budgets').upsert(rows, { onConflict: 'family_id,id' }));
          const ids = budgets.map((b) => b.id);
          await this.checkSupabase(supabase.from('finances_budgets').delete().eq('family_id', familyId).not('id', 'in', `(${ids.join(',')})`));
          break;
        }

        case 'goals': {
          const goals = data as unknown as FinancialGoal[];
          if (goals.length === 0) {
            await this.checkSupabase(supabase.from('finances_goals').delete().eq('family_id', familyId));
            break;
          }
          const rows = goals.map((g) => ({
            id: g.id,
            family_id: familyId,
            name: g.name,
            target_amount: g.targetAmount,
            current_amount: g.currentAmount || 0,
            target_date: g.targetDate || '',
            category: g.category || 'family',
            icon: '🎯',
            responsible_id: g.responsibleId || 'family',
            data: g,
            updated_at: now,
          }));
          await this.checkSupabase(supabase.from('finances_goals').upsert(rows, { onConflict: 'family_id,id' }));
          const ids = goals.map((g) => g.id);
          await this.checkSupabase(supabase.from('finances_goals').delete().eq('family_id', familyId).not('id', 'in', `(${ids.join(',')})`));
          break;
        }

        // Health Records
        case 'appointments':
        case 'medications':
        case 'doseLogs':
        case 'pediatricQueries':
        case 'vaccineRecords': {
          const recordType =
            key === 'appointments'
              ? 'appointment'
              : key === 'medications'
              ? 'medication'
              : key === 'doseLogs'
              ? 'dose_log'
              : key === 'pediatricQueries'
              ? 'pediatric_query'
              : 'vaccine';

          const items = data as unknown as Array<{ id: string; memberId?: string; childId?: string }>;
          if (items.length === 0) {
            await this.checkSupabase(supabase.from('health_records').delete().eq('family_id', familyId).eq('record_type', recordType));
            break;
          }
          const rows = items.map((item) => {
            this.recentLocalMutations.set(`health_${item.id}`, Date.now());
            return {
              id: item.id,
              family_id: familyId,
              record_type: recordType,
              member_id: item.memberId || item.childId || 'family',
              data: item,
              updated_at: now,
            };
          });
          await this.checkSupabase(supabase.from('health_records').upsert(rows, { onConflict: 'family_id,id' }));
          const ids = items.map((item) => item.id);
          await this.checkSupabase(supabase.from('health_records').delete().eq('family_id', familyId).eq('record_type', recordType).not('id', 'in', `(${ids.join(',')})`));
          break;
        }

        // Home Records
        case 'shoppingItems':
        case 'cleaningTasks':
        case 'maintenanceTasks':
        case 'homeAreas':
        case 'resetMissions': {
          const recordType =
            key === 'shoppingItems'
              ? 'shopping'
              : key === 'cleaningTasks'
              ? 'cleaning'
              : key === 'maintenanceTasks'
              ? 'maintenance'
              : key === 'homeAreas'
              ? 'area'
              : 'reset_mission';

          const items = data as unknown as Array<{ id: string }>;
          if (items.length === 0) {
            await this.checkSupabase(supabase.from('home_records').delete().eq('family_id', familyId).eq('record_type', recordType));
            break;
          }
          const rows = items.map((item) => {
            this.recentLocalMutations.set(`home_${item.id}`, Date.now());
            return {
              id: item.id,
              family_id: familyId,
              record_type: recordType,
              data: item,
              updated_at: now,
            };
          });
          try {
            await this.checkSupabase(supabase.from('home_records').upsert(rows, { onConflict: 'family_id,id' }));
            const ids = items.map((item) => item.id);
            await this.checkSupabase(supabase.from('home_records').delete().eq('family_id', familyId).eq('record_type', recordType).not('id', 'in', `(${ids.join(',')})`));
          } catch (homeErr) {
            if (recordType === 'area') {
              console.warn('[SupabaseDataService] home_records area fallback, persisting in app_customizations:', homeErr);
              const customConfig = (this.cachedState.config || {}) as any;
              customConfig.homeAreas = items;
              await supabase.from('app_customizations').upsert({
                family_id: familyId,
                config: customConfig,
                updated_at: now,
              }, { onConflict: 'family_id' });
            } else {
              throw homeErr;
            }
          }
          break;
        }

        case 'resetSession': {
          const session = data as unknown as FamilyResetSession | null;
          if (!session) {
            await this.checkSupabase(supabase.from('home_records').delete().eq('family_id', familyId).eq('record_type', 'reset_session'));
            break;
          }
          this.recentLocalMutations.set(`home_${session.id}`, Date.now());
          await this.checkSupabase(supabase.from('home_records').upsert({
            id: session.id,
            family_id: familyId,
            record_type: 'reset_session',
            data: session,
            updated_at: now,
          }, { onConflict: 'family_id,id' }));
          break;
        }

        // Couple Records
        case 'coupleCheckIns':
        case 'coupleConversations':
        case 'coupleDates':
        case 'coupleGestures':
        case 'coupleAgreements':
        case 'coupleSpiritualItems':
        case 'cuquiTimeSessions':
        case 'coupleMemories': {
          const itemType =
            key === 'coupleCheckIns'
              ? 'check_in'
              : key === 'coupleConversations'
              ? 'conversation'
              : key === 'coupleDates'
              ? 'date'
              : key === 'coupleGestures'
              ? 'gesture'
              : key === 'coupleAgreements'
              ? 'agreement'
              : key === 'coupleSpiritualItems'
              ? 'spiritual'
              : key === 'cuquiTimeSessions'
              ? 'cuqui_time'
              : 'memory';

          const items = data as unknown as Array<{ id: string }>;
          if (items.length === 0) {
            await this.checkSupabase(supabase.from('couple_records').delete().eq('family_id', familyId).eq('item_type', itemType));
            break;
          }
          const rows = items.map((item) => {
            this.recentLocalMutations.set(`couple_${item.id}`, Date.now());
            return {
              id: item.id,
              family_id: familyId,
              item_type: itemType,
              data: item,
              created_by_user_id: currentUserId,
              updated_at: now,
            };
          });
          await this.checkSupabase(supabase.from('couple_records').upsert(rows, { onConflict: 'family_id,id' }));
          const ids = items.map((item) => item.id);
          await this.checkSupabase(supabase.from('couple_records').delete().eq('family_id', familyId).eq('item_type', itemType).not('id', 'in', `(${ids.join(',')})`));
          break;
        }

        case 'rewards': {
          const rewards = data as unknown as Reward[];
          if (rewards.length === 0) {
            await this.checkSupabase(supabase.from('rewards').delete().eq('family_id', familyId));
            break;
          }
          const rows = rewards.map((r) => ({
            id: r.id,
            family_id: familyId,
            title: r.title,
            description: r.description || null,
            points_cost: r.pointsCost,
            category: r.category || 'special',
            icon: r.icon || '🎁',
            active: true,
            data: r,
            updated_at: now,
          }));
          await this.checkSupabase(supabase.from('rewards').upsert(rows, { onConflict: 'family_id,id' }));
          const ids = rewards.map((r) => r.id);
          await this.checkSupabase(supabase.from('rewards').delete().eq('family_id', familyId).not('id', 'in', `(${ids.join(',')})`));
          break;
        }

        case 'pointsHistory': {
          const points = data as unknown as PointsHistoryEntry[];
          if (points.length === 0) break;
          const rows = points.map((p) => ({
            id: p.id,
            family_id: familyId,
            child_id: p.childId,
            points: p.points,
            reason: p.description,
            date: p.date,
            data: p,
          }));
          await this.checkSupabase(supabase.from('points_history').upsert(rows, { onConflict: 'family_id,id' }));
          break;
        }

        case 'members': {
          const members = data as unknown as FamilyMember[];
          if (members.length === 0) break;
          const rows = members.map((m) => ({
            id: m.id,
            family_id: familyId,
            name: m.name,
            role: m.role,
            relationship: m.relationship,
            age: m.age || null,
            birth_date: m.birthDate || null,
            avatar_color: m.avatarColor || '#3b82f6',
            avatar_emoji: m.avatarEmoji || '⭐',
            points: m.points || 0,
            notes: m.notes || null,
            data: m,
            updated_at: now,
          }));
          await this.checkSupabase(supabase.from('family_members').upsert(rows, { onConflict: 'family_id,id' }));
          const ids = members.map((m) => m.id);
          await this.checkSupabase(supabase.from('family_members').delete().eq('family_id', familyId).not('id', 'in', `(${ids.join(',')})`));
          break;
        }

        case 'config':
        case 'notificationPreferences':
        case 'themePreferences': {
          this.recentLocalMutations.set(`customizations_${familyId}`, Date.now());
          await this.checkSupabase(supabase.from('app_customizations').upsert(
            {
              family_id: familyId,
              config: this.cachedState.config,
              theme_preferences: this.cachedState.themePreferences || {},
              notification_preferences: this.cachedState.notificationPreferences,
              updated_at: now,
            },
            { onConflict: 'family_id' }
          ));
          break;
        }

        default:
          break;
      }

      // Success: remove from persistent Outbox and update sync status
      await outboxService.remove(opId);
      const remaining = outboxService.getPendingCount();
      outboxService.setStatus(remaining > 0 ? 'pending' : 'synced');
      return true;
    } catch (err: any) {
      const errMsg = err?.message || 'Error al sincronizar con Supabase';
      console.warn(`[SupabaseDataService] Error sincronizando ${String(key)} con Supabase:`, errMsg);
      await outboxService.recordError(opId, errMsg);
      throw err;
    }
  }

  /**
   * Flushes all pending outbox mutations to Supabase in chronological order
   */
  public async flushOutbox(): Promise<void> {
    if (!this.familyId || !supabase || (typeof navigator !== 'undefined' && !navigator.onLine)) {
      return;
    }

    const items = await outboxService.getAll(this.familyId);
    if (items.length === 0) {
      outboxService.setStatus('synced');
      return;
    }

    outboxService.setStatus('syncing');

    for (const item of items) {
      try {
        await this.pushKeyToSupabase(item.key as keyof FullAppState, item.payload as any);
      } catch (err) {
        console.warn(`[SupabaseDataService] Fallo al vaciar outbox para ${item.key}:`, err);
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          outboxService.setStatus('offline');
          return;
        }
      }
    }

    const remaining = outboxService.getPendingCount();
    outboxService.setStatus(remaining > 0 ? 'pending' : 'synced');
  }

  // ----------------------------------------------------------------------------
  // Realtime Subscriptions & Inbound Event Processing
  // ----------------------------------------------------------------------------

  private subscribeToRealtime(familyId: string): void {
    if (!supabase) return;
    this.disconnectRealtime();

    const channelName = `family_realtime_${familyId}`;
    const channel = supabase.channel(channelName);

    // 1. Tareas
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'tasks', filter: `family_id=eq.${familyId}` },
      (payload) => this.handleTaskRealtime(payload)
    );

    // 2. Calendario
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'calendar_events', filter: `family_id=eq.${familyId}` },
      (payload) => this.handleCalendarRealtime(payload)
    );

    // 3. Hábitos
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'habits', filter: `family_id=eq.${familyId}` },
      (payload) => this.handleHabitRealtime(payload)
    );

    // 4. Finanzas (Gastos, Ingresos, Cuentas, Deudas, Presupuestos, Metas)
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'finances_expenses', filter: `family_id=eq.${familyId}` },
      (payload) => this.handleExpenseRealtime(payload)
    );
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'finances_incomes', filter: `family_id=eq.${familyId}` },
      (payload) => this.handleIncomeRealtime(payload)
    );
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'finances_bills', filter: `family_id=eq.${familyId}` },
      (payload) => this.handleBillRealtime(payload)
    );
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'finances_debts', filter: `family_id=eq.${familyId}` },
      (payload) => this.handleDebtRealtime(payload)
    );
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'finances_budgets', filter: `family_id=eq.${familyId}` },
      (payload) => this.handleBudgetRealtime(payload)
    );
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'finances_goals', filter: `family_id=eq.${familyId}` },
      (payload) => this.handleGoalRealtime(payload)
    );

    // 5. Salud Familiar
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'health_records', filter: `family_id=eq.${familyId}` },
      (payload) => this.handleHealthRealtime(payload)
    );

    // 6. Pareja y Cuqui Time
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'couple_records', filter: `family_id=eq.${familyId}` },
      (payload) => this.handleCoupleRealtime(payload)
    );

    // 7. Hogar
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'home_records', filter: `family_id=eq.${familyId}` },
      (payload) => this.handleHomeRealtime(payload)
    );

    // 8. Recompensas y Alcancía
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'rewards', filter: `family_id=eq.${familyId}` },
      (payload) => this.handleRewardRealtime(payload)
    );
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'points_history', filter: `family_id=eq.${familyId}` },
      (payload) => this.handlePointsHistoryRealtime(payload)
    );

    // 9. Integrantes
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'family_members', filter: `family_id=eq.${familyId}` },
      (payload) => this.handleMemberRealtime(payload)
    );

    // 10. Notificaciones dirigidas
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'notifications', filter: `family_id=eq.${familyId}` },
      (payload) => this.handleNotificationRealtime(payload)
    );

    // 11. Personalización de la app y temas
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'app_customizations', filter: `family_id=eq.${familyId}` },
      (payload) => this.handleCustomizationsRealtime(payload)
    );

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        // Realtime channel connected
      }
    });

    this.realtimeChannel = channel;
  }

  /**
   * Dispatches an updated state key to all registered listeners (FamilyContext)
   */
  private notifyListeners<K extends keyof FullAppState>(
    key: K,
    data: FullAppState[K],
    meta?: { authorId?: string; table?: string; eventType?: 'INSERT' | 'UPDATE' | 'DELETE'; entityId?: string }
  ): void {
    this.cachedState[key] = data;
    storageService.saveStateKey(key, data);
    for (const listener of this.remoteListeners) {
      try {
        listener(key, data, meta);
      } catch (e) {
        console.error('[SupabaseDataService] Error en listener de cambio remoto:', e);
      }
    }
  }

  // --- Realtime Handlers for specific tables ---

  private handleTaskRealtime(payload: any): void {
    const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
    const row = payload.new || payload.old;
    if (!row) return;

    // Check if this was a recent local mutation from this device to prevent echo loop
    const localTimestamp = this.recentLocalMutations.get(`task_${row.id}`);
    if (localTimestamp && Date.now() - localTimestamp < 2000) {
      // Local mutation echo; skip
      return;
    }

    const currentTasks = [...this.cachedState.tasks];

    if (eventType === 'DELETE') {
      const filtered = currentTasks.filter((t) => t.id !== row.id);
      this.notifyListeners('tasks', filtered, {
        authorId: payload.old?.created_by_user_id,
        table: 'tasks',
        eventType: 'DELETE',
        entityId: row.id,
      });
      return;
    }

    // INSERT or UPDATE
    const mappedTask: Task = row.data && Object.keys(row.data).length > 0
      ? {
          ...row.data,
          id: row.id,
          title: row.title ?? row.data.title,
          status: row.status ?? row.data.status,
          priority: row.priority ?? row.data.priority,
          responsibleId: row.assigned_to ?? row.data.responsibleId,
          date: row.due_date ?? row.data.date,
        }
      : {
          id: row.id,
          title: row.title,
          description: row.description || '',
          responsibleId: row.assigned_to || 'family',
          categoryKey: row.category_key || 'other',
          date: row.due_date || new Date().toISOString().split('T')[0],
          priority: row.priority || 'medium',
          status: row.status || 'pending',
          createdAt: row.created_at || new Date().toISOString(),
        };

    const existingIndex = currentTasks.findIndex((t) => t.id === mappedTask.id);
    if (existingIndex >= 0) {
      currentTasks[existingIndex] = mappedTask;
    } else {
      currentTasks.unshift(mappedTask);
    }

    this.notifyListeners('tasks', currentTasks, {
      authorId: row.created_by_user_id,
      table: 'tasks',
      eventType,
      entityId: mappedTask.id,
    });
  }

  private handleCalendarRealtime(payload: any): void {
    const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
    const row = payload.new || payload.old;
    if (!row) return;

    const localTimestamp = this.recentLocalMutations.get(`event_${row.id}`);
    if (localTimestamp && Date.now() - localTimestamp < 2000) return;

    const currentEvents = [...this.cachedState.events];

    if (eventType === 'DELETE') {
      const filtered = currentEvents.filter((e) => e.id !== row.id);
      this.notifyListeners('events', filtered, {
        authorId: payload.old?.created_by_user_id,
        table: 'calendar_events',
        eventType: 'DELETE',
        entityId: row.id,
      });
      return;
    }

    const mappedEvent: CalendarEvent = row.data && Object.keys(row.data).length > 0
      ? {
          ...row.data,
          id: row.id,
          title: row.title ?? row.data.title,
          date: row.date ?? row.data.date,
          startTime: row.time ?? row.data.startTime,
          eventTypeKey: row.category_key ?? row.data.eventTypeKey,
          memberId: row.responsible_id ?? row.data.memberId,
          allDay: row.is_all_day ?? row.data.allDay,
        }
      : {
          id: row.id,
          title: row.title,
          description: row.description || '',
          date: row.date,
          startTime: row.time || undefined,
          eventTypeKey: row.category_key || 'other',
          memberId: row.responsible_id || 'family',
          allDay: row.is_all_day ?? false,
        };

    const existingIndex = currentEvents.findIndex((e) => e.id === mappedEvent.id);
    if (existingIndex >= 0) {
      currentEvents[existingIndex] = mappedEvent;
    } else {
      currentEvents.push(mappedEvent);
    }

    this.notifyListeners('events', currentEvents, {
      authorId: row.created_by_user_id,
      table: 'calendar_events',
      eventType,
      entityId: mappedEvent.id,
    });
  }

  private handleHabitRealtime(payload: any): void {
    const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
    const row = payload.new || payload.old;
    if (!row) return;

    // Strict Privacy enforcement: If habit is private and created by the other adult, ignore
    if (row.is_private && row.created_by_user_id && row.created_by_user_id !== this.currentUser?.id) {
      return;
    }

    const localTimestamp = this.recentLocalMutations.get(`habit_${row.id}`);
    if (localTimestamp && Date.now() - localTimestamp < 2000) return;

    const currentHabits = [...this.cachedState.habits];

    if (eventType === 'DELETE') {
      const filtered = currentHabits.filter((h) => h.id !== row.id);
      this.notifyListeners('habits', filtered, {
        authorId: payload.old?.created_by_user_id,
        table: 'habits',
        eventType: 'DELETE',
        entityId: row.id,
      });
      return;
    }

    const mappedHabit: Habit = row.data && Object.keys(row.data).length > 0
      ? {
          ...row.data,
          id: row.id,
          title: row.title ?? row.data.title,
          type: row.type ?? row.data.type,
          category: row.category ?? row.data.category,
          memberId: row.member_id ?? row.data.memberId,
          childId: row.child_id ?? row.data.childId,
          isPrivate: row.is_private ?? row.data.isPrivate,
          active: row.active ?? row.data.active,
          completedDates: Array.isArray(row.completed_dates) ? row.completed_dates : row.data.completedDates || [],
        }
      : {
          id: row.id,
          title: row.title,
          type: row.type || 'personal',
          category: row.category || 'wellness',
          memberId: row.member_id,
          childId: row.child_id,
          isPrivate: row.is_private ?? false,
          active: row.active ?? true,
          reminderEnabled: row.reminder_enabled ?? false,
          reminderTime: row.reminder_time,
          frequency: row.frequency || 'daily',
          customDays: row.custom_days || [],
          points: row.points || 0,
          completedDates: row.completed_dates || [],
          icon: '⭐',
        };

    const existingIndex = currentHabits.findIndex((h) => h.id === mappedHabit.id);
    if (existingIndex >= 0) {
      currentHabits[existingIndex] = mappedHabit;
    } else {
      currentHabits.push(mappedHabit);
    }

    this.notifyListeners('habits', currentHabits, {
      authorId: row.created_by_user_id,
      table: 'habits',
      eventType,
      entityId: mappedHabit.id,
    });
  }

  private handleExpenseRealtime(payload: any): void {
    const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
    const row = payload.new || payload.old;
    if (!row) return;

    // Strict Privacy: Personal expenses of the other adult must not appear
    if (row.scope === 'personal' && row.created_by_user_id && row.created_by_user_id !== this.currentUser?.id) {
      return;
    }

    const localTimestamp = this.recentLocalMutations.get(`expense_${row.id}`);
    if (localTimestamp && Date.now() - localTimestamp < 2000) return;

    const currentExpenses = [...this.cachedState.expenses];

    if (eventType === 'DELETE') {
      const filtered = currentExpenses.filter((e) => e.id !== row.id);
      this.notifyListeners('expenses', filtered, {
        authorId: payload.old?.created_by_user_id,
        table: 'finances_expenses',
        eventType: 'DELETE',
        entityId: row.id,
      });
      return;
    }

    const mappedExpense: Expense = row.data && Object.keys(row.data).length > 0
      ? { ...row.data, id: row.id, amount: Number(row.amount ?? row.data.amount) }
      : {
          id: row.id,
          description: row.description,
          amount: Number(row.amount),
          date: row.date,
          categoryKey: row.category_key,
          responsibleId: row.responsible_id,
          paymentMethod: row.payment_method || 'debit',
          isRecurring: row.is_recurring ?? false,
          scope: row.scope || 'family',
        };

    const existingIndex = currentExpenses.findIndex((e) => e.id === mappedExpense.id);
    if (existingIndex >= 0) {
      currentExpenses[existingIndex] = mappedExpense;
    } else {
      currentExpenses.unshift(mappedExpense);
    }

    this.notifyListeners('expenses', currentExpenses, {
      authorId: row.created_by_user_id,
      table: 'finances_expenses',
      eventType,
      entityId: mappedExpense.id,
    });
  }

  private handleIncomeRealtime(payload: any): void {
    const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
    const row = payload.new || payload.old;
    if (!row) return;

    if (row.scope === 'personal' && row.created_by_user_id && row.created_by_user_id !== this.currentUser?.id) {
      return;
    }

    const localTimestamp = this.recentLocalMutations.get(`income_${row.id}`);
    if (localTimestamp && Date.now() - localTimestamp < 2000) return;

    const currentIncomes = [...this.cachedState.incomes];

    if (eventType === 'DELETE') {
      const filtered = currentIncomes.filter((i) => i.id !== row.id);
      this.notifyListeners('incomes', filtered, {
        authorId: payload.old?.created_by_user_id,
        table: 'finances_incomes',
        eventType: 'DELETE',
        entityId: row.id,
      });
      return;
    }

    const mappedIncome: Income = row.data && Object.keys(row.data).length > 0
      ? { ...row.data, id: row.id, amount: Number(row.amount ?? row.data.amount) }
      : {
          id: row.id,
          sourceKey: row.source_key,
          description: row.description,
          amount: Number(row.amount),
          date: row.date,
          responsibleId: row.responsible_id,
          isRecurring: row.is_recurring ?? false,
          frequency: row.frequency,
          scope: row.scope || 'family',
        };

    const existingIndex = currentIncomes.findIndex((i) => i.id === mappedIncome.id);
    if (existingIndex >= 0) {
      currentIncomes[existingIndex] = mappedIncome;
    } else {
      currentIncomes.unshift(mappedIncome);
    }

    this.notifyListeners('incomes', currentIncomes, {
      authorId: row.created_by_user_id,
      table: 'finances_incomes',
      eventType,
      entityId: mappedIncome.id,
    });
  }

  private handleBillRealtime(payload: any): void {
    const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
    const row = payload.new || payload.old;
    if (!row) return;

    const currentBills = [...this.cachedState.bills];
    if (eventType === 'DELETE') {
      this.notifyListeners('bills', currentBills.filter((b) => b.id !== row.id));
      return;
    }

    const mappedBill: Bill = row.data && Object.keys(row.data).length > 0
      ? { ...row.data, id: row.id, status: row.status ?? row.data.status }
      : {
          id: row.id,
          name: row.name,
          amount: Number(row.amount),
          dueDate: row.due_date,
          categoryKey: row.category_key,
          responsibleId: row.responsible_id,
          recurrence: row.recurrence || 'monthly',
          status: row.status || 'pending',
          paidDate: row.paid_date,
          scope: row.scope || 'family',
        };

    const idx = currentBills.findIndex((b) => b.id === mappedBill.id);
    if (idx >= 0) currentBills[idx] = mappedBill;
    else currentBills.push(mappedBill);

    this.notifyListeners('bills', currentBills, {
      authorId: row.created_by_user_id,
      table: 'finances_bills',
      eventType,
      entityId: mappedBill.id,
    });
  }

  private handleDebtRealtime(payload: any): void {
    const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
    const row = payload.new || payload.old;
    if (!row) return;

    const currentDebts = [...this.cachedState.debts];
    if (eventType === 'DELETE') {
      this.notifyListeners('debts', currentDebts.filter((d) => d.id !== row.id));
      return;
    }

    const mappedDebt: Debt = row.data && Object.keys(row.data).length > 0
      ? { ...row.data, id: row.id, pendingBalance: Number(row.pending_balance ?? row.data.pendingBalance) }
      : {
          id: row.id,
          name: row.name,
          creditor: row.creditor,
          originalAmount: Number(row.original_amount),
          pendingBalance: Number(row.pending_balance),
          installmentAmount: Number(row.installment_amount),
          paymentDay: row.payment_day,
          frequency: row.frequency || 'monthly',
          responsibleId: row.responsible_id,
          notes: row.notes,
          scope: row.scope || 'family',
        };

    const idx = currentDebts.findIndex((d) => d.id === mappedDebt.id);
    if (idx >= 0) currentDebts[idx] = mappedDebt;
    else currentDebts.push(mappedDebt);

    this.notifyListeners('debts', currentDebts, {
      authorId: row.created_by_user_id,
      table: 'finances_debts',
      eventType,
      entityId: mappedDebt.id,
    });
  }

  private handleBudgetRealtime(payload: any): void {
    const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
    const row = payload.new || payload.old;
    if (!row) return;

    const currentBudgets = [...this.cachedState.budgets];
    if (eventType === 'DELETE') {
      this.notifyListeners('budgets', currentBudgets.filter((b) => b.id !== row.id));
      return;
    }

    const mappedBudget: Budget = row.data && Object.keys(row.data).length > 0
      ? { ...row.data, id: row.id, monthlyLimit: Number(row.monthly_limit ?? row.data.monthlyLimit) }
      : {
          id: row.id,
          categoryKey: row.category_key,
          monthlyLimit: Number(row.monthly_limit),
          responsibleId: row.responsible_id || 'family',
        };

    const idx = currentBudgets.findIndex((b) => b.id === mappedBudget.id);
    if (idx >= 0) currentBudgets[idx] = mappedBudget;
    else currentBudgets.push(mappedBudget);

    this.notifyListeners('budgets', currentBudgets, {
      authorId: row.created_by_user_id,
      table: 'finances_budgets',
      eventType,
      entityId: mappedBudget.id,
    });
  }

  private handleGoalRealtime(payload: any): void {
    const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
    const row = payload.new || payload.old;
    if (!row) return;

    const currentGoals = [...this.cachedState.goals];
    if (eventType === 'DELETE') {
      this.notifyListeners('goals', currentGoals.filter((g) => g.id !== row.id));
      return;
    }

    const mappedGoal: FinancialGoal = row.data && Object.keys(row.data).length > 0
      ? {
          ...row.data,
          id: row.id,
          targetAmount: Number(row.target_amount ?? row.data.targetAmount),
          currentAmount: Number(row.current_amount ?? row.data.currentAmount),
        }
      : {
          id: row.id,
          name: row.name,
          targetAmount: Number(row.target_amount),
          currentAmount: Number(row.current_amount || 0),
          targetDate: row.target_date,
          category: row.category || 'family',
          responsibleId: row.responsible_id || 'family',
        };

    const idx = currentGoals.findIndex((g) => g.id === mappedGoal.id);
    if (idx >= 0) currentGoals[idx] = mappedGoal;
    else currentGoals.push(mappedGoal);

    this.notifyListeners('goals', currentGoals, {
      authorId: row.created_by_user_id,
      table: 'finances_goals',
      eventType,
      entityId: mappedGoal.id,
    });
  }

  private handleHealthRealtime(payload: any): void {
    const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
    const row = payload.new || payload.old;
    if (!row) return;

    let key: 'appointments' | 'medications' | 'doseLogs' | 'pediatricQueries' | 'vaccineRecords' = 'vaccineRecords';
    if (this.cachedState.appointments?.some((i) => i.id === row.id)) key = 'appointments';
    else if (this.cachedState.medications?.some((i) => i.id === row.id)) key = 'medications';
    else if (this.cachedState.doseLogs?.some((i) => i.id === row.id)) key = 'doseLogs';
    else if (this.cachedState.pediatricQueries?.some((i) => i.id === row.id)) key = 'pediatricQueries';
    else if (this.cachedState.vaccineRecords?.some((i) => i.id === row.id)) key = 'vaccineRecords';
    else if (row.record_type === 'appointment') key = 'appointments';
    else if (row.record_type === 'medication') key = 'medications';
    else if (row.record_type === 'dose_log') key = 'doseLogs';
    else if (row.record_type === 'pediatric_query') key = 'pediatricQueries';

    const currentList = [...((this.cachedState[key] || []) as any[])];

    if (eventType === 'DELETE') {
      this.notifyListeners(key, currentList.filter((item) => item.id !== row.id));
      return;
    }

    const item = { ...row.data, id: row.id };
    const idx = currentList.findIndex((i) => i.id === item.id);
    if (idx >= 0) currentList[idx] = item;
    else currentList.unshift(item);

    this.notifyListeners(key, currentList, {
      authorId: row.created_by_user_id,
      table: 'health_records',
      eventType,
      entityId: item.id,
    });
  }

  private handleCoupleRealtime(payload: any): void {
    const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
    const row = payload.new || payload.old;
    if (!row) return;

    let key:
      | 'coupleCheckIns'
      | 'coupleConversations'
      | 'coupleDates'
      | 'coupleGestures'
      | 'coupleAgreements'
      | 'coupleSpiritualItems'
      | 'cuquiTimeSessions'
      | 'coupleMemories' = 'coupleMemories';

    if (this.cachedState.coupleCheckIns?.some((i) => i.id === row.id)) key = 'coupleCheckIns';
    else if (this.cachedState.coupleConversations?.some((i) => i.id === row.id)) key = 'coupleConversations';
    else if (this.cachedState.coupleDates?.some((i) => i.id === row.id)) key = 'coupleDates';
    else if (this.cachedState.coupleGestures?.some((i) => i.id === row.id)) key = 'coupleGestures';
    else if (this.cachedState.coupleAgreements?.some((i) => i.id === row.id)) key = 'coupleAgreements';
    else if (this.cachedState.coupleSpiritualItems?.some((i) => i.id === row.id)) key = 'coupleSpiritualItems';
    else if (this.cachedState.cuquiTimeSessions?.some((i) => i.id === row.id)) key = 'cuquiTimeSessions';
    else if (this.cachedState.coupleMemories?.some((i) => i.id === row.id)) key = 'coupleMemories';
    else if (row.item_type === 'check_in') key = 'coupleCheckIns';
    else if (row.item_type === 'conversation') key = 'coupleConversations';
    else if (row.item_type === 'date') key = 'coupleDates';
    else if (row.item_type === 'gesture') key = 'coupleGestures';
    else if (row.item_type === 'agreement') key = 'coupleAgreements';
    else if (row.item_type === 'spiritual') key = 'coupleSpiritualItems';
    else if (row.item_type === 'cuqui_time') key = 'cuquiTimeSessions';

    const currentList = [...((this.cachedState[key] || []) as any[])];

    if (eventType === 'DELETE') {
      this.notifyListeners(key, currentList.filter((item) => item.id !== row.id));
      return;
    }

    const item = { ...row.data, id: row.id };
    const idx = currentList.findIndex((i) => i.id === item.id);
    if (idx >= 0) currentList[idx] = item;
    else currentList.unshift(item);

    this.notifyListeners(key, currentList, {
      authorId: row.created_by_user_id,
      table: 'couple_records',
      eventType,
      entityId: item.id,
    });
  }

  private handleHomeRealtime(payload: any): void {
    const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
    const row = payload.new || payload.old;
    if (!row) return;

    if (row.record_type === 'reset_session' || this.cachedState.resetSession?.id === row.id) {
      if (eventType === 'DELETE') {
        this.cachedState.resetSession = null;
        this.notifyListeners('resetSession', null, {
          authorId: row.created_by_user_id,
          table: 'home_records',
          eventType,
          entityId: row.id,
        });
      } else {
        const item = { ...row.data, id: row.id };
        this.cachedState.resetSession = item;
        this.notifyListeners('resetSession', item, {
          authorId: row.created_by_user_id,
          table: 'home_records',
          eventType,
          entityId: row.id,
        });
      }
      return;
    }

    let key: 'shoppingItems' | 'cleaningTasks' | 'maintenanceTasks' | 'resetMissions' | 'homeAreas' = 'resetMissions';
    if (this.cachedState.shoppingItems?.some((i) => i.id === row.id)) key = 'shoppingItems';
    else if (this.cachedState.cleaningTasks?.some((i) => i.id === row.id)) key = 'cleaningTasks';
    else if (this.cachedState.maintenanceTasks?.some((i) => i.id === row.id)) key = 'maintenanceTasks';
    else if (this.cachedState.homeAreas?.some((i) => i.id === row.id)) key = 'homeAreas';
    else if (this.cachedState.resetMissions?.some((i) => i.id === row.id)) key = 'resetMissions';
    else if (row.record_type === 'shopping') key = 'shoppingItems';
    else if (row.record_type === 'cleaning') key = 'cleaningTasks';
    else if (row.record_type === 'maintenance') key = 'maintenanceTasks';
    else if (row.record_type === 'area') key = 'homeAreas';

    const currentList = [...((this.cachedState[key] || []) as any[])];

    if (eventType === 'DELETE') {
      this.notifyListeners(key, currentList.filter((item) => item.id !== row.id));
      return;
    }

    const item = { ...row.data, id: row.id };
    const idx = currentList.findIndex((i) => i.id === item.id);
    if (idx >= 0) currentList[idx] = item;
    else currentList.unshift(item);

    this.notifyListeners(key, currentList, {
      authorId: row.created_by_user_id,
      table: 'home_records',
      eventType,
      entityId: item.id,
    });
  }

  private handleNotificationRealtime(payload: any): void {
    const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
    const row = payload.new || payload.old;
    if (!row || eventType === 'DELETE') return;

    // Dispatch notification to listeners
    this.notifyListeners('reminders', this.cachedState.reminders, {
      authorId: row.created_by_user_id,
      table: 'notifications',
      eventType,
      entityId: row.id,
    });
  }

  private handleCustomizationsRealtime(payload: any): void {
    const row = payload.new;
    if (!row) return;

    // Check if this was a recent local mutation from this device to prevent echo loop
    const localTimestamp = this.recentLocalMutations.get(`customizations_${row.family_id}`);
    if (localTimestamp && Date.now() - localTimestamp < 2500) {
      return;
    }

    if (row.config) {
      const mergedConfig = { ...this.cachedState.config, ...row.config };
      this.cachedState.config = mergedConfig;
      storageService.saveStateKey('config', mergedConfig);
      this.notifyListeners('config', mergedConfig, {
        table: 'app_customizations',
        eventType: payload.eventType,
        entityId: row.id,
      });
    }

    if (row.theme_preferences) {
      const mergedThemes = { ...this.cachedState.themePreferences, ...row.theme_preferences };
      this.cachedState.themePreferences = mergedThemes;
      storageService.saveStateKey('themePreferences', mergedThemes);
      this.notifyListeners('themePreferences', mergedThemes, {
        table: 'app_customizations',
        eventType: payload.eventType,
        entityId: row.id,
      });
    }

    if (row.notification_preferences) {
      const mergedNotifs = { ...this.cachedState.notificationPreferences, ...row.notification_preferences };
      this.cachedState.notificationPreferences = mergedNotifs;
      storageService.saveStateKey('notificationPreferences', mergedNotifs);
      this.notifyListeners('notificationPreferences', mergedNotifs, {
        table: 'app_customizations',
        eventType: payload.eventType,
        entityId: row.id,
      });
    }
  }

  private handleRewardRealtime(payload: any): void {
    const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
    const row = payload.new || payload.old;
    if (!row) return;

    const currentRewards = [...this.cachedState.rewards];
    if (eventType === 'DELETE') {
      this.notifyListeners('rewards', currentRewards.filter((r) => r.id !== row.id));
      return;
    }

    const item = { ...row.data, id: row.id, title: row.title ?? row.data?.title };
    const idx = currentRewards.findIndex((r) => r.id === item.id);
    if (idx >= 0) currentRewards[idx] = item;
    else currentRewards.push(item);

    this.notifyListeners('rewards', currentRewards);
  }

  private handlePointsHistoryRealtime(payload: any): void {
    if (payload.eventType === 'INSERT') {
      const row = payload.new;
      const item: PointsHistoryEntry = row.data && Object.keys(row.data).length > 0
        ? { ...row.data, id: row.id }
        : {
            id: row.id,
            childId: row.child_id,
            childName: row.data?.childName || 'Niño',
            points: row.points,
            description: row.reason || row.data?.description || '',
            date: row.date,
          };
      const current = [item, ...this.cachedState.pointsHistory];
      this.notifyListeners('pointsHistory', current);
    }
  }

  private handleMemberRealtime(payload: any): void {
    const row = payload.new || payload.old;
    if (!row) return;

    const currentMembers = [...this.cachedState.members];
    if (payload.eventType === 'DELETE') {
      this.notifyListeners('members', currentMembers.filter((m) => m.id !== row.id));
      return;
    }

    const member: FamilyMember = row.data && Object.keys(row.data).length > 0
      ? { ...row.data, id: row.id, points: row.points ?? row.data.points }
      : {
          id: row.id,
          name: row.name,
          role: row.role,
          relationship: row.relationship,
          age: row.age,
          birthDate: row.birth_date,
          avatarColor: row.avatar_color,
          avatarEmoji: row.avatar_emoji,
          points: row.points || 0,
          notes: row.notes,
        };

    const idx = currentMembers.findIndex((m) => m.id === member.id);
    if (idx >= 0) currentMembers[idx] = member;
    else currentMembers.push(member);

    this.notifyListeners('members', currentMembers);
  }

  // ----------------------------------------------------------------------------
  // Remote State Fetching & Initial Family Seeding
  // ----------------------------------------------------------------------------

  private async fetchRemoteState(familyId: string, currentUserId: string): Promise<FullAppState> {
    if (!supabase) return this.cachedState;

    const state: FullAppState = { ...this.cachedState };

    // Parallel fetch of family tables
    const [
      membersRes,
      tasksRes,
      eventsRes,
      habitsRes,
      expensesRes,
      incomesRes,
      billsRes,
      debtsRes,
      budgetsRes,
      goalsRes,
      healthRes,
      coupleRes,
      homeRes,
      rewardsRes,
      pointsRes,
      customRes,
    ] = await Promise.all([
      supabase.from('family_members').select('*').eq('family_id', familyId),
      supabase.from('tasks').select('*').eq('family_id', familyId),
      supabase.from('calendar_events').select('*').eq('family_id', familyId),
      supabase.from('habits').select('*').eq('family_id', familyId),
      supabase.from('finances_expenses').select('*').eq('family_id', familyId),
      supabase.from('finances_incomes').select('*').eq('family_id', familyId),
      supabase.from('finances_bills').select('*').eq('family_id', familyId),
      supabase.from('finances_debts').select('*').eq('family_id', familyId),
      supabase.from('finances_budgets').select('*').eq('family_id', familyId),
      supabase.from('finances_goals').select('*').eq('family_id', familyId),
      supabase.from('health_records').select('*').eq('family_id', familyId),
      supabase.from('couple_records').select('*').eq('family_id', familyId),
      supabase.from('home_records').select('*').eq('family_id', familyId),
      supabase.from('rewards').select('*').eq('family_id', familyId),
      supabase.from('points_history').select('*').eq('family_id', familyId),
      supabase.from('app_customizations').select('*').eq('family_id', familyId).maybeSingle(),
    ]);

    // Members
    if (membersRes.data && membersRes.data.length > 0) {
      state.members = membersRes.data.map((r: any) =>
        r.data && Object.keys(r.data).length > 0
          ? { ...r.data, id: r.id, points: r.points ?? r.data.points }
          : {
              id: r.id,
              name: r.name,
              role: r.role,
              relationship: r.relationship,
              age: r.age,
              birthDate: r.birth_date,
              avatarColor: r.avatar_color,
              avatarEmoji: r.avatar_emoji,
              points: r.points || 0,
              notes: r.notes,
            }
      );
    }

    // Tasks
    if (tasksRes.data) {
      state.tasks = tasksRes.data.map((r: any) =>
        r.data && Object.keys(r.data).length > 0
          ? {
              ...r.data,
              id: r.id,
              title: r.title ?? r.data.title,
              status: r.status ?? r.data.status,
              priority: r.priority ?? r.data.priority,
              responsibleId: r.assigned_to ?? r.data.responsibleId,
              date: r.due_date ?? r.data.date,
            }
          : {
              id: r.id,
              title: r.title,
              description: r.description || '',
              responsibleId: r.assigned_to || 'family',
              categoryKey: r.category_key || 'other',
              date: r.due_date || new Date().toISOString().split('T')[0],
              priority: r.priority || 'medium',
              status: r.status || 'pending',
              createdAt: r.created_at || new Date().toISOString(),
            }
      );
    }

    // Events
    if (eventsRes.data) {
      state.events = eventsRes.data.map((r: any) =>
        r.data && Object.keys(r.data).length > 0
          ? {
              ...r.data,
              id: r.id,
              title: r.title ?? r.data.title,
              date: r.date ?? r.data.date,
              startTime: r.time ?? r.data.startTime,
              eventTypeKey: r.category_key ?? r.data.eventTypeKey,
              memberId: r.responsible_id ?? r.data.memberId,
              allDay: r.is_all_day ?? r.data.allDay,
            }
          : {
              id: r.id,
              title: r.title,
              description: r.description || '',
              date: r.date,
              startTime: r.time,
              eventTypeKey: r.category_key || 'other',
              memberId: r.responsible_id || 'family',
              allDay: r.is_all_day ?? false,
            }
      );
    }

    // Habits (Filtered by privacy in addition to RLS)
    if (habitsRes.data) {
      state.habits = habitsRes.data
        .filter((r: any) => !r.is_private || r.created_by_user_id === currentUserId)
        .map((r: any) =>
          r.data && Object.keys(r.data).length > 0
            ? {
                ...r.data,
                id: r.id,
                title: r.title ?? r.data.title,
                type: r.type ?? r.data.type,
                category: r.category ?? r.data.category,
                memberId: r.member_id ?? r.data.memberId,
                childId: r.child_id ?? r.data.childId,
                isPrivate: r.is_private ?? r.data.isPrivate,
                active: r.active ?? r.data.active,
                completedDates: Array.isArray(r.completed_dates) ? r.completed_dates : r.data.completedDates || [],
              }
            : {
                id: r.id,
                title: r.title,
                type: r.type || 'personal',
                category: r.category || 'wellness',
                memberId: r.member_id,
                childId: r.child_id,
                isPrivate: r.is_private ?? false,
                active: r.active ?? true,
                reminderEnabled: r.reminder_enabled ?? false,
                reminderTime: r.reminder_time,
                frequency: r.frequency || 'daily',
                customDays: r.custom_days || [],
                points: r.points || 0,
                completedDates: r.completed_dates || [],
                icon: '⭐',
              }
        );
    }

    // Finances
    if (expensesRes.data) {
      state.expenses = expensesRes.data
        .filter((r: any) => r.scope !== 'personal' || r.created_by_user_id === currentUserId)
        .map((r: any) =>
          r.data && Object.keys(r.data).length > 0
            ? { ...r.data, id: r.id, amount: Number(r.amount ?? r.data.amount) }
            : {
                id: r.id,
                description: r.description,
                amount: Number(r.amount),
                date: r.date,
                categoryKey: r.category_key,
                responsibleId: r.responsible_id,
                paymentMethod: r.payment_method || 'debit',
                isRecurring: r.is_recurring ?? false,
                scope: r.scope || 'family',
              }
        );
    }

    if (incomesRes.data) {
      state.incomes = incomesRes.data
        .filter((r: any) => r.scope !== 'personal' || r.created_by_user_id === currentUserId)
        .map((r: any) =>
          r.data && Object.keys(r.data).length > 0
            ? { ...r.data, id: r.id, amount: Number(r.amount ?? r.data.amount) }
            : {
                id: r.id,
                sourceKey: r.source_key,
                description: r.description,
                amount: Number(r.amount),
                date: r.date,
                responsibleId: r.responsible_id,
                isRecurring: r.is_recurring ?? false,
                frequency: r.frequency,
                scope: r.scope || 'family',
              }
        );
    }

    if (billsRes.data) {
      state.bills = billsRes.data.map((r: any) =>
        r.data && Object.keys(r.data).length > 0
          ? { ...r.data, id: r.id, status: r.status ?? r.data.status }
          : {
              id: r.id,
              name: r.name,
              amount: Number(r.amount),
              dueDate: r.due_date,
              categoryKey: r.category_key,
              responsibleId: r.responsible_id,
              recurrence: r.recurrence || 'monthly',
              status: r.status || 'pending',
              paidDate: r.paid_date,
              scope: r.scope || 'family',
            }
      );
    }

    if (debtsRes.data) {
      state.debts = debtsRes.data.map((r: any) =>
        r.data && Object.keys(r.data).length > 0
          ? { ...r.data, id: r.id, pendingBalance: Number(r.pending_balance ?? r.data.pendingBalance) }
          : {
              id: r.id,
              name: r.name,
              creditor: r.creditor,
              originalAmount: Number(r.original_amount),
              pendingBalance: Number(r.pending_balance),
              installmentAmount: Number(r.installment_amount),
              paymentDay: r.payment_day,
              frequency: r.frequency || 'monthly',
              responsibleId: r.responsible_id,
              notes: r.notes,
              scope: r.scope || 'family',
            }
      );
    }

    if (budgetsRes.data) {
      state.budgets = budgetsRes.data.map((r: any) => ({
        ...(r.data || {}),
        id: r.id,
        categoryKey: r.category_key,
        monthlyLimit: Number(r.monthly_limit),
        responsibleId: r.responsible_id,
      }));
    }

    if (goalsRes.data) {
      state.goals = goalsRes.data.map((r: any) => ({
        ...(r.data || {}),
        id: r.id,
        name: r.name,
        targetAmount: Number(r.target_amount),
        currentAmount: Number(r.current_amount || 0),
        targetDate: r.target_date,
        category: r.category,
        responsibleId: r.responsible_id,
      }));
    }

    // Health Records unpacking
    if (healthRes.data) {
      const appointments: MedicalAppointment[] = [];
      const medications: Medication[] = [];
      const doseLogs: MedicationDoseLog[] = [];
      const pediatricQueries: PediatricQuery[] = [];
      const vaccineRecords: VaccineRecord[] = [];

      for (const row of healthRes.data) {
        const item = { ...row.data, id: row.id };
        if (row.record_type === 'appointment') appointments.push(item as MedicalAppointment);
        else if (row.record_type === 'medication') medications.push(item as Medication);
        else if (row.record_type === 'dose_log') doseLogs.push(item as MedicationDoseLog);
        else if (row.record_type === 'pediatric_query') pediatricQueries.push(item as PediatricQuery);
        else if (row.record_type === 'vaccine') vaccineRecords.push(item as VaccineRecord);
      }

      state.appointments = appointments;
      state.medications = medications;
      state.doseLogs = doseLogs;
      state.pediatricQueries = pediatricQueries;
      state.vaccineRecords = vaccineRecords;
    }

    // Home Records unpacking
    if (homeRes.data) {
      const shopping: ShoppingItem[] = [];
      const cleaning: CleaningTask[] = [];
      const maintenance: MaintenanceTask[] = [];
      const areas: HomeArea[] = [];
      const reset: any[] = [];
      let resetSession: FamilyResetSession | null = null;

      for (const row of homeRes.data) {
        const item = { ...row.data, id: row.id };
        if (row.record_type === 'shopping') shopping.push(item as ShoppingItem);
        else if (row.record_type === 'cleaning') cleaning.push(item as CleaningTask);
        else if (row.record_type === 'maintenance') maintenance.push(item as MaintenanceTask);
        else if (row.record_type === 'area') areas.push(item as HomeArea);
        else if (row.record_type === 'reset_mission') reset.push(item);
        else if (row.record_type === 'reset_session') resetSession = item as FamilyResetSession;
      }

      state.shoppingItems = shopping;
      state.cleaningTasks = cleaning;
      state.maintenanceTasks = maintenance;
      if (areas.length > 0) {
        state.homeAreas = areas;
      } else if (customRes.data?.config?.homeAreas && Array.isArray(customRes.data.config.homeAreas) && customRes.data.config.homeAreas.length > 0) {
        state.homeAreas = customRes.data.config.homeAreas;
      } else {
        state.homeAreas = DEFAULT_HOME_AREAS;
      }
      state.resetMissions = reset;
      state.resetSession = resetSession;
    }

    // Couple Records unpacking
    if (coupleRes.data) {
      const checkIns: CoupleCheckIn[] = [];
      const convs: CoupleConversation[] = [];
      const dates: CoupleDate[] = [];
      const gestures: CoupleGesture[] = [];
      const agreements: CoupleAgreement[] = [];
      const spiritual: CoupleSpiritualItem[] = [];
      const cuqui: CuquiTimeSession[] = [];
      const memories: CoupleMemory[] = [];

      for (const row of coupleRes.data) {
        const item = { ...row.data, id: row.id };
        if (row.item_type === 'check_in') checkIns.push(item as CoupleCheckIn);
        else if (row.item_type === 'conversation') convs.push(item as CoupleConversation);
        else if (row.item_type === 'date') dates.push(item as CoupleDate);
        else if (row.item_type === 'gesture') gestures.push(item as CoupleGesture);
        else if (row.item_type === 'agreement') agreements.push(item as CoupleAgreement);
        else if (row.item_type === 'spiritual') spiritual.push(item as CoupleSpiritualItem);
        else if (row.item_type === 'cuqui_time') cuqui.push(item as CuquiTimeSession);
        else if (row.item_type === 'memory') memories.push(item as CoupleMemory);
      }

      state.coupleCheckIns = checkIns;
      state.coupleConversations = convs;
      state.coupleDates = dates;
      state.coupleGestures = gestures;
      state.coupleAgreements = agreements;
      state.coupleSpiritualItems = spiritual;
      state.cuquiTimeSessions = cuqui;
      state.coupleMemories = memories;
    }

    // Rewards & Points
    if (rewardsRes.data) {
      state.rewards = rewardsRes.data.map((r: any) => ({
        ...(r.data || {}),
        id: r.id,
        title: r.title,
        pointsCost: r.points_cost,
        category: r.category,
        icon: r.icon,
        active: r.active,
      }));
    }

    if (pointsRes.data) {
      state.pointsHistory = pointsRes.data.map((r: any) => ({
        ...(r.data || {}),
        id: r.id,
        childId: r.child_id,
        points: r.points,
        reason: r.reason,
        date: r.date,
      }));
    }

    // App Customizations
    if (customRes.data) {
      if (customRes.data.config && Object.keys(customRes.data.config).length > 0) {
        state.config = customRes.data.config as AppCustomizationConfig;
      }
      if (customRes.data.theme_preferences) {
        state.themePreferences = customRes.data.theme_preferences as Record<string, ProfileThemePreference>;
      }
      if (customRes.data.notification_preferences) {
        state.notificationPreferences = customRes.data.notification_preferences as NotificationPreferencesState;
      }
    }

    return state;
  }

  /**
   * Seeds initial default data into Supabase when a family is created for the first time
   */
  private async seedNewFamilyData(familyId: string, user: AuthUser): Promise<void> {
    if (!supabase) return;
    const now = new Date().toISOString();

    try {
      // 1. Members
      const memberRows = initialMembers.map((m) => ({
        id: m.id,
        family_id: familyId,
        name: m.name,
        role: m.role,
        relationship: m.relationship,
        age: m.age || null,
        birth_date: m.birthDate || null,
        avatar_color: m.avatarColor,
        avatar_emoji: m.avatarEmoji,
        points: m.points || 0,
        notes: m.notes || null,
        data: m,
        updated_at: now,
      }));
      await supabase.from('family_members').upsert(memberRows, { onConflict: 'family_id,id' });

      // 2. Initial Tasks
      const taskRows = initialTasks.map((t) => ({
        id: t.id,
        family_id: familyId,
        title: t.title,
        description: t.description || null,
        assigned_to: t.responsibleId || 'family',
        category_key: t.categoryKey || 'other',
        priority: t.priority || 'medium',
        status: t.status || 'pending',
        due_date: t.date || null,
        created_by: t.responsibleId || 'family',
        created_by_user_id: user.id,
        data: t,
        updated_at: now,
      }));
      await supabase.from('tasks').upsert(taskRows, { onConflict: 'family_id,id' });

      // 3. Initial Events
      const eventRows = initialEvents.map((e) => ({
        id: e.id,
        family_id: familyId,
        title: e.title,
        description: e.description || null,
        date: e.date,
        time: e.startTime || null,
        category_key: e.eventTypeKey || 'other',
        responsible_id: e.memberId || 'family',
        is_all_day: e.allDay ?? false,
        created_by: e.memberId || 'family',
        created_by_user_id: user.id,
        data: e,
        updated_at: now,
      }));
      await supabase.from('calendar_events').upsert(eventRows, { onConflict: 'family_id,id' });

      // 4. Initial Habits
      const habitRows = initialHabits.map((h) => ({
        id: h.id,
        family_id: familyId,
        title: h.title,
        type: h.type,
        category: h.category,
        member_id: h.memberId || null,
        child_id: h.childId || null,
        is_private: h.isPrivate ?? false,
        active: h.active ?? true,
        reminder_enabled: h.reminderEnabled ?? false,
        reminder_time: h.reminderTime || null,
        frequency: h.frequency || 'daily',
        custom_days: h.customDays || [],
        points: h.points || 0,
        completed_dates: h.completedDates || [],
        created_by_user_id: user.id,
        data: h,
        updated_at: now,
      }));
      await supabase.from('habits').upsert(habitRows, { onConflict: 'family_id,id' });

      // 5. Initial Finances (Expenses, Incomes, Bills, Debts, Budgets, Goals)
      if (initialExpenses.length > 0) {
        const expRows = initialExpenses.map((e) => ({
          id: e.id,
          family_id: familyId,
          description: e.description,
          amount: e.amount,
          date: e.date,
          category_key: e.categoryKey,
          responsible_id: e.responsibleId,
          payment_method: e.paymentMethod || 'debit',
          is_recurring: e.isRecurring ?? false,
          scope: e.scope || 'family',
          created_by_user_id: user.id,
          data: e,
          updated_at: now,
        }));
        await supabase.from('finances_expenses').upsert(expRows, { onConflict: 'family_id,id' });
      }

      if (initialIncomes.length > 0) {
        const incRows = initialIncomes.map((i) => ({
          id: i.id,
          family_id: familyId,
          source_key: i.sourceKey,
          description: i.description,
          amount: i.amount,
          date: i.date,
          responsible_id: i.responsibleId,
          is_recurring: i.isRecurring ?? false,
          frequency: i.frequency || null,
          scope: i.scope || 'family',
          created_by_user_id: user.id,
          data: i,
          updated_at: now,
        }));
        await supabase.from('finances_incomes').upsert(incRows, { onConflict: 'family_id,id' });
      }

      if (initialBills.length > 0) {
        const billRows = initialBills.map((b) => ({
          id: b.id,
          family_id: familyId,
          name: b.name,
          amount: b.amount,
          due_date: b.dueDate,
          category_key: b.categoryKey,
          responsible_id: b.responsibleId,
          recurrence: b.recurrence || 'monthly',
          status: b.status || 'pending',
          paid_date: b.paidDate || null,
          scope: b.scope || 'family',
          created_by_user_id: user.id,
          data: b,
          updated_at: now,
        }));
        await supabase.from('finances_bills').upsert(billRows, { onConflict: 'family_id,id' });
      }

      if (initialDebts.length > 0) {
        const debtRows = initialDebts.map((d) => ({
          id: d.id,
          family_id: familyId,
          name: d.name,
          creditor: d.creditor,
          original_amount: d.originalAmount,
          pending_balance: d.pendingBalance,
          installment_amount: d.installmentAmount,
          payment_day: d.paymentDay,
          frequency: d.frequency || 'monthly',
          responsible_id: d.responsibleId,
          notes: d.notes || null,
          scope: d.scope || 'family',
          created_by_user_id: user.id,
          data: d,
          updated_at: now,
        }));
        await supabase.from('finances_debts').upsert(debtRows, { onConflict: 'family_id,id' });
      }

      if (initialBudgets.length > 0) {
        const budgetRows = initialBudgets.map((b) => ({
          id: b.id,
          family_id: familyId,
          category_key: b.categoryKey,
          monthly_limit: b.monthlyLimit,
          responsible_id: b.responsibleId || 'family',
          data: b,
          updated_at: now,
        }));
        await supabase.from('finances_budgets').upsert(budgetRows, { onConflict: 'family_id,id' });
      }

      if (initialGoals.length > 0) {
        const goalRows = initialGoals.map((g) => ({
          id: g.id,
          family_id: familyId,
          name: g.name,
          target_amount: g.targetAmount,
          current_amount: g.currentAmount || 0,
          target_date: g.targetDate || '',
          category: g.category || 'family',
          icon: '🎯',
          responsible_id: g.responsibleId || 'family',
          data: g,
          updated_at: now,
        }));
        await supabase.from('finances_goals').upsert(goalRows, { onConflict: 'family_id,id' });
      }

      // 6. Initial Health Records
      const healthItems = [
        ...initialAppointments.map((a) => ({ id: a.id, record_type: 'appointment', member_id: a.memberId || 'family', data: a })),
        ...initialMedications.map((m) => ({ id: m.id, record_type: 'medication', member_id: m.memberId || 'family', data: m })),
        ...initialDoseLogs.map((d) => ({ id: d.id, record_type: 'dose_log', member_id: d.memberId || 'family', data: d })),
        ...initialPediatricQueries.map((q) => ({ id: q.id, record_type: 'pediatric_query', member_id: q.memberId || 'family', data: q })),
        ...initialVaccines.map((v) => ({ id: v.id, record_type: 'vaccine', member_id: v.memberId || 'family', data: v })),
      ];
      if (healthItems.length > 0) {
        const healthRows = healthItems.map((h) => ({
          id: h.id,
          family_id: familyId,
          record_type: h.record_type,
          member_id: h.member_id,
          data: h.data,
          updated_at: now,
        }));
        await supabase.from('health_records').upsert(healthRows, { onConflict: 'family_id,id' });
      }

      // 7. Initial Home Records
      const homeItems = [
        ...initialShoppingItems.map((s) => ({ id: s.id, record_type: 'shopping', data: s })),
        ...initialCleaningTasks.map((c) => ({ id: c.id, record_type: 'cleaning', data: c })),
        ...initialMaintenanceTasks.map((m) => ({ id: m.id, record_type: 'maintenance', data: m })),
        ...DEFAULT_HOME_AREAS.map((a) => ({ id: a.id, record_type: 'area', data: a })),
        ...initialResetMissions.map((r) => ({ id: r.id, record_type: 'reset_mission', data: r })),
      ];
      if (homeItems.length > 0) {
        const homeRows = homeItems.map((h) => ({
          id: h.id,
          family_id: familyId,
          record_type: h.record_type,
          data: h.data,
          updated_at: now,
        }));
        await supabase.from('home_records').upsert(homeRows, { onConflict: 'family_id,id' });
      }

      // 8. Initial Couple Records
      const coupleItems = [
        ...initialCoupleCheckIns.map((c) => ({ id: c.id, item_type: 'check_in', data: c })),
        ...initialCoupleConversations.map((c) => ({ id: c.id, item_type: 'conversation', data: c })),
        ...initialCoupleDates.map((d) => ({ id: d.id, item_type: 'date', data: d })),
        ...initialCoupleGestures.map((g) => ({ id: g.id, item_type: 'gesture', data: g })),
        ...initialCoupleAgreements.map((a) => ({ id: a.id, item_type: 'agreement', data: a })),
        ...initialCoupleSpiritualItems.map((s) => ({ id: s.id, item_type: 'spiritual', data: s })),
        ...initialCuquiTimeSessions.map((c) => ({ id: c.id, item_type: 'cuqui_time', data: c })),
        ...initialCoupleMemories.map((m) => ({ id: m.id, item_type: 'memory', data: m })),
      ];
      if (coupleItems.length > 0) {
        const coupleRows = coupleItems.map((c) => ({
          id: c.id,
          family_id: familyId,
          item_type: c.item_type,
          data: c.data,
          created_by_user_id: user.id,
          updated_at: now,
        }));
        await supabase.from('couple_records').upsert(coupleRows, { onConflict: 'family_id,id' });
      }

      // 9. Initial Rewards & Points
      if (initialRewards.length > 0) {
        const rewardRows = initialRewards.map((r) => ({
          id: r.id,
          family_id: familyId,
          title: r.title,
          description: r.description || null,
          points_cost: r.pointsCost,
          category: r.category || 'special',
          icon: r.icon || '🎁',
          active: true,
          data: r,
          updated_at: now,
        }));
        await supabase.from('rewards').upsert(rewardRows, { onConflict: 'family_id,id' });
      }

      if (initialPointsHistory.length > 0) {
        const pointsRows = initialPointsHistory.map((p) => ({
          id: p.id,
          family_id: familyId,
          child_id: p.childId,
          points: p.points,
          reason: p.description,
          date: p.date,
          data: p,
        }));
        await supabase.from('points_history').upsert(pointsRows, { onConflict: 'family_id,id' });
      }

      // 10. Initial Customizations
      await supabase.from('app_customizations').upsert(
        {
          family_id: familyId,
          config: initialConfig,
          theme_preferences: {},
          notification_preferences: initialNotificationPreferences,
          updated_at: now,
        },
        { onConflict: 'family_id' }
      );
    } catch (e) {
      console.warn('[SupabaseDataService] Advertencia sembrando datos iniciales en Supabase:', e);
    }
  }
}

export const supabaseDataService = new SupabaseDataService();
