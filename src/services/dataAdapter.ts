import { FullAppState, storageService } from './storageService';
import { DataMode, AuthUser, FamilyAccount, CoAdminLinkPayload } from '../types/auth';

/**
 * Storage Adapter Interface (IDataService)
 * 
 * Abstraction layer separating state management from the concrete persistence mechanism.
 * Allows transparent operation in local demo mode (localStorage) or cloud multi-user mode (API backend),
 * enforcing parity between primary adults (Mamá and Papá) with zero concept of guests.
 */
export interface IDataService {
  mode: DataMode;
  loadFullState(): FullAppState;
  saveStateKey<K extends keyof FullAppState>(key: K, data: FullAppState[K]): void;
  resetToDemo(): FullAppState;
  exportJSON(): string;
  importJSON(jsonString: string): FullAppState | null;

  // Multi-user & Co-administration capabilities
  getCurrentUser(activeProfileId?: string): AuthUser | null;
  getFamilyAccount(): FamilyAccount | null;
  switchMode(mode: DataMode): void;
  linkCoAdmin?(token: string, payload: CoAdminLinkPayload): Promise<{ success: boolean; message: string }>;

  // Cloud & Realtime extensions (Phase 3)
  initCloudSession?(user: AuthUser, family: FamilyAccount): Promise<FullAppState>;
  onRemoteChange?(
    callback: <K extends keyof FullAppState>(
      key: K,
      data: FullAppState[K],
      meta?: {
        authorId?: string;
        table?: string;
        eventType?: 'INSERT' | 'UPDATE' | 'DELETE';
        entityId?: string;
      }
    ) => void
  ): () => void;
  disconnectRealtime?(): void;
  flushOutbox?(): Promise<void>;
}

/**
 * LocalStorageDataService
 * 
 * Implements IDataService using browser localStorage.
 * Used for offline execution, evaluation and demo mode.
 */
export class LocalStorageDataService implements IDataService {
  public mode: DataMode = 'local_demo';

  public loadFullState(): FullAppState {
    return storageService.loadFullState();
  }

  public saveStateKey<K extends keyof FullAppState>(key: K, data: FullAppState[K]): void {
    storageService.saveStateKey(key, data);
  }

  public resetToDemo(): FullAppState {
    return storageService.resetToDemo();
  }

  public exportJSON(): string {
    return storageService.exportJSON();
  }

  public importJSON(jsonString: string): FullAppState | null {
    return storageService.importJSON(jsonString);
  }

  public async flushOutbox(): Promise<void> {
    // No-op in local demo mode
  }

  /**
   * Returns current active adult representing co-administration parity
   */
  public getCurrentUser(activeProfileId: string = 'mama'): AuthUser | null {
    const isPapa = activeProfileId === 'papa';
    return {
      id: isPapa ? 'user_papa_demo' : 'user_mama_demo',
      familyId: 'fam_nuestro_hogar_demo',
      email: isPapa ? 'papa@nuestrohogar.local' : 'mama@nuestrohogar.local',
      name: isPapa ? 'Papá' : 'Mamá',
      role: 'FAMILY_ADULT', // Paridad total: ambos adultos son FAMILY_ADULT
      relationship: isPapa ? 'papa' : 'mama',
      memberId: isPapa ? 'papa' : 'mama',
      avatarColor: isPapa ? '#3b82f6' : '#ec4899',
      avatarEmoji: isPapa ? '🌿' : '🌸',
    };
  }

  /**
   * Returns demo Family representation where both Mamá and Papá are Primary Adults
   */
  public getFamilyAccount(): FamilyAccount | null {
    return {
      id: 'fam_nuestro_hogar_demo',
      name: 'Nuestra Familia',
      primaryAdultMamaId: 'user_mama_demo',
      primaryAdultPapaId: 'user_papa_demo',
      primaryAdultMamaEmail: 'mama@nuestrohogar.local',
      primaryAdultPapaEmail: 'papa@nuestrohogar.local',
      isBothCoAdminsActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
    };
  }

  public switchMode(mode: DataMode): void {
    this.mode = mode;
  }
}

/**
 * ApiDataService (Skeleton / Contract for Phase 2 Cloud Implementation)
 * 
 * Implements IDataService connecting to the secure REST / WebSocket API.
 * Preserves the exact same contract for seamless switching.
 */
export class ApiDataService implements IDataService {
  public mode: DataMode = 'cloud_sync';
  private cachedState: FullAppState | null = null;
  private currentUser: AuthUser | null = null;
  private familyAccount: FamilyAccount | null = null;

  constructor() {
    // Starts with localStorage as fallback cache
    this.cachedState = storageService.loadFullState();
  }

  public loadFullState(): FullAppState {
    // When connected to API, returns cached synchronized state
    return this.cachedState || storageService.loadFullState();
  }

  public saveStateKey<K extends keyof FullAppState>(key: K, data: FullAppState[K]): void {
    if (this.cachedState) {
      this.cachedState[key] = data;
    }
    // Also save in local cache as resilient fallback
    storageService.saveStateKey(key, data);
    // In Phase 2: triggers debounced API sync: fetch(`/api/v1/family/${key}`, { method: 'PUT', body: JSON.stringify(data) })
  }

  public resetToDemo(): FullAppState {
    return storageService.resetToDemo();
  }

  public exportJSON(): string {
    return storageService.exportJSON();
  }

  public importJSON(jsonString: string): FullAppState | null {
    const imported = storageService.importJSON(jsonString);
    if (imported) {
      this.cachedState = imported;
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
  }

  public async linkCoAdmin(
    token: string,
    payload: CoAdminLinkPayload
  ): Promise<{ success: boolean; message: string }> {
    // In Phase 2/3: POST /api/v1/auth/link-co-admin
    return {
      success: true,
      message: `Adulto principal ${payload.name} vinculado con éxito a la familia`,
    };
  }
}

import { supabaseDataService } from './supabaseDataService';

/**
 * Data Service Factory / Active Adapter Instance
 */
class DataServiceManager {
  private activeService: IDataService;

  constructor() {
    // Default to LocalStorageDataService for MVP demo resilience
    this.activeService = new LocalStorageDataService();
  }

  public getService(): IDataService {
    return this.activeService;
  }

  public setService(service: IDataService): void {
    this.activeService = service;
  }

  public useLocalDemo(): IDataService {
    this.activeService = new LocalStorageDataService();
    return this.activeService;
  }

  public useCloudSync(): IDataService {
    this.activeService = supabaseDataService;
    return this.activeService;
  }
}

export const dataServiceManager = new DataServiceManager();

// Dynamic proxy ensuring all consumers always invoke methods on the currently active service
export const dataService: IDataService = new Proxy({} as IDataService, {
  get(_target, prop) {
    const active = dataServiceManager.getService();
    const val = (active as any)[prop];
    return typeof val === 'function' ? val.bind(active) : val;
  },
  set(_target, prop, value) {
    const active = dataServiceManager.getService();
    (active as any)[prop] = value;
    return true;
  },
});

