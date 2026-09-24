import { CalendarEvent } from '../types/calendar';
import { AppReminder } from '../types/notifications';

/**
 * Utilidades para la Integración con Google Calendar e iCalendar estándar (.ics)
 * 
 * Permite a los adultos de "MELOMUS" exportar o sincronizar eventos y recordatorios
 * hacia sus calendarios personales de Google Calendar, Apple Calendar o Outlook
 * manteniendo la soberanía y autonomía de MELOMUS.
 */

interface CalendarExportItem {
  title: string;
  description?: string;
  location?: string;
  date: string; // YYYY-MM-DD
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  allDay?: boolean;
}

/**
 * Formatea una fecha y hora local a formato UTC compacto para Google Calendar (YYYYMMDDTHHmmssZ)
 */
function formatToCompactUtc(dateStr: string, timeStr?: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  let hours = 9;
  let minutes = 0;

  if (timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    hours = isNaN(h) ? 9 : h;
    minutes = isNaN(m) ? 0 : m;
  }

  const d = new Date(year, month - 1, day, hours, minutes, 0);
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

/**
 * Genera el enlace oficial de Google Calendar para agregar el evento con un clic
 */
export function buildGoogleCalendarUrl(item: CalendarExportItem): string {
  const title = encodeURIComponent(item.title || 'Evento MELOMUS');
  const details = encodeURIComponent(
    (item.description ? `${item.description}\n\n` : '') + 'Organizado desde MELOMUS 🏡'
  );
  const location = encodeURIComponent(item.location || '');

  let datesParam = '';
  if (item.allDay) {
    const [year, month, day] = item.date.split('-').map(Number);
    const startDate = `${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`;
    const nextDay = new Date(year, month - 1, day + 1);
    const endDate = `${nextDay.getFullYear()}${String(nextDay.getMonth() + 1).padStart(2, '0')}${String(nextDay.getDate()).padStart(2, '0')}`;
    datesParam = `${startDate}/${endDate}`;
  } else {
    const startIso = formatToCompactUtc(item.date, item.startTime || '10:00');
    const endIso = formatToCompactUtc(item.date, item.endTime || (item.startTime ? `${parseInt(item.startTime) + 1}:00` : '11:00'));
    datesParam = `${startIso}/${endIso}`;
  }

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${datesParam}&details=${details}&location=${location}`;
}

/**
 * Genera un archivo estándar iCalendar (.ics) descargable
 */
export function generateIcsContent(item: CalendarExportItem): string {
  const nowUtc = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const uid = `melomus-${Date.now()}-${Math.random().toString(36).substring(2, 9)}@melomus.app`;
  const startIso = formatToCompactUtc(item.date, item.startTime || '10:00');
  const endIso = formatToCompactUtc(item.date, item.endTime || '11:00');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MELOMUS//Organización Familiar//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${nowUtc}`,
    `DTSTART:${startIso}`,
    `DTEND:${endIso}`,
    `SUMMARY:${item.title.replace(/\n/g, ' ')}`,
    `DESCRIPTION:${(item.description || 'Evento creado en MELOMUS').replace(/\n/g, '\\n')}`,
    item.location ? `LOCATION:${item.location.replace(/\n/g, ' ')}` : '',
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n');
}

/**
 * Dispara la descarga del archivo .ics en el navegador del usuario
 */
export function downloadIcsFile(item: CalendarExportItem, filename?: string): void {
  const ics = generateIcsContent(item);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `${item.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Convierte un CalendarEvent en CalendarExportItem
 */
export function calendarEventToExport(ev: CalendarEvent): CalendarExportItem {
  return {
    title: ev.title,
    description: ev.description,
    location: ev.location,
    date: ev.date,
    startTime: ev.startTime,
    endTime: ev.endTime,
    allDay: ev.allDay,
  };
}

/**
 * Convierte un AppReminder en CalendarExportItem
 */
export function reminderToExport(rem: AppReminder): CalendarExportItem {
  return {
    title: `🔔 ${rem.title}`,
    description: rem.notes,
    date: rem.date,
    startTime: rem.time,
    allDay: false,
  };
}
