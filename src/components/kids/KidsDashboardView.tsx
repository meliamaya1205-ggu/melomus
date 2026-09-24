import React, { useState } from 'react';
import { useFamily } from '../../context/FamilyContext';
import { Avatar } from '../common/Avatar';
import { triggerConfetti } from '../common/ConfettiCelebration';
import { getTodayString } from '../../services/dateUtils';
import {
  Trophy,
  CheckCircle2,
  Circle,
  Sparkles,
  Palette,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { ThemeSelector } from '../theme/ThemeSelector';

export const KidsDashboardView: React.FC = () => {
  const {
    activeMember,
    habits,
    toggleHabitForToday,
    rewards,
    redeemReward,
    config,
    setActiveProfileId,
    setFamilyResetModalOpen,
  } = useFamily();

  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);

  const todayStr = getTodayString();
  const childId = activeMember?.id || 'annie';
  const childHabits = habits.filter((h) => h.childId === childId);
  const completedHabits = childHabits.filter((h) => h.completedDates.includes(todayStr));

  const handleHabitCheck = (habitId: string) => {
    const habit = habits.find((h) => h.id === habitId);
    const wasCompleted = habit?.completedDates.includes(todayStr);
    toggleHabitForToday(habitId, todayStr);
    if (!wasCompleted) {
      triggerConfetti();
    }
  };

  const handleRedeemReward = (rewardId: string, cost: number) => {
    if (!activeMember) return;
    if (activeMember.points < cost) {
      alert(`¡Te faltan ${cost - activeMember.points} estrellitas para este premio! Sigue completando tus misiones ✨`);
      return;
    }
    const success = redeemReward(rewardId, activeMember.id);
    if (success) {
      triggerConfetti();
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12 animate-in fade-in duration-150">
      {/* Kid Welcome Card */}
      <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-amber-400 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-5 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Avatar
              name={activeMember?.name || 'Niño'}
              emoji={activeMember?.avatarEmoji}
              color={activeMember?.avatarColor}
              size="xl"
              className="ring-4 ring-white/30 shadow-md"
            />
            <div>
              <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-bold inline-block mb-1">
                {config.kidInterface.welcomeTitle}
              </span>
              <h2 className="text-2xl sm:text-4xl font-black tracking-tight">
                ¡Hola, {activeMember?.name}! 🌟
              </h2>
              <p className="text-white/90 text-sm mt-1 max-w-sm font-medium">
                "{config.kidInterface.positiveQuote}"
              </p>
            </div>
          </div>

          {/* Points Treasure Chest */}
          <div className="bg-white/20 backdrop-blur-md rounded-3xl p-4 px-6 text-center border border-white/30 flex-shrink-0 shadow-md">
            <span className="text-3xl sm:text-4xl font-black block text-amber-200">
              ⭐ {activeMember?.points}
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-white">
              {config.kidInterface.rewardsTitle}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Actions Grid for Kids */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Reset Familiar for kids */}
        <div
          onClick={() => setFamilyResetModalOpen(true)}
          className="bg-gradient-to-r from-amber-400 to-orange-400 rounded-2xl p-4 text-white flex items-center justify-between shadow-md cursor-pointer hover:scale-101 active:scale-99 transition-transform"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-3xl shrink-0">🧹</span>
            <div className="min-w-0">
              <h4 className="text-sm font-black truncate">
                {config.kidInterface.resetTitle}
              </h4>
              <p className="text-xs text-white/90 truncate">¡10 minutos de orden en equipo!</p>
            </div>
          </div>
          <span className="px-3 py-1.5 bg-white text-orange-950 font-bold text-xs rounded-xl shadow-xs shrink-0 ml-2">
            ¡Vamos!
          </span>
        </div>

        {/* Kid Theme Customizer */}
        <div
          onClick={() => setIsThemeModalOpen(true)}
          className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-4 text-white flex items-center justify-between shadow-md cursor-pointer hover:scale-101 active:scale-99 transition-transform"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-3xl shrink-0">🎨</span>
            <div className="min-w-0">
              <h4 className="text-sm font-black truncate">
                Mi Estilo y Color
              </h4>
              <p className="text-xs text-white/90 truncate">¡Elige cómo se ve tu pantalla!</p>
            </div>
          </div>
          <span className="px-3 py-1.5 bg-white text-purple-950 font-bold text-xs rounded-xl shadow-xs shrink-0 ml-2">
            Cambiar
          </span>
        </div>
      </div>

      {/* Today's Missions */}
      <div className="bg-white rounded-3xl p-6 border border-purple-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-stone-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              <span>{config.kidInterface.habitsTitle}</span>
            </h3>
            <p className="text-xs text-stone-500">
              Llevas {completedHabits.length} de {childHabits.length} misiones listas hoy
            </p>
          </div>

          <div className="w-24 bg-stone-100 rounded-full h-3 overflow-hidden">
            <div
              className="bg-purple-500 h-3 rounded-full transition-all duration-500"
              style={{
                width: `${childHabits.length > 0 ? (completedHabits.length / childHabits.length) * 100 : 0}%`,
              }}
            />
          </div>
        </div>

        {childHabits.length === 0 ? (
          <p className="text-xs text-stone-400 text-center py-6">
            ¡Hoy no tienes misiones asignadas! Disfruta tu día 🎨
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {childHabits.map((habit) => {
              const isDone = habit.completedDates.includes(todayStr);

              return (
                <div
                  key={habit.id}
                  onClick={() => handleHabitCheck(habit.id)}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer select-none flex items-center justify-between gap-3 ${
                    isDone
                      ? 'bg-emerald-50 border-emerald-300 shadow-xs'
                      : 'bg-stone-50/80 border-stone-200 hover:bg-white hover:border-purple-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button type="button" className="text-stone-300">
                      {isDone ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-600 fill-emerald-100" />
                      ) : (
                        <Circle className="w-6 h-6 text-stone-400" />
                      )}
                    </button>

                    <div>
                      <span
                        className={`text-sm font-bold block ${
                          isDone ? 'line-through text-emerald-900' : 'text-stone-900'
                        }`}
                      >
                        {habit.title}
                      </span>
                      <span className="text-[11px] text-stone-500 capitalize">
                        {habit.routineType === 'morning'
                          ? '🌅 Mañana'
                          : habit.routineType === 'arrival'
                          ? '🎒 Llegada'
                          : '🌙 Noche'}
                      </span>
                    </div>
                  </div>

                  <span className="flex items-center gap-1 text-xs font-black text-amber-800 bg-amber-100/80 px-2.5 py-1 rounded-xl">
                    +{habit.points} ⭐
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Rewards Redeem Showcase */}
      <div className="bg-white rounded-3xl p-6 border border-amber-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-extrabold text-stone-900">Premios para Canjear</h3>
          </div>
          <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
            Tienes {activeMember?.points} estrellitas
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {rewards.map((reward) => {
            const canAfford = (activeMember?.points || 0) >= reward.pointsCost;

            return (
              <div
                key={reward.id}
                className={`p-4 rounded-2xl border flex flex-col justify-between transition-all ${
                  canAfford
                    ? 'bg-amber-50/50 border-amber-200'
                    : 'bg-stone-50 border-stone-200 opacity-60'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-2xl">🎁</span>
                    <span className="text-xs font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded-lg">
                      {reward.pointsCost} ⭐
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-stone-900 mb-1">{reward.title}</h4>
                  <p className="text-[11px] text-stone-500">{reward.description}</p>
                </div>

                <button
                  onClick={() => handleRedeemReward(reward.id, reward.pointsCost)}
                  disabled={!canAfford}
                  className={`mt-4 w-full py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    canAfford
                      ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs'
                      : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                  }`}
                >
                  {canAfford ? '¡Canjear!' : `Faltan ${reward.pointsCost - (activeMember?.points || 0)}`}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Switch back to adult banner */}
      <div className="p-4 bg-stone-100 rounded-2xl flex items-center justify-between text-xs text-stone-600">
        <span>¿Eres Mamá o Papá? Puedes volver al panel completo de adultos en cualquier momento.</span>
        <button
          onClick={() => setActiveProfileId('mama')}
          className="px-3.5 py-1.5 bg-stone-800 text-white rounded-xl font-bold hover:bg-stone-900 transition-colors cursor-pointer"
        >
          Panel Adultos
        </button>
      </div>

      {/* Kid Theme Customizer Modal */}
      <Modal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
        title={
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-purple-600" />
            <span>Personalizar mi pantalla ({activeMember?.name})</span>
          </div>
        }
        subtitle="Elige tu estilo visual favorito y tu color personal"
        maxWidth="2xl"
      >
        <ThemeSelector
          forcedMemberId={activeMember?.id}
          onSaved={() => setIsThemeModalOpen(false)}
        />
      </Modal>
    </div>
  );
};
