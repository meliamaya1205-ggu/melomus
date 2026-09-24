export type TaskPriority = 'high' | 'medium' | 'low';
export type TaskStatus = 'pending' | 'in_progress' | 'completed';
export type TaskRecurrence = 'none' | 'daily' | 'weekly' | 'monthly';

export interface Task {
  id: string;
  title: string;
  description?: string;
  responsibleId: string; // member id or 'both' or 'family'
  categoryKey: string; // matches CustomizationItem.technicalKey
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  priority: TaskPriority;
  status: TaskStatus;
  recurrence?: TaskRecurrence;
  relatedMemberId?: string; // e.g. for Axel
  completedAt?: string;
  createdAt: string;
}
