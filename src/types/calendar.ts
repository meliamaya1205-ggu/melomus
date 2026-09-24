import { AnticipationOption } from './notifications';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  eventTypeKey: string; // matches CustomizationItem.technicalKey (school, medical, family, etc.)
  date: string; // YYYY-MM-DD
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  allDay: boolean;
  memberId: string; // member id or 'family'
  location?: string;
  reminders?: AnticipationOption[];
}
