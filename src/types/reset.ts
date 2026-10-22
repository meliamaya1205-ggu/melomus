export interface ResetMission {
  id: string;
  memberId: string;
  area: string; // Cocina, Sala, Habitación, Juguetes
  taskDescription: string;
  completed: boolean;
}

export interface ResetSessionConfig {
  durationMinutes: number; // backward compatibility
  missions: ResetMission[];
}

export type ResetDurationUnit = 'minutes' | 'hours' | 'days' | 'weeks';
export type ResetStatus = 'idle' | 'active' | 'paused' | 'completed';

export interface FamilyResetSession {
  id: string;
  startedAt?: string;             // ISO timestamp
  endsAt?: string;                // ISO timestamp calculated
  durationValue: number;          // e.g. 15, 30, 2, 7
  durationUnit: ResetDurationUnit; // 'minutes' | 'hours' | 'days' | 'weeks'
  durationMinutes: number;        // total minutes
  remainingSeconds: number;       // remaining seconds
  status: ResetStatus;            // 'idle' | 'active' | 'paused' | 'completed'
  pausedAt?: string;              // ISO timestamp
  completedAt?: string;           // ISO timestamp
  startedBy?: string;             // member name or ID
  lastUpdated?: string;           // ISO timestamp
}

export interface DurationPreset {
  id: string;
  label: string;
  shortLabel: string;
  value: number;
  unit: ResetDurationUnit;
  minutes: number;
}

export const DURATION_PRESETS: DurationPreset[] = [
  { id: '15m', label: '15 minutos', shortLabel: '15 min', value: 15, unit: 'minutes', minutes: 15 },
  { id: '30m', label: '30 minutos', shortLabel: '30 min', value: 30, unit: 'minutes', minutes: 30 },
  { id: '45m', label: '45 minutos', shortLabel: '45 min', value: 45, unit: 'minutes', minutes: 45 },
  { id: '1h', label: '1 hora', shortLabel: '1 h', value: 1, unit: 'hours', minutes: 60 },
  { id: '1.5h', label: '1 hora 30 minutos', shortLabel: '1h 30m', value: 90, unit: 'minutes', minutes: 90 },
  { id: '2h', label: '2 horas', shortLabel: '2 h', value: 2, unit: 'hours', minutes: 120 },
  { id: '3h', label: '3 horas', shortLabel: '3 h', value: 3, unit: 'hours', minutes: 180 },
  { id: '4h', label: '4 horas', shortLabel: '4 h', value: 4, unit: 'hours', minutes: 240 },
  { id: '5h', label: '5 horas', shortLabel: '5 h', value: 5, unit: 'hours', minutes: 300 },
  { id: '6h', label: '6 horas', shortLabel: '6 h', value: 6, unit: 'hours', minutes: 360 },
  { id: '8h', label: '8 horas', shortLabel: '8 h', value: 8, unit: 'hours', minutes: 480 },
  { id: '12h', label: '12 horas', shortLabel: '12 h', value: 12, unit: 'hours', minutes: 720 },
  { id: '24h', label: '24 horas', shortLabel: '24 h', value: 24, unit: 'hours', minutes: 1440 },
  { id: '2d', label: '2 días', shortLabel: '2 días', value: 2, unit: 'days', minutes: 2880 },
  { id: '3d', label: '3 días', shortLabel: '3 días', value: 3, unit: 'days', minutes: 4320 },
  { id: '7d', label: '7 días', shortLabel: '7 días', value: 7, unit: 'days', minutes: 10080 },
  { id: '14d', label: '14 días', shortLabel: '14 días', value: 14, unit: 'days', minutes: 20160 },
  { id: '30d', label: '30 días', shortLabel: '30 días', value: 30, unit: 'days', minutes: 43200 },
];

export function durationToMinutes(value: number, unit: ResetDurationUnit): number {
  const v = Math.max(1, Number(value) || 1);
  switch (unit) {
    case 'minutes':
      return v;
    case 'hours':
      return v * 60;
    case 'days':
      return v * 1440;
    case 'weeks':
      return v * 10080;
    default:
      return v;
  }
}

export function formatFriendlyDuration(value: number, unit: ResetDurationUnit): string {
  const v = Math.max(1, Number(value) || 1);
  if (unit === 'minutes') {
    return v === 1 ? '1 minuto' : `${v} minutos`;
  }
  if (unit === 'hours') {
    return v === 1 ? '1 hora' : `${v} horas`;
  }
  if (unit === 'days') {
    return v === 1 ? '1 día' : `${v} días`;
  }
  if (unit === 'weeks') {
    return v === 1 ? '1 semana' : `${v} semanas`;
  }
  return `${v} ${unit}`;
}

export function formatFriendlyRemaining(totalSeconds: number): string {
  const sec = Math.max(0, Math.floor(totalSeconds));
  if (sec >= 86400) {
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
  }
  if (sec >= 3600) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h}h ${m}m ${s}s`;
  }
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
