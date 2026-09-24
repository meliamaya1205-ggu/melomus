import React, { useState } from 'react';
import { useFamily } from '../context/FamilyContext';
import { Avatar } from '../components/common/Avatar';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { CalendarEvent } from '../types/calendar';
import { getTodayString, formatFriendlyDate } from '../services/dateUtils';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  Trash2,
  Edit2,
  Bell,
  ExternalLink,
  Download,
} from 'lucide-react';
import {
  buildGoogleCalendarUrl,
  downloadIcsFile,
  calendarEventToExport,
} from '../services/googleCalendar';
import { AnticipationOption } from '../types/notifications';

type CalendarViewMode = 'month' | 'week' | 'day';

export const CalendarView: React.FC = () => {
  const {
    events,
    addEvent,
    updateEvent,
    deleteEvent,
    addReminder,
    members,
    config,
    getCategoryName,
    getMember,
  } = useFamily();

  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(getTodayString());

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventTypeKey, setEventTypeKey] = useState('family');
  const [eventDate, setEventDate] = useState(getTodayString());
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:00');
  const [allDay, setAllDay] = useState(false);
  const [memberId, setMemberId] = useState('family');
  const [location, setLocation] = useState('');
  const [reminderAnticipation, setReminderAnticipation] = useState<string>('1_day');

  // Month navigation helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 is Sunday
  // Adjust so Monday is 0
  const startOffset = (firstDayOfWeek + 6) % 7;

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDateStr(getTodayString());
  };

  const openNewEventModal = (prefillDate?: string) => {
    setEditingEventId(null);
    setTitle('');
    setDescription('');
    setEventTypeKey('family');
    setEventDate(prefillDate || selectedDateStr || getTodayString());
    setStartTime('10:00');
    setEndTime('11:00');
    setAllDay(false);
    setMemberId('family');
    setLocation('');
    setReminderAnticipation('1_day');
    setIsModalOpen(true);
  };

  const openEditModal = (event: CalendarEvent) => {
    setEditingEventId(event.id);
    setTitle(event.title);
    setDescription(event.description || '');
    setEventTypeKey(event.eventTypeKey);
    setEventDate(event.date);
    setStartTime(event.startTime || '10:00');
    setEndTime(event.endTime || '11:00');
    setAllDay(event.allDay);
    setMemberId(event.memberId);
    setLocation(event.location || '');
    setReminderAnticipation(event.reminders?.[0] || '1_day');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const chosenReminders: AnticipationOption[] =
      reminderAnticipation !== 'none' ? [reminderAnticipation as AnticipationOption] : [];

    if (editingEventId) {
      updateEvent(editingEventId, {
        title: title.trim(),
        description: description.trim() || undefined,
        eventTypeKey,
        date: eventDate,
        startTime: allDay ? undefined : startTime,
        endTime: allDay ? undefined : endTime,
        allDay,
        memberId,
        location: location.trim() || undefined,
        reminders: chosenReminders,
      });
    } else {
      addEvent({
        title: title.trim(),
        description: description.trim() || undefined,
        eventTypeKey,
        date: eventDate,
        startTime: allDay ? undefined : startTime,
        endTime: allDay ? undefined : endTime,
        allDay,
        memberId,
        location: location.trim() || undefined,
        reminders: chosenReminders,
      });
    }

    if (reminderAnticipation !== 'none') {
      addReminder({
        title: `📅 ${title.trim()}`,
        date: eventDate,
        time: allDay ? '09:00' : startTime,
        anticipation: reminderAnticipation as AnticipationOption,
        responsibleId: memberId,
        category: 'events',
        recurrence: 'none',
        notes: description.trim() || undefined,
        relatedEntityId: editingEventId || undefined,
        relatedEntityType: 'event',
        isPrivate: false,
      });
    }

    setIsModalOpen(false);
  };

  // Events for selected date
  const eventsForSelectedDate = events.filter((e) => e.date === selectedDateStr);

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-stone-900">
              {config.modules.calendar.displayName}
            </h2>
            <span className="text-xs bg-purple-50 text-purple-700 font-semibold px-2.5 py-0.5 rounded-full border border-purple-200">
              {events.length} eventos
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            Organiza compromisos del colegio, médicos y paseos en familia
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center bg-stone-100 p-1 rounded-2xl">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                viewMode === 'month' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              Mes
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                viewMode === 'week' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              Semana
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                viewMode === 'day' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              Día
            </button>
          </div>

          <button
            onClick={() => openNewEventModal()}
            className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-2xl shadow-sm transition-all cursor-pointer hover:shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nuevo Evento</span>
          </button>
        </div>
      </div>

      {/* Main Calendar Card */}
      <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-xs">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <h3 className="text-base sm:text-lg font-bold text-stone-800 capitalize">
              {monthNames[month]} {year}
            </h3>
            <button
              onClick={handleToday}
              className="px-2.5 py-1 text-xs font-semibold bg-stone-100 text-stone-600 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
            >
              Hoy
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevMonth}
              className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
              title="Mes anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
              title="Mes siguiente"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 1. MONTH VIEW */}
        {viewMode === 'month' && (
          <div className="mt-4">
            {/* Weekdays header */}
            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => (
                <div key={d} className="text-xs font-bold text-stone-400 py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Grid days */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {/* Empty leading slots */}
              {Array.from({ length: startOffset }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[70px] sm:min-h-[90px] p-1.5 rounded-2xl bg-stone-50/30 border border-transparent" />
              ))}

              {/* Days of month */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const formattedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                const isToday = formattedDate === getTodayString();
                const isSelected = formattedDate === selectedDateStr;
                const dayEvents = events.filter((e) => e.date === formattedDate);

                return (
                  <div
                    key={dayNum}
                    onClick={() => setSelectedDateStr(formattedDate)}
                    onDoubleClick={() => openNewEventModal(formattedDate)}
                    className={`min-h-[70px] sm:min-h-[90px] p-1.5 sm:p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-purple-500 bg-purple-50/50 shadow-xs ring-2 ring-purple-200'
                        : isToday
                        ? 'border-amber-300 bg-amber-50/40'
                        : 'border-stone-100 hover:border-stone-300 hover:bg-stone-50/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                          isToday
                            ? 'bg-amber-500 text-white'
                            : isSelected
                            ? 'bg-purple-600 text-white'
                            : 'text-stone-700'
                        }`}
                      >
                        {dayNum}
                      </span>

                      {dayEvents.length > 0 && (
                        <span className="text-[10px] font-bold text-purple-700 hidden sm:inline">
                          {dayEvents.length}
                        </span>
                      )}
                    </div>

                    {/* Event chips */}
                    <div className="space-y-1 mt-1 overflow-hidden">
                      {dayEvents.slice(0, 2).map((ev) => (
                        <div
                          key={ev.id}
                          className="text-[10px] truncate px-1.5 py-0.5 rounded-md bg-purple-100 text-purple-900 font-semibold"
                          title={ev.title}
                        >
                          {ev.startTime ? `${ev.startTime} ` : ''}
                          {ev.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <span className="text-[9px] text-stone-400 font-semibold block px-1">
                          +{dayEvents.length - 2} más
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. WEEK VIEW / 3. DAY VIEW */}
        {(viewMode === 'week' || viewMode === 'day') && (
          <div className="mt-4 space-y-3">
            <p className="text-xs text-stone-500 italic">
              Mostrando eventos programados para los próximos días:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {events.map((ev) => {
                const member = getMember(ev.memberId);
                return (
                  <div
                    key={ev.id}
                    onClick={() => openEditModal(ev)}
                    className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80 hover:bg-white hover:border-purple-300 transition-all cursor-pointer shadow-xs"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded-md">
                        {formatFriendlyDate(ev.date)}
                      </span>
                      <Avatar
                        name={member ? member.name : 'Familia'}
                        emoji={member?.avatarEmoji || '🏡'}
                        color={member?.avatarColor || '#9333ea'}
                        size="sm"
                      />
                    </div>
                    <h4 className="text-xs font-bold text-stone-900">{ev.title}</h4>
                    {ev.description && (
                      <p className="text-[11px] text-stone-500 mt-1">{ev.description}</p>
                    )}
                    <div className="flex items-center gap-2 text-[10px] text-stone-400 mt-2">
                      {ev.startTime && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {ev.startTime} - {ev.endTime}
                        </span>
                      )}
                      {ev.location && (
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3" /> {ev.location}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Detail drawer for Selected Date */}
      <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-800">
                Eventos para: {formatFriendlyDate(selectedDateStr)} ({selectedDateStr})
              </h3>
              <p className="text-xs text-stone-400">
                {eventsForSelectedDate.length} evento{eventsForSelectedDate.length === 1 ? '' : 's'} este día
              </p>
            </div>
          </div>

          <button
            onClick={() => openNewEventModal(selectedDateStr)}
            className="flex items-center gap-1 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Agregar en este día</span>
          </button>
        </div>

        {eventsForSelectedDate.length === 0 ? (
          <div className="text-center py-6 bg-stone-50/60 rounded-2xl border border-dashed border-stone-200">
            <p className="text-xs text-stone-500">
              No hay eventos agendados para este día. ¡Un día despejado! ☀️
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {eventsForSelectedDate.map((ev) => {
              const member = getMember(ev.memberId);
              return (
                <div
                  key={ev.id}
                  className="flex items-start justify-between p-3.5 rounded-2xl bg-stone-50/70 border border-stone-200/70 hover:bg-stone-50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <Avatar
                      name={member ? member.name : 'Familia'}
                      emoji={member?.avatarEmoji || '🏡'}
                      color={member?.avatarColor || '#9333ea'}
                      size="sm"
                    />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-stone-900">{ev.title}</span>
                        <Badge variant="secondary">
                          {getCategoryName('event', ev.eventTypeKey)}
                        </Badge>
                        {ev.startTime && (
                          <span className="flex items-center gap-1 text-[11px] text-stone-500 font-medium">
                            <Clock className="w-3 h-3 text-stone-400" />
                            {ev.startTime} {ev.endTime ? `- ${ev.endTime}` : ''}
                          </span>
                        )}
                        {ev.reminders && ev.reminders.length > 0 && ev.reminders[0] && (
                          <span className="flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 rounded-md font-medium">
                            <Bell className="w-2.5 h-2.5 text-amber-500" />
                            {ev.reminders[0] === '1_day'
                              ? 'Aviso 24h antes'
                              : ev.reminders[0] === '1_hour'
                              ? 'Aviso 1h antes'
                              : ev.reminders[0] === '30_min'
                              ? 'Aviso 30 min antes'
                              : ev.reminders[0] === '15_min'
                              ? 'Aviso 15 min antes'
                              : ev.reminders[0] === '5_min'
                              ? 'Aviso 5 min antes'
                              : 'Aviso al iniciar'}
                          </span>
                        )}
                      </div>

                      {ev.description && (
                        <p className="text-xs text-stone-600 mt-1">{ev.description}</p>
                      )}

                      {ev.location && (
                        <p className="text-[11px] text-stone-500 flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3 text-stone-400" /> {ev.location}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 ml-2">
                    <a
                      href={buildGoogleCalendarUrl(calendarEventToExport(ev))}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-stone-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                      title="Agregar a Google Calendar"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-blue-500" />
                    </a>
                    <button
                      type="button"
                      onClick={() => downloadIcsFile(calendarEventToExport(ev))}
                      className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-200 transition-colors cursor-pointer"
                      title="Descargar archivo iCalendar (.ics)"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => openEditModal(ev)}
                      className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-200 transition-colors cursor-pointer"
                      title="Editar evento"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteEvent(ev.id)}
                      className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Eliminar evento"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Event Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingEventId ? 'Editar Evento' : 'Nuevo Evento Familiar'}
        subtitle="Registra actividades escolares, paseos y fechas especiales"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Título del Evento
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="Ej: Cumpleaños de Annie, Reunión colegio, Paseo al zoológico..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-purple-400 focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Fecha</label>
              <input
                type="date"
                required
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Tipo de Evento</label>
              <select
                value={eventTypeKey}
                onChange={(e) => setEventTypeKey(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              >
                {config.eventTypes.map((t) => (
                  <option key={t.technicalKey} value={t.technicalKey}>
                    {t.displayName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Hora Inicio</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Hora Fin</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Miembro Asociado</label>
            <select
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
            >
              <option value="family">Toda la Familia 🏡</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} {m.avatarEmoji}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Lugar</label>
            <input
              type="text"
              placeholder="Ej: Colegio Los Robles, Casa de la abuela, Parque..."
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Descripción / Notas</label>
            <textarea
              rows={2}
              placeholder="Detalles sobre qué llevar, recordatorios..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-amber-500" />
              <span>Recordatorio de Aviso</span>
            </label>
            <select
              value={reminderAnticipation}
              onChange={(e) => setReminderAnticipation(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-800 focus:bg-white"
            >
              <option value="none">Sin recordatorio previo</option>
              <option value="at_time">En el momento del evento</option>
              <option value="5_min">5 minutos antes</option>
              <option value="15_min">15 minutos antes</option>
              <option value="30_min">30 minutos antes</option>
              <option value="1_hour">1 hora antes</option>
              <option value="1_day">1 día antes (24 horas antes)</option>
            </select>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-stone-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {editingEventId ? 'Guardar Cambios' : 'Guardar Evento'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
