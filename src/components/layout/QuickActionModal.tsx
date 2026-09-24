import React, { useState } from 'react';
import { useFamily } from '../../context/FamilyContext';
import { Modal } from '../common/Modal';
import { getTodayString } from '../../services/dateUtils';
import { CheckSquare, Calendar, HeartPulse, ShoppingCart, DollarSign, Bell } from 'lucide-react';
import { TaskPriority } from '../../types/tasks';
import { ShoppingCategory } from '../../types/home';
import { AnticipationOption, NotificationCategory } from '../../types/notifications';

type ActionTab = 'reminder' | 'task' | 'event' | 'appointment' | 'shopping' | 'expense';

export const QuickActionModal: React.FC = () => {
  const {
    quickActionModalOpen,
    setQuickActionModalOpen,
    addTask,
    addEvent,
    addAppointment,
    addShoppingItem,
    addExpense,
    addReminder,
    members,
    config,
    isAdultView,
  } = useFamily();

  const [activeTab, setActiveTab] = useState<ActionTab>('reminder');

  // Reminder form state ("¿Qué necesitas recordar?")
  const [remTitle, setRemTitle] = useState('');
  const [remDate, setRemDate] = useState(getTodayString());
  const [remTime, setRemTime] = useState('18:00');
  const [remAnticipation, setRemAnticipation] = useState<AnticipationOption>('1_hour');
  const [remResponsible, setRemResponsible] = useState('mama');
  const [remCategory, setRemCategory] = useState<NotificationCategory>('reminders');
  const [remRecurrence, setRemRecurrence] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none');
  const [remNotes, setRemNotes] = useState('');

  // Task form state (Fast 4 steps: Title, Assignee, Date, Save)
  const [taskTitle, setTaskTitle] = useState('');
  const [taskResponsible, setTaskResponsible] = useState('both');
  const [taskDate, setTaskDate] = useState(getTodayString());
  const [taskCategory, setTaskCategory] = useState('home');
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('medium');

  // Event form state
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState(getTodayString());
  const [eventTime, setEventTime] = useState('18:00');
  const [eventType, setEventType] = useState('family');
  const [eventMember, setEventMember] = useState('family');

  // Appointment form state
  const [appMember, setAppMember] = useState(members[2]?.id || 'annie');
  const [appType, setAppType] = useState('pediatric');
  const [appDoctor, setAppDoctor] = useState('');
  const [appDate, setAppDate] = useState(getTodayString());
  const [appTime, setAppTime] = useState('10:00');
  const [appLocation, setAppLocation] = useState('');
  const [appNotes, setAppNotes] = useState('');

  // Shopping form state
  const [shopName, setShopName] = useState('');
  const [shopCategory, setShopCategory] = useState<ShoppingCategory>('pantry');
  const [shopUrgent, setShopUrgent] = useState(false);

  // Expense form state
  const [expDescription, setExpDescription] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expCategory, setExpCategory] = useState('food');
  const [expResponsible, setExpResponsible] = useState('mama');

  const handleClose = () => {
    setQuickActionModalOpen(false);
  };

  const handleSaveReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!remTitle.trim()) return;

    addReminder({
      title: remTitle.trim(),
      date: remDate,
      time: remTime,
      anticipation: remAnticipation,
      responsibleId: remResponsible,
      category: remCategory,
      recurrence: remRecurrence,
      notes: remNotes.trim() || undefined,
      isPrivate: false,
    });

    setRemTitle('');
    setRemNotes('');
    handleClose();
  };

  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    addTask({
      title: taskTitle.trim(),
      responsibleId: taskResponsible,
      date: taskDate,
      categoryKey: taskCategory,
      priority: taskPriority,
      status: 'pending',
    });

    setTaskTitle('');
    handleClose();
  };

  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim()) return;

    addEvent({
      title: eventTitle.trim(),
      date: eventDate,
      startTime: eventTime,
      eventTypeKey: eventType,
      memberId: eventMember,
      allDay: false,
    });

    setEventTitle('');
    handleClose();
  };

  const handleSaveAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!appDoctor.trim()) return;

    addAppointment({
      memberId: appMember,
      appointmentTypeKey: appType,
      professional: appDoctor.trim(),
      date: appDate,
      time: appTime,
      location: appLocation.trim() || 'Centro Médico',
      notes: appNotes.trim(),
      hasReminder: true,
      status: 'upcoming',
    });

    setAppDoctor('');
    setAppLocation('');
    setAppNotes('');
    handleClose();
  };

  const handleSaveShopping = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName.trim()) return;

    addShoppingItem({
      name: shopName.trim(),
      category: shopCategory,
      completed: false,
      urgent: shopUrgent,
      addedBy: 'Familia',
    });

    setShopName('');
    setShopUrgent(false);
    handleClose();
  };

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(expAmount);
    if (!expDescription.trim() || isNaN(amountNum) || amountNum <= 0) return;

    addExpense({
      description: expDescription.trim(),
      amount: amountNum,
      date: getTodayString(),
      categoryKey: expCategory,
      responsibleId: expResponsible,
      paymentMethod: 'debit',
      isRecurring: false,
    });

    setExpDescription('');
    setExpAmount('');
    handleClose();
  };

  return (
    <Modal
      isOpen={quickActionModalOpen}
      onClose={handleClose}
      title="Agregar a MELOMUS"
      subtitle="Creación rápida y directa sin complicaciones"
    >
      {/* Category selector pills */}
      <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-2xl mb-5 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('reminder')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'reminder' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Bell className="w-3.5 h-3.5 text-amber-500" />
          <span>Recordatorio</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('task')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'task' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <CheckSquare className="w-3.5 h-3.5 text-rose-500" />
          <span>Tarea</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('event')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'event' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Calendar className="w-3.5 h-3.5 text-purple-500" />
          <span>Evento</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('appointment')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'appointment' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <HeartPulse className="w-3.5 h-3.5 text-sky-500" />
          <span>Cita Médica</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('shopping')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'shopping' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <ShoppingCart className="w-3.5 h-3.5 text-amber-500" />
          <span>Compra</span>
        </button>

        {isAdultView && (
          <button
            type="button"
            onClick={() => setActiveTab('expense')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'expense' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
            <span>Gasto</span>
          </button>
        )}
      </div>

      {/* 0. RECORDATORIO FORM ("¿Qué necesitas recordar?") */}
      {activeTab === 'reminder' && (
        <form onSubmit={handleSaveReminder} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              ¿Qué necesitas recordar?
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="Ej: Comprar materiales de Annie, llamar al pediatra..."
              value={remTitle}
              onChange={(e) => setRemTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-400 focus:bg-white transition-all font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Fecha</label>
              <input
                type="date"
                required
                value={remDate}
                onChange={(e) => setRemDate(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Hora</label>
              <input
                type="time"
                required
                value={remTime}
                onChange={(e) => setRemTime(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Avisarme</label>
              <select
                value={remAnticipation}
                onChange={(e) => setRemAnticipation(e.target.value as AnticipationOption)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white font-medium text-stone-800"
              >
                <option value="at_time">En el momento</option>
                <option value="5_min">5 minutos antes</option>
                <option value="15_min">15 minutos antes</option>
                <option value="30_min">30 minutos antes</option>
                <option value="1_hour">1 hora antes</option>
                <option value="1_day">1 día antes</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Responsable</label>
              <select
                value={remResponsible}
                onChange={(e) => setRemResponsible(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white"
              >
                <option value="both">Mamá y Papá (ambos)</option>
                <option value="mama">Mamá 👩</option>
                <option value="papa">Papá 👨</option>
                <option value="family">Toda la Familia 🏡</option>
                {members.filter((m) => m.role === 'child').map((kid) => (
                  <option key={kid.id} value={kid.id}>
                    {kid.name} {kid.avatarEmoji}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Categoría</label>
              <select
                value={remCategory}
                onChange={(e) => setRemCategory(e.target.value as NotificationCategory)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white"
              >
                <option value="reminders">Recordatorio general 🔔</option>
                <option value="shopping">Compras y despensa 🛒</option>
                <option value="tasks">Tareas del hogar 📝</option>
                <option value="appointments">Salud y citas 🏥</option>
                <option value="medications">Medicamento 💊</option>
                <option value="events">Evento familiar 📅</option>
                <option value="couple">Pareja 💕</option>
                <option value="finance">Finanzas 💰</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Repetición</label>
              <select
                value={remRecurrence}
                onChange={(e) => setRemRecurrence(e.target.value as any)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white"
              >
                <option value="none">No repetir</option>
                <option value="daily">Todos los días</option>
                <option value="weekly">Semanalmente</option>
                <option value="monthly">Mensualmente</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Nota adicional (opcional)
            </label>
            <textarea
              rows={2}
              placeholder="Ej: Detalles de lo que no debes olvidar..."
              value={remNotes}
              onChange={(e) => setRemNotes(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Guardar Recordatorio
            </button>
          </div>
        </form>
      )}

      {/* 1. TAREA FORM */}
      {activeTab === 'task' && (
        <form onSubmit={handleSaveTask} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              1. ¿Qué tarea necesitas hacer?
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="Ej: Comprar fruta, sacar la basura, revisar uniforme..."
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-400 focus:bg-white transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                2. ¿Quién es responsable?
              </label>
              <select
                value={taskResponsible}
                onChange={(e) => setTaskResponsible(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-amber-400"
              >
                <option value="both">Mamá y Papá</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.role === 'adult' ? 'Adulto' : 'Niño'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                3. ¿Para qué fecha?
              </label>
              <input
                type="date"
                value={taskDate}
                onChange={(e) => setTaskDate(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Categoría
              </label>
              <select
                value={taskCategory}
                onChange={(e) => setTaskCategory(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-amber-400"
              >
                {config.taskCategories.map((c) => (
                  <option key={c.technicalKey} value={c.technicalKey}>
                    {c.displayName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Prioridad
              </label>
              <select
                value={taskPriority}
                onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-amber-400"
              >
                <option value="high">Alta (Urgente)</option>
                <option value="medium">Media (Normal)</option>
                <option value="low">Baja (Tranquilo)</option>
              </select>
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Guardar Tarea
            </button>
          </div>
        </form>
      )}

      {/* 2. EVENTO FORM */}
      {activeTab === 'event' && (
        <form onSubmit={handleSaveEvent} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Título del Evento
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Acto escolar, Cumpleaños de la abuela, Salida al parque..."
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-purple-400 focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Fecha</label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Hora</label>
              <input
                type="time"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Tipo de Evento</label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              >
                {config.eventTypes.map((t) => (
                  <option key={t.technicalKey} value={t.technicalKey}>
                    {t.displayName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Miembro Asociado</label>
              <select
                value={eventMember}
                onChange={(e) => setEventMember(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              >
                <option value="family">Toda la Familia</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Guardar Evento
            </button>
          </div>
        </form>
      )}

      {/* 3. CITA MÉDICA FORM */}
      {activeTab === 'appointment' && (
        <form onSubmit={handleSaveAppointment} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">¿Para quién es la cita?</label>
              <select
                value={appMember}
                onChange={(e) => setAppMember(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.age !== undefined ? `${m.age} años` : 'Adulto'})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Tipo de Cita</label>
              <select
                value={appType}
                onChange={(e) => setAppType(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              >
                {config.appointmentTypes.map((a) => (
                  <option key={a.technicalKey} value={a.technicalKey}>
                    {a.displayName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Profesional / Doctor
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Dr. Pérez (Pediatra), Dra. Soto (Dentista)..."
              value={appDoctor}
              onChange={(e) => setAppDoctor(e.target.value)}
              className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Fecha</label>
              <input
                type="date"
                value={appDate}
                onChange={(e) => setAppDate(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Hora</label>
              <input
                type="time"
                value={appTime}
                onChange={(e) => setAppTime(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Lugar / Centro Médico
            </label>
            <input
              type="text"
              placeholder="Ej: Clínica San José, Consulta 204..."
              value={appLocation}
              onChange={(e) => setAppLocation(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Notas o preguntas para la consulta
            </label>
            <input
              type="text"
              placeholder="Ej: Preguntar por dosis de jarabe, llevar carnet de vacunas..."
              value={appNotes}
              onChange={(e) => setAppNotes(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Guardar Cita
            </button>
          </div>
        </form>
      )}

      {/* 4. COMPRA FORM */}
      {activeTab === 'shopping' && (
        <form onSubmit={handleSaveShopping} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Producto o artículo para comprar
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Manzanas, Leche descremada, Pañales, Jabón..."
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Sección del supermercado</label>
            <select
              value={shopCategory}
              onChange={(e) => setShopCategory(e.target.value as ShoppingCategory)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
            >
              <option value="produce">Frutas y Verduras</option>
              <option value="dairy">Lácteos y Refrigerados</option>
              <option value="pantry">Despensa y Abarrotes</option>
              <option value="baby">Bebé y Niños</option>
              <option value="cleaning">Limpieza del Hogar</option>
              <option value="other">Otros</option>
            </select>
          </div>

          <label className="flex items-center gap-2 text-xs font-semibold text-stone-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={shopUrgent}
              onChange={(e) => setShopUrgent(e.target.checked)}
              className="w-4 h-4 text-amber-500 rounded-md border-stone-300"
            />
            <span>¿Es urgente para hoy? (Destacar en el inicio)</span>
          </label>

          <div className="pt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Añadir a Compras
            </button>
          </div>
        </form>
      )}

      {/* 5. GASTO FORM */}
      {activeTab === 'expense' && (
        <form onSubmit={handleSaveExpense} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Descripción del Gasto
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Panadería, bencina auto, útiles Annie..."
              value={expDescription}
              onChange={(e) => setExpDescription(e.target.value)}
              className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Monto ($)</label>
              <input
                type="number"
                required
                placeholder="Ej: 15000"
                value={expAmount}
                onChange={(e) => setExpAmount(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Responsable</label>
              <select
                value={expResponsible}
                onChange={(e) => setExpResponsible(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              >
                <option value="mama">Mamá</option>
                <option value="papa">Papá</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Categoría</label>
            <select
              value={expCategory}
              onChange={(e) => setExpCategory(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
            >
              {config.expenseCategories.map((c) => (
                <option key={c.technicalKey} value={c.technicalKey}>
                  {c.displayName}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Registrar Gasto
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};
