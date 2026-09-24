export type HabitType = 'personal' | 'family' | 'child' | 'couple';

export type HabitCategory =
  | 'health'
  | 'wellness'
  | 'home'
  | 'family'
  | 'work'
  | 'spiritual'
  | 'couple'
  | 'personal'
  | 'other';

export type RoutineType = 'morning' | 'arrival' | 'night' | 'couple' | 'other';
export type HabitFrequency = 'daily' | 'weekdays' | 'weekend' | 'weekends' | 'weekly' | 'custom';

export interface Habit {
  id: string;
  title: string;
  description?: string;
  type: HabitType;
  category: HabitCategory;
  memberId?: string; // 'mama', 'papa', 'annie', 'derek', 'axel', 'both', 'family'
  childId?: string; // backward compatibility for kids habits
  responsibleId?: string; // backward compatibility ('mama', 'papa', 'both', etc.)
  routineType?: RoutineType; // for backward compatibility and kids routine grouping
  isCouple?: boolean;
  isPrivate?: boolean; // If true, only visible to the owner adult
  points: number; // For kids points wallet (0 for adults)
  frequency: HabitFrequency;
  customDays?: number[]; // 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 7=Sun
  suggestedTime?: string; // HH:mm
  startDate?: string;
  endDate?: string;
  reminderEnabled?: boolean;
  reminderTime?: string;
  icon: string;
  color?: string;
  active: boolean; // can pause or resume
  completedDates: string[]; // List of YYYY-MM-DD
}
