export type NotificationCategory =
  | 'tasks'          // Tareas
  | 'events'         // Eventos del calendario
  | 'appointments'   // Citas médicas
  | 'medications'    // Medicamentos y tomas
  | 'shopping'       // Compras
  | 'habits'         // Hábitos
  | 'finance'        // Finanzas
  | 'couple'         // Pareja
  | 'cuquiTime'      // Cuqui Time
  | 'reminders';     // Recordatorios familiares rápidos

export type AnticipationOption =
  | 'at_time'   // En el momento (0 min)
  | '5_min'     // 5 minutos antes
  | '15_min'    // 15 minutos antes
  | '30_min'    // 30 minutos antes
  | '1_hour'    // 1 hora antes
  | '1_day';    // 1 día antes

export interface CategoryPreference {
  enabled: boolean;
  defaultAnticipation: AnticipationOption;
}

export interface AdultNotificationPreferences {
  masterEnabled: boolean;
  discreteMode: boolean; // Oculta detalles médicos e íntimos en pantalla de bloqueo
  quietHoursEnabled: boolean;
  quietHoursStart?: string; // Ej: "22:00"
  quietHoursEnd?: string;   // Ej: "07:00"
  categories: Record<NotificationCategory, CategoryPreference>;
}

export interface NotificationPreferencesState {
  mama: AdultNotificationPreferences;
  papa: AdultNotificationPreferences;
}

export interface AppReminder {
  id: string;
  title: string;
  category: NotificationCategory;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  anticipation: AnticipationOption;
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly';
  responsibleId: string; // 'mama' | 'papa' | 'both' | 'family' | memberId
  notes?: string;
  isPrivate?: boolean;
  relatedEntityId?: string; // id de tarea, evento, medicamento, etc.
  relatedEntityType?: 'task' | 'event' | 'appointment' | 'medication' | 'habit' | 'couple' | 'finance' | 'shopping' | 'home' | 'custom';
  notifiedAt?: string;
  completed?: boolean;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  category: NotificationCategory;
  targetMemberId: string; // 'mama' | 'papa' | 'both' | 'family' | child memberId
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  isDiscrete?: boolean;
  reminderId?: string;
}

/**
 * Contrato de Arquitectura para Futura Sincronización Bidireccional con Google Calendar
 * (Fase de Nube / Backend seguro con OAuth2)
 */
export interface GoogleCalendarSyncContract {
  isConfigured: boolean;
  calendarId?: string;
  lastSyncTimestamp?: string;
  syncDirection: 'export_only' | 'import_only' | 'bidirectional';
  autoSyncEvents: boolean;
  exportToGoogle(event: any): Promise<{ externalEventId: string; htmlLink: string }>;
  importFromGoogle(sinceTimestamp: string): Promise<any[]>;
  removeExternalEvent(externalEventId: string): Promise<boolean>;
}
