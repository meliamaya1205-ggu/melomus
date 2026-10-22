import React, { useState, useEffect } from 'react';
import { kidAuthService } from '../../services/kidAuthService';
import { KidDashboardData } from '../../types/kids';
import { Avatar } from '../common/Avatar';
import { triggerConfetti } from '../common/ConfettiCelebration';
import { getTodayString } from '../../services/dateUtils';
import {
  Sparkles,
  Trophy,
  CheckCircle2,
  Circle,
  Clock,
  Lock,
  RefreshCw,
  Gift,
  Calendar as CalendarIcon,
  Star,
  Check,
  AlertCircle,
} from 'lucide-react';

interface KidsDashboardViewProps {
  onLockScreen?: () => void;
}

type KidsTab = 'tasks' | 'habits' | 'rewards' | 'calendar' | 'points';

export const KidsDashboardView: React.FC<KidsDashboardViewProps> = ({ onLockScreen = () => {} }) => {
  const [activeTab, setActiveTab] = useState<KidsTab>('tasks');
  const [data, setData] = useState<KidDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [submittingTaskId, setSubmittingTaskId] = useState<string | null>(null);
  const [redeemingRewardId, setRedeemingRewardId] = useState<string | null>(null);

  const todayStr = getTodayString();

  const loadData = async (showLoadingSpinner = true) => {
    if (showLoadingSpinner) setIsLoading(true);
    else setIsRefreshing(true);
    setActionError(null);

    try {
      const res = await kidAuthService.getDashboardData();
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setActionError(res.error || 'No se pudieron cargar los datos.');
      }
    } catch {
      setActionError('Error de conexión al cargar el panel infantil.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData(true);

    // Auto-refresh every 12 seconds so kids see parent approvals and star rewards live
    const interval = setInterval(() => {
      loadData(false);
    }, 12000);

    return () => clearInterval(interval);
  }, []);

  // Handler: Kid marks task as finished
  const handleCompleteTask = async (taskId: string) => {
    setSubmittingTaskId(taskId);
    setActionError(null);
    try {
      const res = await kidAuthService.submitTaskCompletion(taskId);
      if (res.success) {
        triggerConfetti();
        // Optimistically update task status locally
        setData((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            tasks: prev.tasks.map((t) =>
              t.id === taskId
                ? { ...t, status: 'pending_approval', isPendingApproval: true }
                : t
            ),
          };
        });
      } else {
        setActionError(res.error || 'No se pudo enviar la tarea.');
      }
    } catch {
      setActionError('Error de comunicación.');
    } finally {
      setSubmittingTaskId(null);
    }
  };

  // Handler: Kid toggles habit for today
  const handleToggleHabit = async (habitId: string) => {
    setActionError(null);
    const habit = data?.habits.find((h) => h.id === habitId);
    const wasCompleted = habit?.completedDates.includes(todayStr);

    try {
      // Optimistic update
      setData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          habits: prev.habits.map((h) => {
            if (h.id !== habitId) return h;
            const newDates = wasCompleted
              ? h.completedDates.filter((d) => d !== todayStr)
              : [...h.completedDates, todayStr];
            return { ...h, completedDates: newDates };
          }),
        };
      });

      const res = await kidAuthService.toggleHabit(habitId, todayStr);
      if (res.success) {
        if (!wasCompleted) {
          triggerConfetti();
        }
      } else {
        // Rollback
        loadData(false);
        setActionError(res.error || 'No se pudo actualizar el hábito.');
      }
    } catch {
      loadData(false);
      setActionError('Error al sincronizar el hábito.');
    }
  };

  // Handler: Kid requests a reward redemption
  const handleRequestReward = async (rewardId: string, pointsCost: number) => {
    if (!data) return;
    if (data.child.points < pointsCost) {
      alert(`¡Te faltan ${pointsCost - data.child.points} estrellitas para este premio! Sigue completando misiones ⭐`);
      return;
    }

    setRedeemingRewardId(rewardId);
    setActionError(null);
    try {
      const res = await kidAuthService.requestRewardRedemption(rewardId);
      if (res.success) {
        triggerConfetti();
        alert('¡Solicitud enviada! Mamá o Papá la revisarán en su celular para entregarte tu premio 🎁');
        await loadData(false);
      } else {
        setActionError(res.error || 'No se pudo solicitar el premio.');
      }
    } catch {
      setActionError('Error al solicitar el premio.');
    } finally {
      setRedeemingRewardId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-900 text-white flex flex-col items-center justify-center p-6 space-y-4">
        <RefreshCw className="w-10 h-10 text-amber-400 animate-spin" />
        <h2 className="text-xl font-black">Cargando tus misiones...</h2>
        <p className="text-xs text-stone-400">Preparando tu espacio infantil seguro ✨</p>
      </div>
    );
  }

  const child = data?.child;
  const tasks = data?.tasks || [];
  const habits = data?.habits || [];
  const rewards = data?.rewards || [];
  const redemptions = data?.redemptions || [];
  const calendar = data?.calendar || [];
  const pointsHistory = data?.pointsHistory || [];

  const completedHabitsToday = habits.filter((h) => h.completedDates.includes(todayStr));

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-950 via-purple-950 to-stone-950 text-white pb-20 font-sans select-none">
      {/* Top Banner / Navigation */}
      <header className="sticky top-0 z-30 bg-black/40 backdrop-blur-xl border-b border-white/10 px-4 sm:px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar
              name={child?.name || 'Niño'}
              emoji={child?.avatarEmoji || '🌟'}
              color={child?.avatarColor || '#8b5cf6'}
              size="md"
              className="ring-2 ring-white/30"
            />
            <div>
              <h1 className="text-base sm:text-lg font-black tracking-tight text-white leading-tight">
                {child?.name || 'Mi Espacio'}
              </h1>
              <p className="text-[11px] text-purple-200/70 font-medium">
                {child?.familyName || 'Melomus Kids'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Points Treasure Bag */}
            <div className="flex items-center gap-1.5 bg-gradient-to-r from-amber-400/20 to-orange-400/20 border border-amber-300/40 px-3.5 py-1.5 rounded-2xl shadow-sm">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span className="text-sm sm:text-base font-black text-amber-300">
                {child?.points ?? 0}
              </span>
              <span className="text-[10px] font-bold uppercase text-amber-200/80 hidden sm:inline">
                Estrellitas
              </span>
            </div>

            {/* Refresh */}
            <button
              onClick={() => loadData(false)}
              disabled={isRefreshing}
              className="p-2 bg-white/10 hover:bg-white/20 active:scale-95 rounded-xl text-white transition cursor-pointer"
              title="Actualizar datos"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-amber-300' : ''}`} />
            </button>

            {/* Lock button */}
            <button
              onClick={onLockScreen}
              className="flex items-center gap-1 px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 rounded-xl text-xs font-bold transition cursor-pointer"
              title="Bloquear pantalla con PIN"
            >
              <Lock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Bloquear</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Error notification if any */}
        {actionError && (
          <div className="bg-rose-950/80 border border-rose-700 p-3 rounded-2xl text-xs text-rose-200 flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{actionError}</span>
            </div>
            <button
              onClick={() => setActionError(null)}
              className="text-xs underline text-rose-300 cursor-pointer ml-3"
            >
              Cerrar
            </button>
          </div>
        )}

        {/* Big Greeting Hero */}
        <div className="bg-gradient-to-r from-purple-600/40 via-indigo-600/40 to-pink-600/40 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-white/15 shadow-xl relative overflow-hidden">
          <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div>
              <span className="text-xs bg-amber-400 text-stone-950 font-black px-3 py-1 rounded-full inline-block mb-2 shadow-xs">
                ¡MISIONES DE HOY! ⭐
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                ¡Hola, {child?.name}! 🚀
              </h2>
              <p className="text-xs sm:text-sm text-purple-200/90 font-medium mt-1 max-w-md">
                Completa tus deberes diarios y rutinas para ganar estrellitas y canjear premios fantásticos.
              </p>
            </div>

            {/* Quick Summary Pill */}
            <div className="bg-black/30 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex items-center gap-4 text-center shrink-0">
              <div>
                <span className="text-2xl font-black text-amber-300 block">
                  {tasks.filter((t) => !t.isCompleted).length}
                </span>
                <span className="text-[10px] text-purple-200 uppercase font-bold">
                  Tareas
                </span>
              </div>
              <div className="w-px h-8 bg-white/20" />
              <div>
                <span className="text-2xl font-black text-emerald-300 block">
                  {completedHabitsToday.length}/{habits.length}
                </span>
                <span className="text-[10px] text-purple-200 uppercase font-bold">
                  Hábitos
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Section Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setActiveTab('tasks')}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'tasks'
                ? 'bg-amber-400 text-stone-950 shadow-lg shadow-amber-400/20'
                : 'bg-white/10 text-white/80 hover:bg-white/15'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Misiones ({tasks.filter((t) => !t.isCompleted).length})</span>
          </button>

          <button
            onClick={() => setActiveTab('habits')}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'habits'
                ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20'
                : 'bg-white/10 text-white/80 hover:bg-white/15'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Mis Hábitos</span>
          </button>

          <button
            onClick={() => setActiveTab('rewards')}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'rewards'
                ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/20'
                : 'bg-white/10 text-white/80 hover:bg-white/15'
            }`}
          >
            <Gift className="w-4 h-4" />
            <span>Tienda de Premios</span>
          </button>

          <button
            onClick={() => setActiveTab('calendar')}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'calendar'
                ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
                : 'bg-white/10 text-white/80 hover:bg-white/15'
            }`}
          >
            <CalendarIcon className="w-4 h-4" />
            <span>Calendario</span>
          </button>

          <button
            onClick={() => setActiveTab('points')}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'points'
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                : 'bg-white/10 text-white/80 hover:bg-white/15'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>Estrellitas</span>
          </button>
        </div>

        {/* TAB 1: TASKS / MISSIONS */}
        {activeTab === 'tasks' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <span>Mis Tareas y Deberes</span>
              </h3>
              <span className="text-xs text-purple-200/70">
                Gana estrellitas al completarlas
              </span>
            </div>

            {tasks.length === 0 ? (
              <div className="bg-white/5 border border-white/10 rounded-3xl p-8 text-center space-y-2">
                <span className="text-4xl block">🎉</span>
                <h4 className="text-base font-black text-white">¡No tienes tareas pendientes!</h4>
                <p className="text-xs text-purple-200/70 max-w-sm mx-auto">
                  Has completado todo por ahora o mamá y papá aún no te han asignado nuevas misiones. ¡Buen trabajo!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {tasks.map((task) => {
                  const isDone = task.isCompleted;
                  const isPendingReview = task.isPendingApproval;
                  const isSubmitting = submittingTaskId === task.id;

                  return (
                    <div
                      key={task.id}
                      className={`rounded-3xl p-5 border transition-all flex flex-col justify-between space-y-4 ${
                        isDone
                          ? 'bg-emerald-950/40 border-emerald-500/30 opacity-75'
                          : isPendingReview
                          ? 'bg-amber-950/40 border-amber-500/40'
                          : 'bg-white/10 border-white/15 hover:border-amber-400/50 shadow-md'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h4
                            className={`text-sm sm:text-base font-black ${
                              isDone ? 'line-through text-emerald-200/70' : 'text-white'
                            }`}
                          >
                            {task.title}
                          </h4>
                          <span className="shrink-0 flex items-center gap-1 text-xs font-black text-amber-300 bg-amber-400/20 px-2.5 py-1 rounded-xl border border-amber-300/30">
                            +{task.pointsReward} ⭐
                          </span>
                        </div>

                        {task.description && (
                          <p className="text-xs text-purple-200/80 leading-relaxed">
                            {task.description}
                          </p>
                        )}

                        {task.dueDate && (
                          <div className="flex items-center gap-1 text-[11px] text-purple-300/60 font-medium">
                            <Clock className="w-3 h-3" />
                            <span>Vence: {task.dueDate}</span>
                          </div>
                        )}
                      </div>

                      {/* Action status button */}
                      <div>
                        {isDone ? (
                          <div className="w-full py-2.5 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl flex items-center justify-center gap-2 text-xs font-black text-emerald-300">
                            <Check className="w-4 h-4" />
                            <span>¡Aprobada y Ganada! ✨</span>
                          </div>
                        ) : isPendingReview ? (
                          <div className="w-full py-2.5 bg-amber-500/20 border border-amber-500/40 rounded-2xl flex items-center justify-center gap-2 text-xs font-black text-amber-300">
                            <Clock className="w-4 h-4 animate-pulse" />
                            <span>Esperando revisión de mamá o papá ⏳</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => handleCompleteTask(task.id)}
                            className="w-full py-3 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 active:scale-98 text-stone-950 font-black text-xs sm:text-sm rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                          >
                            {isSubmitting ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                <span>Avisando a tus padres...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-4 h-4" />
                                <span>¡Terminé mi tarea! ✨</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: HABITS */}
        {activeTab === 'habits' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-purple-400" />
                  <span>Mis Hábitos Diarios</span>
                </h3>
                <p className="text-xs text-purple-200/70">
                  {completedHabitsToday.length} de {habits.length} rutinas listas hoy
                </p>
              </div>

              <div className="w-24 bg-white/10 rounded-full h-3 overflow-hidden border border-white/20">
                <div
                  className="bg-gradient-to-r from-purple-400 to-pink-400 h-3 rounded-full transition-all duration-500"
                  style={{
                    width: `${habits.length > 0 ? (completedHabitsToday.length / habits.length) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            {habits.length === 0 ? (
              <div className="bg-white/5 border border-white/10 rounded-3xl p-8 text-center space-y-2">
                <span className="text-4xl block">🎨</span>
                <h4 className="text-base font-black text-white">¡Sin hábitos configurados!</h4>
                <p className="text-xs text-purple-200/70">
                  Mamá o papá pueden agregarte rutinas como lavarse los dientes o tender la cama.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {habits.map((habit) => {
                  const isDone = habit.completedDates.includes(todayStr);

                  return (
                    <div
                      key={habit.id}
                      onClick={() => handleToggleHabit(habit.id)}
                      className={`p-4 rounded-3xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isDone
                          ? 'bg-emerald-950/40 border-emerald-400/50 shadow-md'
                          : 'bg-white/10 border-white/15 hover:border-purple-400/50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          type="button"
                          className="shrink-0 text-white transition hover:scale-110"
                        >
                          {isDone ? (
                            <CheckCircle2 className="w-7 h-7 text-emerald-400 fill-emerald-950" />
                          ) : (
                            <Circle className="w-7 h-7 text-white/40" />
                          )}
                        </button>

                        <div className="min-w-0">
                          <span className="text-xl mr-2">{habit.icon || '⭐'}</span>
                          <span
                            className={`text-sm font-black truncate ${
                              isDone ? 'line-through text-emerald-200/80' : 'text-white'
                            }`}
                          >
                            {habit.title}
                          </span>
                        </div>
                      </div>

                      <span className="shrink-0 text-xs font-black text-amber-300 bg-amber-400/20 px-2.5 py-1 rounded-xl border border-amber-300/30">
                        +{habit.points} ⭐
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: REWARDS */}
        {activeTab === 'rewards' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <Gift className="w-5 h-5 text-pink-400" />
                  <span>Tienda de Premios</span>
                </h3>
                <p className="text-xs text-purple-200/70">
                  Canjea tus estrellitas ganadas con esfuerzo
                </p>
              </div>

              <span className="text-xs font-black text-amber-300 bg-amber-400/20 px-3 py-1 rounded-xl border border-amber-300/30">
                Tienes {child?.points ?? 0} ⭐
              </span>
            </div>

            {/* Pending redemptions if any */}
            {redemptions.length > 0 && (
              <div className="bg-black/30 border border-white/10 rounded-3xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-purple-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>Tus Canjes Solicitados</span>
                </h4>
                <div className="space-y-2">
                  {redemptions.map((r) => (
                    <div
                      key={r.id}
                      className="p-3 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-white block">{r.rewardTitle}</span>
                        <span className="text-[10px] text-purple-300/60">
                          Costo: {r.pointsCost} ⭐
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-black px-2.5 py-1 rounded-xl ${
                          r.status === 'approved'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : r.status === 'rejected'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                        }`}
                      >
                        {r.status === 'approved'
                          ? '¡Aprobado! 🎁'
                          : r.status === 'rejected'
                          ? 'No aprobado'
                          : 'Esperando a papá/mamá ⏳'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Available Rewards Catalog */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {rewards.map((reward) => {
                const canAfford = (child?.points ?? 0) >= reward.pointsCost;
                const isRedeeming = redeemingRewardId === reward.id;

                return (
                  <div
                    key={reward.id}
                    className={`rounded-3xl p-5 border flex flex-col justify-between space-y-4 transition-all ${
                      canAfford
                        ? 'bg-gradient-to-b from-pink-950/30 to-purple-950/30 border-pink-400/30 shadow-md'
                        : 'bg-white/5 border-white/10 opacity-60'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-3xl">{reward.icon || '🎁'}</span>
                        <span className="text-xs font-black text-amber-300 bg-amber-400/20 px-2.5 py-1 rounded-xl border border-amber-300/30">
                          {reward.pointsCost} ⭐
                        </span>
                      </div>
                      <h4 className="text-sm font-black text-white mb-1">{reward.title}</h4>
                      {reward.description && (
                        <p className="text-xs text-purple-200/70">{reward.description}</p>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={!canAfford || isRedeeming}
                      onClick={() => handleRequestReward(reward.id, reward.pointsCost)}
                      className={`w-full py-2.5 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        canAfford
                          ? 'bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-400 hover:to-purple-400 text-white shadow-md active:scale-98'
                          : 'bg-white/10 text-white/40 cursor-not-allowed'
                      }`}
                    >
                      {isRedeeming ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : canAfford ? (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>¡Pedir este premio!</span>
                        </>
                      ) : (
                        <span>Faltan {reward.pointsCost - (child?.points ?? 0)} ⭐</span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: CALENDAR */}
        {activeTab === 'calendar' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-sky-400" />
              <span>Mi Calendario y Actividades</span>
            </h3>

            {calendar.length === 0 ? (
              <div className="bg-white/5 border border-white/10 rounded-3xl p-8 text-center space-y-2">
                <span className="text-4xl block">📅</span>
                <h4 className="text-base font-black text-white">Sin actividades programadas</h4>
                <p className="text-xs text-purple-200/70">
                  Aquí verás cumpleaños, salidas familiares y eventos de la escuela.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {calendar.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-4 bg-white/10 border border-white/15 rounded-2xl flex items-center justify-between"
                  >
                    <div>
                      <h4 className="text-sm font-black text-white">{ev.title}</h4>
                      {ev.description && (
                        <p className="text-xs text-purple-200/70">{ev.description}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-sky-300 block">{ev.date}</span>
                      {ev.time && (
                        <span className="text-[10px] text-purple-300/60">{ev.time}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: POINTS HISTORY */}
        {activeTab === 'points' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-emerald-400" />
                <span>Historial de Estrellitas</span>
              </h3>
              <span className="text-xs font-black text-amber-300 bg-amber-400/20 px-3 py-1 rounded-xl border border-amber-300/30">
                Total acumulado: {child?.points ?? 0} ⭐
              </span>
            </div>

            {pointsHistory.length === 0 ? (
              <div className="bg-white/5 border border-white/10 rounded-3xl p-8 text-center space-y-2">
                <span className="text-4xl block">⭐</span>
                <h4 className="text-base font-black text-white">¡Empieza a ganar estrellitas!</h4>
                <p className="text-xs text-purple-200/70">
                  Completa tus tareas asignadas y rutinas diarias para llenar tu alcancía.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {pointsHistory.map((ph) => (
                  <div
                    key={ph.id}
                    className="p-3.5 bg-white/10 border border-white/15 rounded-2xl flex items-center justify-between"
                  >
                    <div>
                      <span className="text-xs sm:text-sm font-bold text-white block">
                        {ph.reason}
                      </span>
                      <span className="text-[10px] text-purple-300/60">{ph.date}</span>
                    </div>
                    <span
                      className={`text-xs sm:text-sm font-black px-2.5 py-1 rounded-xl ${
                        ph.points >= 0
                          ? 'text-emerald-300 bg-emerald-500/20 border border-emerald-500/40'
                          : 'text-rose-300 bg-rose-500/20 border border-rose-500/40'
                      }`}
                    >
                      {ph.points >= 0 ? `+${ph.points}` : ph.points} ⭐
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
