export type ShoppingCategory =
  | 'produce'
  | 'dairy'
  | 'pantry'
  | 'baby'
  | 'cleaning'
  | 'meat'
  | 'bakery'
  | 'drinks'
  | 'pharmacy'
  | 'other';

export interface ShoppingItem {
  id: string;
  name: string;
  category: ShoppingCategory;
  completed: boolean;
  urgent: boolean;
  quantity?: string;
  notes?: string;
  addedBy: string;
  createdAt: string;
}

export interface HomeArea {
  id: string;
  name: string;
  icon?: string;
  isSystem?: boolean;
}

export const DEFAULT_HOME_AREAS: HomeArea[] = [
  { id: 'area_kitchen', name: 'Cocina', icon: '🍳', isSystem: true },
  { id: 'area_living', name: 'Living / Sala', icon: '🛋️', isSystem: true },
  { id: 'area_bathroom', name: 'Baño', icon: '🚿', isSystem: true },
  { id: 'area_master_bedroom', name: 'Dormitorio Principal', icon: '🛏️', isSystem: true },
  { id: 'area_kids_bedroom', name: 'Dormitorio Niños', icon: '🧸', isSystem: true },
  { id: 'area_patio', name: 'Patio / Jardín', icon: '🌳', isSystem: false },
  { id: 'area_terrace', name: 'Terraza / Balcón', icon: '☀️', isSystem: false },
  { id: 'area_laundry', name: 'Lavandería / Logia', icon: '🧺', isSystem: false },
  { id: 'area_garage', name: 'Garaje / Estacionamiento', icon: '🚗', isSystem: false },
  { id: 'area_storage', name: 'Bodega / Clóset', icon: '📦', isSystem: false },
  { id: 'area_office', name: 'Oficina / Estudio', icon: '💻', isSystem: false },
  { id: 'area_general', name: 'General / Todo el Hogar', icon: '🏠', isSystem: true },
];

export type FrequencyType =
  | 'daily'
  | 'specific_days'
  | 'weekly'
  | 'every_x_days'
  | 'every_x_weeks'
  | 'monthly'
  | 'every_x_months'
  | 'once'
  | 'custom';

export interface FrequencyConfig {
  type: FrequencyType;
  interval?: number;
  daysOfWeek?: number[]; // 0=Dom, 1=Lun, ..., 6=Sáb
  timeOfDay?: string;
  customText?: string;
}

export function formatFrequency(freq?: string, config?: FrequencyConfig): string {
  if (config) {
    switch (config.type) {
      case 'daily':
        return 'Diariamente';
      case 'weekly':
        return 'Semanalmente';
      case 'monthly':
        return 'Mensualmente';
      case 'every_x_days':
        return `Cada ${config.interval || 1} días`;
      case 'every_x_weeks':
        return `Cada ${config.interval || 1} semanas`;
      case 'every_x_months':
        return `Cada ${config.interval || 1} meses`;
      case 'specific_days': {
        const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        return (config.daysOfWeek || []).map((d) => dayNames[d]).join(', ') || 'Días específicos';
      }
      case 'once':
        return 'Una sola vez';
      case 'custom':
        return config.customText || 'Personalizado';
    }
  }
  if (!freq) return 'Semanal';
  if (freq === 'daily') return 'Diaria';
  if (freq === 'weekly') return 'Semanal';
  if (freq === 'monthly') return 'Mensual';
  return freq;
}

export interface CleaningTask {
  id: string;
  areaId?: string;
  area?: string; // legacy compatibility fallback
  title: string;
  description?: string;
  frequency: string;
  frequencyConfig?: FrequencyConfig;
  assignedMemberId?: string;
  priority?: 'high' | 'medium' | 'low';
  timeOfDay?: string;
  notes?: string;
  lastCompletedDate?: string;
  completedToday?: boolean;
  isPaused?: boolean;
}

export type MaintenanceCategory =
  | 'appliances'
  | 'plumbing'
  | 'electrical'
  | 'vehicle'
  | 'structure'
  | 'garden'
  | 'general'
  | string;

export interface MaintenanceTask {
  id: string;
  title: string;
  description?: string;
  category?: MaintenanceCategory;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
  assignedMemberId?: string;
  dueDate?: string;
  nextDate?: string;
  frequency?: string;
  frequencyConfig?: FrequencyConfig;
  reminderEnabled?: boolean;
  notes?: string;
  isPaused?: boolean;
}
