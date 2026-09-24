import React, { useState } from 'react';
import { useFamily } from '../context/FamilyContext';
import { useTheme } from '../context/ThemeContext';
import { Avatar } from '../components/common/Avatar';
import { Modal } from '../components/common/Modal';
import { Habit, HabitCategory, HabitFrequency, RoutineType } from '../types/habits';
import { getTodayString } from '../services/dateUtils';
import {
  HABIT_CATEGORIES,
  getCategoryMetadata,
  calculateStreak,
  getWeeklyCompliance,
} from '../services/habitUtils';
import {
  Plus,
  CheckCircle2,
  Circle,
  Sun,
  Sunset,
  Moon,
  Sparkles,
  Trophy,
  Flame,
  Bell,
  Edit3,
  Trash2,
  Pause,
  Play,
  Users,
  User,
  Heart,
  Lock,
} from 'lucide-react';

type HabitsTab = 'all' | 'mine' | 'family' | 'kids';

export const HabitsView: React.FC = () => {
  const {
    habits,
    toggleHabitForToday,
    addHabit,
    updateHabit,
    deleteHabit,
    toggleHabitActive,
    members,
    config,
    isAdultView,
    activeProfileId,
    activeMember,
    setCurrentTab,
  } = useFamily();
  const { tokens } = useTheme();

  const todayStr = getTodayString();
  const childrenMembers = members.filter((m) => m.role === 'child' && m.relationship !== 'bebe');
  const adultMembers = members.filter((m) => m.role === 'adult');

  // Determine current active person
  const currentUserId =
    activeProfileId === 'all'
      ? 'mama'
      : activeProfileId === 'mama' || activeProfileId === 'papa'
      ? activeProfileId
      : activeProfileId;

  // View state
  const [currentTab, setHabitsTab] = useState<HabitsTab>('all');
  const [selectedChildId, setSelectedChildId] = useState<string>(
    childrenMembers[0]?.id || 'annie'
  );
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);

  // Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formTarget, setFormTarget] = useState<'mine' | 'partner' | 'family' | 'child'>('mine');
  const [formChildId, setFormChildId] = useState(childrenMembers[0]?.id || 'annie');
  const [formCategory, setFormCategory] = useState<HabitCategory>('wellness');
  const [formRoutineType, setFormRoutineType] = useState<RoutineType>('morning');
  const [formFrequency, setFormFrequency] = useState<HabitFrequency>('daily');
  const [formCustomDays, setFormCustomDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [formSuggestedTime, setFormSuggestedTime] = useState('');
  const [formReminderEnabled, setFormReminderEnabled] = useState(false);
  const [formReminderTime, setFormReminderTime] = useState('08:00');
  const [formIsPrivate, setFormIsPrivate] = useState(false);
  const [formPoints, setFormPoints] = useState<number>(2);

  // Routines configuration for kids
  const routines: { type: RoutineType; title: string; icon: React.ReactNode; color: string }[] = [
    { type: 'morning', title: 'Rutina de la Mañana', icon: <Sun className="w-4 h-4 text-amber-500" />, color: 'amber' },
    { type: 'arrival', title: 'Rutina al Llegar a Casa', icon: <Sunset className="w-4 h-4 text-orange-500" />, color: 'orange' },
    { type: 'night', title: 'Rutina de la Noche', icon: <Moon className="w-4 h-4 text-purple-500" />, color: 'purple' },
    { type: 'other', title: 'Otras Misiones Positivas', icon: <Sparkles className="w-4 h-4 text-emerald-500" />, color: 'emerald' },
  ];

  // ==========================================
  // FILTERING LOGIC
  // ==========================================
  const filteredHabits = habits.filter((habit) => {
    // Category filter
    if (selectedCategoryFilter !== 'all' && habit.category !== selectedCategoryFilter) {
      return false;
    }

    // Privacy safeguard: If private, only show if owner is the current active profile
    if (habit.isPrivate && habit.memberId && habit.memberId !== currentUserId) {
      return false;
    }

    if (currentTab === 'all') {
      return true;
    }

    if (currentTab === 'mine') {
      // Must belong strictly to the current active user
      if (currentUserId === 'mama') {
        return habit.memberId === 'mama';
      }
      if (currentUserId === 'papa') {
        return habit.memberId === 'papa';
      }
      return habit.memberId === currentUserId || habit.childId === currentUserId;
    }

    if (currentTab === 'family') {
      return habit.type === 'family' || habit.type === 'couple' || habit.isCouple;
    }

    if (currentTab === 'kids') {
      return habit.type === 'child' || !!habit.childId;
    }

    return true;
  });

  // Calculate metrics for summary bar
  const activeHabitsList = filteredHabits.filter((h) => h.active !== false);
  const completedTodayCount = activeHabitsList.filter((h) =>
    h.completedDates.includes(todayStr)
  ).length;
  const totalTodayCount = activeHabitsList.length;
  const compliancePercent =
    totalTodayCount > 0 ? Math.round((completedTodayCount / totalTodayCount) * 100) : 0;

  // Max streak among active displayed habits
  const highestStreak = activeHabitsList.reduce((max, h) => {
    const s = calculateStreak(h.completedDates, todayStr);
    return s > max ? s : max;
  }, 0);

  // ==========================================
  // MODAL HANDLERS
  // ==========================================
  const handleOpenCreateModal = () => {
    setEditingHabitId(null);
    setFormTitle('');
    setFormTarget(currentTab === 'family' ? 'family' : currentTab === 'kids' ? 'child' : 'mine');
    setFormChildId(selectedChildId || childrenMembers[0]?.id || 'annie');
    setFormCategory('wellness');
    setFormRoutineType('morning');
    setFormFrequency('daily');
    setFormCustomDays([1, 2, 3, 4, 5]);
    setFormSuggestedTime('');
    setFormReminderEnabled(false);
    setFormReminderTime('08:00');
    setFormIsPrivate(false);
    setFormPoints(2);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (habit: Habit) => {
    setEditingHabitId(habit.id);
    setFormTitle(habit.title);
    if (habit.type === 'family') {
      setFormTarget('family');
    } else if (habit.type === 'child' || habit.childId) {
      setFormTarget('child');
      setFormChildId(habit.childId || habit.memberId || childrenMembers[0]?.id || 'annie');
    } else if (habit.memberId === currentUserId) {
      setFormTarget('mine');
    } else {
      setFormTarget('partner');
    }
    setFormCategory(habit.category || 'wellness');
    setFormRoutineType(habit.routineType || 'morning');
    setFormFrequency(habit.frequency || 'daily');
    setFormCustomDays(habit.customDays || [1, 2, 3, 4, 5]);
    setFormSuggestedTime(habit.suggestedTime || '');
    setFormReminderEnabled(!!habit.reminderEnabled);
    setFormReminderTime(habit.reminderTime || habit.suggestedTime || '08:00');
    setFormIsPrivate(!!habit.isPrivate);
    setFormPoints(habit.points || 0);
    setIsModalOpen(true);
  };

  const handleSaveHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    let resolvedType: Habit['type'] = 'personal';
    let resolvedMemberId: string | undefined = undefined;
    let resolvedChildId: string | undefined = undefined;
    let resolvedPoints = 0;

    if (formTarget === 'family') {
      resolvedType = 'family';
    } else if (formTarget === 'child') {
      resolvedType = 'child';
      resolvedMemberId = formChildId;
      resolvedChildId = formChildId;
      resolvedPoints = Number(formPoints) || 1;
    } else if (formTarget === 'mine') {
      resolvedType = 'personal';
      resolvedMemberId = currentUserId;
    } else if (formTarget === 'partner') {
      resolvedType = 'personal';
      const partner = adultMembers.find((m) => m.id !== currentUserId);
      resolvedMemberId = partner?.id || 'papa';
    }

    const habitPayload: Partial<Habit> = {
      title: formTitle.trim(),
      type: resolvedType,
      category: formCategory,
      routineType: formRoutineType,
      memberId: resolvedMemberId,
      childId: resolvedChildId,
      points: resolvedPoints,
      frequency: formFrequency,
      customDays: formFrequency === 'custom' ? formCustomDays : undefined,
      suggestedTime: formSuggestedTime || undefined,
      reminderEnabled: formReminderEnabled,
      reminderTime: formReminderEnabled ? formReminderTime : undefined,
      isPrivate: formTarget === 'mine' ? formIsPrivate : false,
      active: true,
    };

    if (editingHabitId) {
      updateHabit(editingHabitId, habitPayload);
    } else {
      addHabit({
        ...habitPayload,
        title: formTitle.trim(),
        points: resolvedPoints,
        frequency: formFrequency,
        active: true,
      } as Omit<Habit, 'id' | 'completedDates'>);
    }

    setIsModalOpen(false);
  };

  const handleDeleteHabit = (habitId: string, habitTitle: string) => {
    if (window.confirm(`¿Estás seguro de eliminar el hábito "${habitTitle}"?`)) {
      deleteHabit(habitId);
    }
  };

  const toggleCustomDay = (day: number) => {
    setFormCustomDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  // Helper for Member / Owner Label
  const getOwnerLabel = (habit: Habit) => {
    if (habit.type === 'family') {
      return { label: 'Toda la familia', color: 'bg-sky-50 text-sky-700 border-sky-200', icon: <Users className="w-3 h-3" /> };
    }
    if (habit.type === 'couple' || habit.isCouple) {
      return { label: 'Pareja', color: 'bg-rose-50 text-rose-700 border-rose-200', icon: <Heart className="w-3 h-3" /> };
    }
    const memberId = habit.memberId || habit.childId;
    const member = members.find((m) => m.id === memberId);
    if (!member) {
      return { label: 'General', color: 'bg-stone-50 text-stone-600 border-stone-200', icon: <User className="w-3 h-3" /> };
    }
    return {
      label: member.name,
      color: member.id === 'mama' ? 'bg-pink-50 text-pink-700 border-pink-200' : member.id === 'papa' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-purple-50 text-purple-700 border-purple-200',
      icon: <span>{member.avatarEmoji}</span>,
    };
  };

  const getFrequencyLabel = (freq?: HabitFrequency) => {
    switch (freq) {
      case 'daily':
        return 'Diario';
      case 'weekdays':
        return 'Lun a Vie';
      case 'weekends':
        return 'Fines de semana';
      case 'weekly':
        return 'Semanal';
      case 'custom':
        return 'Días selec.';
      default:
        return 'Diario';
    }
  };

  return (
    <div className="space-y-6">
      {/* ==========================================
          HEADER & ACCIÓN PRINCIPAL
          ========================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-stone-900">
              {config.modules.habits.displayName}
            </h2>
            <span className="text-xs bg-purple-50 text-purple-700 font-semibold px-2.5 py-0.5 rounded-full border border-purple-200">
              Lo mío + lo nuestro
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            Organización, crecimiento y bienestar para mamá, papá, la familia y los niños
          </p>
        </div>

        {isAdultView && (
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-2xl shadow-sm transition-all cursor-pointer hover:shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Hábito</span>
          </button>
        )}
      </div>

      {/* ==========================================
          MÉTRICAS Y SEGUIMIENTO GENERAL
          ========================================== */}
      <div
        className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-white border border-stone-200/80 shadow-xs"
        style={{ borderRadius: tokens.cardRadius }}
      >
        <div className="p-3 bg-stone-50/70 rounded-2xl">
          <p className="text-[11px] font-semibold text-stone-500">Cumplimiento hoy</p>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-lg font-black text-stone-900">{completedTodayCount}</span>
            <span className="text-xs font-bold text-stone-400">/ {totalTodayCount}</span>
          </div>
          <div className="w-full bg-stone-200 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${compliancePercent}%` }}
            />
          </div>
        </div>

        <div className="p-3 bg-stone-50/70 rounded-2xl">
          <p className="text-[11px] font-semibold text-stone-500">Mejor Racha</p>
          <div className="flex items-center gap-1.5 mt-1">
            <Flame className="w-5 h-5 text-amber-500 fill-amber-500" />
            <span className="text-lg font-black text-stone-900">{highestStreak}</span>
            <span className="text-xs font-semibold text-stone-500">días</span>
          </div>
          <p className="text-[10px] text-stone-400 mt-1">Consistencia activa</p>
        </div>

        <div className="p-3 bg-stone-50/70 rounded-2xl">
          <p className="text-[11px] font-semibold text-stone-500">Hábitos Activos</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-lg font-black text-stone-900">{activeHabitsList.length}</span>
            <span className="text-[10px] text-stone-400">en seguimiento</span>
          </div>
          <p className="text-[10px] text-emerald-600 font-medium mt-1">🌱 En progreso</p>
        </div>

        <div className="p-3 bg-stone-50/70 rounded-2xl">
          <p className="text-[11px] font-semibold text-stone-500">Perfil Activo</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-base">{activeMember?.avatarEmoji || '🏡'}</span>
            <span className="text-xs font-bold text-stone-900 truncate">
              {activeMember?.name || 'Toda la Familia'}
            </span>
          </div>
          <p className="text-[10px] text-purple-600 font-semibold mt-1">
            {activeProfileId === 'mama' ? 'Modo Mamá' : activeProfileId === 'papa' ? 'Modo Papá' : 'Modo Familiar'}
          </p>
        </div>
      </div>

      {/* ==========================================
          PESTAÑAS DE NAVEGACIÓN Y FILTROS
          ========================================== */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 border-b border-stone-200">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setHabitsTab('all')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              currentTab === 'all'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'bg-transparent text-stone-600 hover:bg-stone-100'
            }`}
          >
            <span>🌟</span>
            <span>Todos</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-stone-700/30">
              {habits.filter((h) => !h.isPrivate || h.memberId === currentUserId).length}
            </span>
          </button>

          <button
            onClick={() => setHabitsTab('mine')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              currentTab === 'mine'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-transparent text-stone-600 hover:bg-stone-100'
            }`}
          >
            <span>{currentUserId === 'mama' ? '🌸' : currentUserId === 'papa' ? '🌿' : '👤'}</span>
            <span>Mis Hábitos</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                currentTab === 'mine' ? 'bg-purple-700 text-purple-100' : 'bg-stone-200 text-stone-600'
              }`}
            >
              {habits.filter((h) => h.memberId === currentUserId).length}
            </span>
          </button>

          <button
            onClick={() => setHabitsTab('family')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              currentTab === 'family'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-transparent text-stone-600 hover:bg-stone-100'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Familia</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                currentTab === 'family' ? 'bg-sky-700 text-sky-100' : 'bg-stone-200 text-stone-600'
              }`}
            >
              {habits.filter((h) => h.type === 'family' || h.type === 'couple' || h.isCouple).length}
            </span>
          </button>

          <button
            onClick={() => setHabitsTab('kids')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              currentTab === 'kids'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-transparent text-stone-600 hover:bg-stone-100'
            }`}
          >
            <span>🧒</span>
            <span>Niños</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                currentTab === 'kids' ? 'bg-amber-700 text-amber-100' : 'bg-stone-200 text-stone-600'
              }`}
            >
              {habits.filter((h) => h.type === 'child' || !!h.childId).length}
            </span>
          </button>
        </div>

        {/* Quick Category Filter Dropdown */}
        <div className="flex-shrink-0">
          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            className="text-xs bg-white border border-stone-200 rounded-xl px-2.5 py-1.5 text-stone-700 font-medium"
          >
            <option value="all">Todas las categorías</option>
            {HABIT_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji} {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ==========================================
          VISTA ESPECÍFICA: NIÑOS (CONSERVANDO 100% EXPERIENCIA)
          ========================================== */}
      {currentTab === 'kids' && (
        <div className="space-y-6">
          {/* Banner positivo de refuerzo */}
          <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-amber-500 rounded-3xl p-5 text-white shadow-sm flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-2xl flex-shrink-0">
                🌱
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-purple-100">
                  Enfoque formativo y amoroso
                </p>
                <p className="text-sm sm:text-base font-bold italic mt-0.5">
                  "{config.kidInterface.positiveQuote}"
                </p>
              </div>
            </div>
            <button
              onClick={() => setCurrentTab('rewards')}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-xs rounded-xl text-xs font-bold transition-all text-white flex-shrink-0"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-300" />
              <span>Ver Alcancía Mágica →</span>
            </button>
          </div>

          {/* Selector de Niños */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {childrenMembers.map((child) => (
              <button
                key={child.id}
                onClick={() => setSelectedChildId(child.id)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                  selectedChildId === child.id
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50'
                }`}
              >
                <Avatar
                  name={child.name}
                  emoji={child.avatarEmoji}
                  color={child.avatarColor}
                  size="sm"
                />
                <span>{child.name}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] ${
                    selectedChildId === child.id ? 'bg-purple-700 text-purple-100' : 'bg-purple-50 text-purple-700'
                  }`}
                >
                  ⭐ {child.points} pts
                </span>
              </button>
            ))}
          </div>

          {/* Rutinas del niño seleccionado */}
          <div className="space-y-6">
            {routines.map((routine) => {
              const habitsInRoutine = filteredHabits.filter(
                (h) => (h.childId === selectedChildId || h.memberId === selectedChildId) && h.routineType === routine.type
              );
              if (habitsInRoutine.length === 0) return null;

              return (
                <div key={routine.type} className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-stone-100 rounded-xl">{routine.icon}</div>
                      <div>
                        <h3 className="text-sm font-bold text-stone-900">{routine.title}</h3>
                        <p className="text-xs text-stone-400">
                          {habitsInRoutine.filter((h) => h.completedDates.includes(todayStr)).length} de{' '}
                          {habitsInRoutine.length} cumplidos hoy
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {habitsInRoutine.map((habit) => {
                      const isDoneToday = habit.completedDates.includes(todayStr);
                      const streak = calculateStreak(habit.completedDates, todayStr);

                      return (
                        <div
                          key={habit.id}
                          className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                            isDoneToday
                              ? 'bg-emerald-50/70 border-emerald-200 shadow-xs'
                              : 'bg-stone-50/70 border-stone-200/70 hover:bg-white hover:border-purple-200'
                          }`}
                        >
                          <div
                            onClick={() => toggleHabitForToday(habit.id, todayStr)}
                            className="flex items-start gap-3 cursor-pointer select-none flex-1"
                          >
                            <button
                              type="button"
                              className="mt-0.5 text-stone-300 hover:text-emerald-500 transition-colors"
                            >
                              {isDoneToday ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-100" />
                              ) : (
                                <Circle className="w-5 h-5" />
                              )}
                            </button>

                            <div>
                              <p
                                className={`text-xs font-bold leading-snug ${
                                  isDoneToday ? 'text-emerald-950 line-through' : 'text-stone-900'
                                }`}
                              >
                                {habit.title}
                              </p>

                              <div className="flex items-center gap-2 text-[10px] text-stone-400 mt-1.5 flex-wrap">
                                {streak > 0 && (
                                  <span className="font-semibold text-amber-600 flex items-center gap-0.5 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200/60">
                                    <Flame className="w-3 h-3 fill-amber-500" />
                                    {streak} {streak === 1 ? 'día' : 'días'}
                                  </span>
                                )}
                                {habit.suggestedTime && (
                                  <span className="font-medium bg-stone-100 px-1.5 py-0.5 rounded-md text-stone-600">
                                    ⏰ {habit.suggestedTime}
                                  </span>
                                )}
                                <span className="capitalize">{getFrequencyLabel(habit.frequency)}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="flex items-center gap-1.5 bg-amber-50 px-2 py-1 rounded-xl border border-amber-200/70 text-amber-900 font-black text-xs">
                              <Trophy className="w-3.5 h-3.5 text-amber-500" />
                              <span>+{habit.points || 1}</span>
                            </div>

                            {isAdultView && (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleOpenEditModal(habit)}
                                  className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                                  title="Editar"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteHabit(habit.id, habit.title)}
                                  className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="Eliminar"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==========================================
          VISTA: TODOS, MÍOS, FAMILIA (CARDS MODERNAS)
          ========================================== */}
      {currentTab !== 'kids' && (
        <div className="space-y-4">
          {/* Subtítulo informativo */}
          <div className="flex items-center justify-between text-xs text-stone-500 px-1">
            <span>
              {currentTab === 'mine'
                ? `Mostrando únicamente los hábitos personales de ${
                    currentUserId === 'mama' ? 'Mamá' : currentUserId === 'papa' ? 'Papá' : 'tu perfil'
                  }`
                : currentTab === 'family'
                ? 'Hábitos compartidos y coordinados de la casa'
                : 'Todos los hábitos del hogar visibles'}
            </span>
            <span>{filteredHabits.length} hábitos en total</span>
          </div>

          {filteredHabits.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-stone-200/80 p-8">
              <span className="text-4xl block mb-2">🌿</span>
              <h3 className="text-sm font-bold text-stone-800">No hay hábitos en esta sección</h3>
              <p className="text-xs text-stone-400 mt-1 max-w-sm mx-auto">
                {currentTab === 'mine'
                  ? 'Añade hábitos constructivos para tu autocuidado, salud y bienestar personal.'
                  : currentTab === 'family'
                  ? 'Crea hábitos compartidos para fortalecer la convivencia y la armonía del hogar.'
                  : 'Comienza creando un nuevo hábito para ti o tu familia.'}
              </p>
              {isAdultView && (
                <button
                  onClick={handleOpenCreateModal}
                  className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Crear Hábito</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredHabits.map((habit) => {
                const isDoneToday = habit.completedDates.includes(todayStr);
                const isPaused = habit.active === false;
                const streak = calculateStreak(habit.completedDates, todayStr);
                const categoryMeta = getCategoryMetadata(habit.category || 'other');
                const ownerMeta = getOwnerLabel(habit);
                const weeklyDays = getWeeklyCompliance(habit.completedDates, todayStr);

                return (
                  <div
                    key={habit.id}
                    className={`p-4 rounded-3xl border transition-all flex flex-col justify-between gap-3 ${
                      isPaused
                        ? 'bg-stone-50/60 border-stone-200/60 opacity-65'
                        : isDoneToday
                        ? 'bg-emerald-50/50 border-emerald-200/80 shadow-xs'
                        : 'bg-white border-stone-200/90 hover:border-purple-200 shadow-xs'
                    }`}
                  >
                    {/* Top Row: Check + Title + Actions */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-start gap-3 flex-1">
                        <button
                          type="button"
                          disabled={isPaused}
                          onClick={() => toggleHabitForToday(habit.id, todayStr)}
                          className={`mt-0.5 transition-colors cursor-pointer ${
                            isPaused ? 'cursor-not-allowed opacity-40' : 'text-stone-300 hover:text-emerald-500'
                          }`}
                        >
                          {isDoneToday ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-100" />
                          ) : (
                            <Circle className="w-5 h-5" />
                          )}
                        </button>

                        <div className="flex-1">
                          <p
                            className={`text-xs font-bold leading-snug ${
                              isDoneToday ? 'text-emerald-950 line-through' : 'text-stone-900'
                            }`}
                          >
                            {habit.title}
                          </p>

                          {/* Badges row */}
                          <div className="flex items-center gap-1.5 text-[10px] mt-2 flex-wrap">
                            {/* Category Badge */}
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold border ${categoryMeta.badgeClass}`}
                            >
                              <span>{categoryMeta.emoji}</span>
                              <span>{categoryMeta.name}</span>
                            </span>

                            {/* Owner Badge */}
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold border ${ownerMeta.color}`}
                            >
                              {ownerMeta.icon}
                              <span>{ownerMeta.label}</span>
                            </span>

                            {/* Frequency Badge */}
                            <span className="bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded-md font-medium border border-stone-200/60">
                              {getFrequencyLabel(habit.frequency)}
                            </span>

                            {/* Time & Reminder */}
                            {habit.reminderEnabled && (
                              <span className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded-md font-semibold border border-purple-200/60 flex items-center gap-1">
                                <Bell className="w-2.5 h-2.5" />
                                <span>{habit.reminderTime || habit.suggestedTime}</span>
                              </span>
                            )}

                            {/* Privacy Badge */}
                            {habit.isPrivate && (
                              <span className="bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded-md font-medium flex items-center gap-1 border border-stone-200">
                                <Lock className="w-2.5 h-2.5 text-stone-500" />
                                <span>Privado</span>
                              </span>
                            )}

                            {/* Paused Badge */}
                            {isPaused && (
                              <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-md font-bold">
                                ⏸️ En pausa
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right streak pill & Action buttons */}
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        {streak > 0 && (
                          <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200/70 text-amber-900 font-black text-[11px]">
                            <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                            <span>{streak}d</span>
                          </div>
                        )}

                        {isAdultView && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => toggleHabitActive(habit.id)}
                              className="p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-md transition-colors cursor-pointer"
                              title={isPaused ? 'Reanudar hábito' : 'Pausar hábito'}
                            >
                              {isPaused ? <Play className="w-3.5 h-3.5 text-emerald-600" /> : <Pause className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => handleOpenEditModal(habit)}
                              className="p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-md transition-colors cursor-pointer"
                              title="Editar"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteHabit(habit.id, habit.title)}
                              className="p-1 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                              title="Eliminar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Row: 7-Day Weekly Compliance Dots */}
                    <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider">
                        Semana actual
                      </span>
                      <div className="flex items-center gap-1.5">
                        {weeklyDays.map((day, idx) => (
                          <div
                            key={idx}
                            title={`${day.dateStr} (${day.completed ? 'Cumplido' : 'Pendiente'})`}
                            className={`flex flex-col items-center justify-center w-5 h-5 rounded-md text-[9px] font-bold select-none ${
                              day.completed
                                ? 'bg-emerald-500 text-white shadow-2xs'
                                : day.isToday
                                ? 'border border-purple-400 text-purple-700 bg-purple-50 font-black'
                                : 'bg-stone-100 text-stone-400'
                            }`}
                          >
                            <span>{day.dayLabel}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==========================================
          MODAL: CREAR / EDITAR HÁBITO INTEGRAL
          ========================================== */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingHabitId ? 'Editar Hábito' : 'Crear Nuevo Hábito'}
        subtitle="Diseña una rutina constructiva para ti o para tu familia"
      >
        <form onSubmit={handleSaveHabit} className="space-y-4">
          {/* Título */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Nombre del Hábito
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="Ej: Tomar 2L de agua, Cenar juntos sin pantallas, 15 min lectura..."
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:bg-white focus:outline-purple-500"
            />
          </div>

          {/* ¿Para quién es? */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">¿Para quién es?</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormTarget('mine')}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  formTarget === 'mine'
                    ? 'bg-purple-50 border-purple-300 text-purple-900 shadow-2xs'
                    : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                }`}
              >
                <span>{currentUserId === 'mama' ? '🌸' : '🌿'}</span>
                <span>Para mí ({currentUserId === 'mama' ? 'Mamá' : currentUserId === 'papa' ? 'Papá' : 'Personal'})</span>
              </button>

              <button
                type="button"
                onClick={() => setFormTarget('family')}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  formTarget === 'family'
                    ? 'bg-sky-50 border-sky-300 text-sky-900 shadow-2xs'
                    : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-sky-600" />
                <span>Para toda la familia</span>
              </button>

              <button
                type="button"
                onClick={() => setFormTarget('child')}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  formTarget === 'child'
                    ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-2xs'
                    : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                }`}
              >
                <span>🧒</span>
                <span>Para un niño</span>
              </button>

              <button
                type="button"
                onClick={() => setFormTarget('partner')}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  formTarget === 'partner'
                    ? 'bg-rose-50 border-rose-300 text-rose-900 shadow-2xs'
                    : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                }`}
              >
                <span>{currentUserId === 'mama' ? '🌿' : '🌸'}</span>
                <span>Para mi pareja ({currentUserId === 'mama' ? 'Papá' : 'Mamá'})</span>
              </button>
            </div>
          </div>

          {/* Si es para un niño: Selector de Niño y Puntos */}
          {formTarget === 'child' && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-amber-50/50 rounded-2xl border border-amber-200/60">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Hijo o Hija</label>
                <select
                  value={formChildId}
                  onChange={(e) => setFormChildId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-medium"
                >
                  {childrenMembers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Puntos Alcancía (+pts)
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={formPoints}
                  onChange={(e) => setFormPoints(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-medium"
                />
              </div>
            </div>
          )}

          {/* Categoría & Momento del Día */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Categoría</label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value as HabitCategory)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium"
              >
                {HABIT_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.emoji} {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Momento / Rutina</label>
              <select
                value={formRoutineType}
                onChange={(e) => setFormRoutineType(e.target.value as RoutineType)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium"
              >
                <option value="morning">🌅 Rutina de la Mañana</option>
                <option value="arrival">🎒 Al Llegar a Casa</option>
                <option value="night">🌙 Rutina de la Noche</option>
                <option value="other">⭐ Todo el Día / Libre</option>
              </select>
            </div>
          </div>

          {/* Frecuencia */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Frecuencia</label>
            <select
              value={formFrequency}
              onChange={(e) => setFormFrequency(e.target.value as HabitFrequency)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium"
            >
              <option value="daily">Diaria (Todos los días)</option>
              <option value="weekdays">Días laborales (Lunes a Viernes)</option>
              <option value="weekends">Fines de semana (Sábado y Domingo)</option>
              <option value="weekly">Semanal (1 vez por semana)</option>
              <option value="custom">Personalizada por días</option>
            </select>

            {formFrequency === 'custom' && (
              <div className="flex items-center gap-1.5 mt-2">
                {[
                  { id: 1, label: 'L' },
                  { id: 2, label: 'M' },
                  { id: 3, label: 'X' },
                  { id: 4, label: 'J' },
                  { id: 5, label: 'V' },
                  { id: 6, label: 'S' },
                  { id: 0, label: 'D' },
                ].map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => toggleCustomDay(d.id)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      formCustomDays.includes(d.id)
                        ? 'bg-purple-600 text-white'
                        : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Hora sugerida & Recordatorio */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Hora Sugerida</label>
              <input
                type="time"
                value={formSuggestedTime}
                onChange={(e) => setFormSuggestedTime(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Recordatorio</label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="checkbox"
                  id="reminderCheck"
                  checked={formReminderEnabled}
                  onChange={(e) => setFormReminderEnabled(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500 cursor-pointer w-4 h-4"
                />
                <label htmlFor="reminderCheck" className="text-xs text-stone-700 cursor-pointer font-medium">
                  Notificar a la hora:
                </label>
              </div>
              {formReminderEnabled && (
                <input
                  type="time"
                  value={formReminderTime}
                  onChange={(e) => setFormReminderTime(e.target.value)}
                  className="w-full mt-2 px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs"
                />
              )}
            </div>
          </div>

          {/* Privacidad (para hábitos personales de adultos) */}
          {formTarget === 'mine' && (
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 flex items-center gap-2">
              <input
                type="checkbox"
                id="privateCheck"
                checked={formIsPrivate}
                onChange={(e) => setFormIsPrivate(e.target.checked)}
                className="rounded text-purple-600 focus:ring-purple-500 cursor-pointer w-4 h-4"
              />
              <label htmlFor="privateCheck" className="text-xs text-stone-700 cursor-pointer">
                <span className="font-semibold block">Hábito personal privado</span>
                <span className="text-[10px] text-stone-400 block">
                  Solo será visible cuando tu perfil ({currentUserId === 'mama' ? 'Mamá' : 'Papá'}) esté activo
                </span>
              </label>
            </div>
          )}

          {/* Botones de acción */}
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
              {editingHabitId ? 'Guardar Cambios' : 'Crear Hábito'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
