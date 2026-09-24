import { HabitCategory } from '../types/habits';

export interface CategoryMetadata {
  id: HabitCategory;
  name: string;
  emoji: string;
  badgeClass: string;
}

export const HABIT_CATEGORIES: CategoryMetadata[] = [
  { id: 'health', name: 'Salud', emoji: '🩺', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'wellness', name: 'Bienestar', emoji: '🌿', badgeClass: 'bg-teal-50 text-teal-700 border-teal-200' },
  { id: 'home', name: 'Hogar', emoji: '🏡', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'family', name: 'Familia', emoji: '👨‍👩‍👧‍👦', badgeClass: 'bg-sky-50 text-sky-700 border-sky-200' },
  { id: 'work', name: 'Trabajo / Organización', emoji: '💼', badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { id: 'spiritual', name: 'Espiritualidad / Calma', emoji: '🙏', badgeClass: 'bg-purple-50 text-purple-700 border-purple-200' },
  { id: 'couple', name: 'Pareja', emoji: '💑', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200' },
  { id: 'personal', name: 'Personal', emoji: '👤', badgeClass: 'bg-stone-100 text-stone-700 border-stone-200' },
  { id: 'other', name: 'Otra', emoji: '⭐', badgeClass: 'bg-stone-100 text-stone-700 border-stone-200' },
];

export function getCategoryMetadata(category: HabitCategory): CategoryMetadata {
  return (
    HABIT_CATEGORIES.find((c) => c.id === category) || {
      id: 'other',
      name: 'Otra',
      emoji: '⭐',
      badgeClass: 'bg-stone-100 text-stone-700 border-stone-200',
    }
  );
}

/**
 * Calculates current streak in consecutive days
 */
export function calculateStreak(completedDates: string[], todayStr: string): number {
  if (!completedDates || completedDates.length === 0) return 0;

  const datesSet = new Set(completedDates);
  const today = new Date(todayStr + 'T00:00:00');

  // Check if today is completed
  let count = 0;
  let cursor = new Date(today);

  if (datesSet.has(todayStr)) {
    count++;
    cursor.setDate(cursor.getDate() - 1);
  } else {
    // If not completed today, check if yesterday was completed
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (datesSet.has(yesterdayStr)) {
      cursor = yesterday;
    } else {
      return 0;
    }
  }

  // Count backwards
  while (true) {
    const dStr = cursor.toISOString().split('T')[0];
    if (datesSet.has(dStr)) {
      count++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  return count;
}

export interface WeekDayProgress {
  dayLabel: string;
  dateStr: string;
  isToday: boolean;
  completed: boolean;
}

/**
 * Gets 7 days for the current week (Monday to Sunday)
 */
export function getWeeklyCompliance(completedDates: string[], todayStr: string): WeekDayProgress[] {
  const datesSet = new Set(completedDates || []);
  const today = new Date(todayStr + 'T00:00:00');

  // Find Monday of the current week (1 = Monday, 0 = Sunday)
  const dayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(today);
  monday.setDate(today.getDate() + diffToMonday);

  const dayLabels = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  const weekDays: WeekDayProgress[] = [];

  for (let i = 0; i < 7; i++) {
    const cur = new Date(monday);
    cur.setDate(monday.getDate() + i);
    const curStr = cur.toISOString().split('T')[0];

    weekDays.push({
      dayLabel: dayLabels[i],
      dateStr: curStr,
      isToday: curStr === todayStr,
      completed: datesSet.has(curStr),
    });
  }

  return weekDays;
}
