export type ShoppingCategory = 'produce' | 'dairy' | 'pantry' | 'baby' | 'cleaning' | 'other';

export interface ShoppingItem {
  id: string;
  name: string;
  category: ShoppingCategory;
  completed: boolean;
  urgent: boolean;
  quantity?: string;
  addedBy: string;
  createdAt: string;
}

export interface CleaningTask {
  id: string;
  area: 'kitchen' | 'living' | 'bathroom' | 'bedrooms' | 'general';
  title: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  assignedMemberId?: string;
  lastCompletedDate?: string;
  completedToday?: boolean;
}

export interface MaintenanceTask {
  id: string;
  title: string;
  description?: string;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
  dueDate?: string;
}
