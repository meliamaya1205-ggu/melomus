import React, { useState } from 'react';
import { useFamily } from '../../context/FamilyContext';
import { useTheme } from '../../context/ThemeContext';
import { Avatar } from '../common/Avatar';
import { Smile, CheckCircle, Circle, Trophy, Users, Flame, ArrowRight, Sparkles } from 'lucide-react';
import { getTodayString } from '../../services/dateUtils';
import { calculateStreak, getCategoryMetadata } from '../../services/habitUtils';

type DashboardHabitTab = 'mine' | 'family' | 'kids';

export const KidsHabitSummary: React.FC = () => {
  const {
    members,
    habits,
    toggleHabitForToday,
    config,
    setCurrentTab,
    activeProfileId,
  } = useFamily();
  const { tokens, isMinimalista, isPremium } = useTheme();

  const todayStr = getTodayString();
  const childrenMembers = members.filter((m) => m.role === 'child' && m.relationship !== 'bebe');

  // Determine current adult ID
  const currentAdultId =
    activeProfileId === 'papa' ? 'papa' : 'mama';

  // Initial tab based on profile
  const [tab, setTab] = useState<DashboardHabitTab>(
    activeProfileId === 'annie' || activeProfileId === 'derek' ? 'kids' : 'mine'
  );

  // Filter habits for each group
  const myHabits = habits.filter(
    (h) => h.active !== false && (h.memberId === currentAdultId || (activeProfileId === 'annie' && h.childId === 'annie') || (activeProfileId === 'derek' && h.childId === 'derek'))
  );
  const familyHabits = habits.filter(
    (h) => h.active !== false && (h.type === 'family' || h.type === 'couple' || h.isCouple)
  );

  const myCompletedCount = myHabits.filter((h) => h.completedDates.includes(todayStr)).length;
  const familyCompletedCount = familyHabits.filter((h) => h.completedDates.includes(todayStr)).length;

  return (
    <div
      className="theme-card p-5 transition-all duration-300"
      style={{
        backgroundColor: tokens.cardBg,
        border: tokens.cardBorder,
        borderRadius: tokens.cardRadius,
        boxShadow: tokens.cardShadow,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className="p-2 flex items-center justify-center text-purple-600 bg-purple-50"
            style={{ borderRadius: isMinimalista ? '0.375rem' : tokens.badgeRadius }}
          >
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-stone-800">
              Hábitos del Hogar
            </h3>
            <p className="text-[11px] text-stone-400">Lo mío + lo nuestro</p>
          </div>
        </div>
        <button
          onClick={() => setCurrentTab('habits')}
          className="text-xs font-bold text-purple-600 hover:text-purple-700 transition-colors cursor-pointer flex items-center gap-1"
        >
          <span>Ver todo</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Segmented Sub-Tabs */}
      <div
        className="flex items-center p-1 bg-stone-100/80 mb-4 text-xs font-semibold"
        style={{ borderRadius: tokens.innerRadius }}
      >
        <button
          onClick={() => setTab('mine')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all cursor-pointer ${
            tab === 'mine'
              ? 'bg-white text-stone-900 shadow-2xs font-bold'
              : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          <span>{currentAdultId === 'papa' ? '🌿' : '🌸'}</span>
          <span>Mis Hábitos</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-stone-100 text-stone-600">
            {myCompletedCount}/{myHabits.length}
          </span>
        </button>

        <button
          onClick={() => setTab('family')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all cursor-pointer ${
            tab === 'family'
              ? 'bg-white text-stone-900 shadow-2xs font-bold'
              : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          <Users className="w-3 h-3 text-sky-600" />
          <span>Familia</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-stone-100 text-stone-600">
            {familyCompletedCount}/{familyHabits.length}
          </span>
        </button>

        <button
          onClick={() => setTab('kids')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all cursor-pointer ${
            tab === 'kids'
              ? 'bg-white text-stone-900 shadow-2xs font-bold'
              : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          <Smile className="w-3 h-3 text-amber-500" />
          <span>Niños</span>
        </button>
      </div>

      {/* ==========================================
          TAB 1: MIS HÁBITOS
          ========================================== */}
      {tab === 'mine' && (
        <div className="space-y-3">
          {/* Progress row */}
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span className="font-semibold text-stone-700">
              {currentAdultId === 'mama' ? 'Hábitos de Mamá' : 'Hábitos de Papá'}
            </span>
            <span>
              {myCompletedCount} de {myHabits.length} completados hoy
            </span>
          </div>

          <div className="w-full bg-stone-200/60 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-1.5 rounded-full transition-all duration-500 bg-purple-600"
              style={{
                width: `${myHabits.length > 0 ? (myCompletedCount / myHabits.length) * 100 : 0}%`,
              }}
            />
          </div>

          {/* List of quick habits */}
          {myHabits.length === 0 ? (
            <p className="text-xs text-stone-400 py-3 text-center italic">
              No tienes hábitos personales asignados todavía.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-2 pt-1">
              {myHabits.map((habit) => {
                const isDone = habit.completedDates.includes(todayStr);
                const streak = calculateStreak(habit.completedDates, todayStr);
                const meta = getCategoryMetadata(habit.category || 'other');

                return (
                  <div
                    key={habit.id}
                    onClick={() => toggleHabitForToday(habit.id, todayStr)}
                    className={`p-2.5 flex items-center justify-between gap-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                      isDone
                        ? 'bg-emerald-50/70 border-emerald-200/80 text-emerald-900'
                        : 'bg-white border-stone-200/70 hover:border-purple-200 text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button type="button" className="text-stone-300">
                        {isDone ? (
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Circle className="w-4 h-4 text-stone-300" />
                        )}
                      </button>
                      <span className="text-xs">{meta.emoji}</span>
                      <span
                        className={`text-xs font-semibold truncate ${
                          isDone ? 'line-through text-stone-400' : 'text-stone-800'
                        }`}
                      >
                        {habit.title}
                      </span>
                    </div>

                    {streak > 0 && (
                      <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200/50 flex-shrink-0">
                        <Flame className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                        {streak}d
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==========================================
          TAB 2: FAMILIA
          ========================================== */}
      {tab === 'family' && (
        <div className="space-y-3">
          {/* Progress row */}
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span className="font-semibold text-stone-700">Hábitos compartidos</span>
            <span>
              {familyCompletedCount} de {familyHabits.length} completados hoy
            </span>
          </div>

          <div className="w-full bg-stone-200/60 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-1.5 rounded-full transition-all duration-500 bg-sky-500"
              style={{
                width: `${
                  familyHabits.length > 0 ? (familyCompletedCount / familyHabits.length) * 100 : 0
                }%`,
              }}
            />
          </div>

          {/* List of quick family habits */}
          {familyHabits.length === 0 ? (
            <p className="text-xs text-stone-400 py-3 text-center italic">
              No hay hábitos familiares activos.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-2 pt-1">
              {familyHabits.map((habit) => {
                const isDone = habit.completedDates.includes(todayStr);
                const streak = calculateStreak(habit.completedDates, todayStr);
                const meta = getCategoryMetadata(habit.category || 'other');

                return (
                  <div
                    key={habit.id}
                    onClick={() => toggleHabitForToday(habit.id, todayStr)}
                    className={`p-2.5 flex items-center justify-between gap-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                      isDone
                        ? 'bg-emerald-50/70 border-emerald-200/80 text-emerald-900'
                        : 'bg-white border-stone-200/70 hover:border-sky-200 text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button type="button" className="text-stone-300">
                        {isDone ? (
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Circle className="w-4 h-4 text-stone-300" />
                        )}
                      </button>
                      <span className="text-xs">{meta.emoji}</span>
                      <span
                        className={`text-xs font-semibold truncate ${
                          isDone ? 'line-through text-stone-400' : 'text-stone-800'
                        }`}
                      >
                        {habit.title}
                      </span>
                    </div>

                    {streak > 0 && (
                      <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200/50 flex-shrink-0">
                        <Flame className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                        {streak}d
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==========================================
          TAB 3: NIÑOS (CONSERVANDO 100% EXPERIENCIA)
          ========================================== */}
      {tab === 'kids' && (
        <div className="space-y-4">
          {/* Quote Banner */}
          <div
            className="p-2.5 flex items-center gap-2.5 transition-all"
            style={{
              backgroundColor: tokens.surfaceSecondary,
              border: isMinimalista ? '1px solid #e4e4e7' : '1px solid rgba(168, 85, 247, 0.2)',
              borderRadius: tokens.innerRadius,
            }}
          >
            <span className="text-lg">🌱</span>
            <p className="text-[11px] font-medium text-stone-700 italic truncate">
              "{config.kidInterface.positiveQuote}"
            </p>
          </div>

          {/* Children list */}
          <div className="space-y-3">
            {childrenMembers.map((child) => {
              const childHabits = habits.filter(
                (h) => h.active !== false && (h.childId === child.id || h.memberId === child.id)
              );
              const completedCount = childHabits.filter((h) =>
                h.completedDates.includes(todayStr)
              ).length;
              const percent = childHabits.length > 0 ? (completedCount / childHabits.length) * 100 : 0;

              return (
                <div
                  key={child.id}
                  className="p-3 transition-all"
                  style={{
                    backgroundColor: tokens.itemBg,
                    border: tokens.itemBorder,
                    borderRadius: tokens.innerRadius,
                    boxShadow: isMinimalista
                      ? 'none'
                      : isPremium
                      ? '0 2px 8px -2px rgba(28,25,23,0.06)'
                      : undefined,
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Avatar
                        name={child.name}
                        emoji={child.avatarEmoji}
                        color={child.avatarColor}
                        size="sm"
                      />
                      <div>
                        <span className="text-xs font-bold text-stone-900">{child.name}</span>
                        <span className="text-[10px] text-stone-400 block">
                          {completedCount} de {childHabits.length} completados hoy
                        </span>
                      </div>
                    </div>

                    <div
                      className="flex items-center gap-1 px-2 py-0.5 bg-amber-100/70 text-amber-800 text-[11px] font-bold"
                      style={{ borderRadius: tokens.badgeRadius }}
                    >
                      <Trophy className="w-3 h-3 text-amber-600" />
                      <span>{child.points} pts</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-stone-200/60 rounded-full h-1.5 mb-2.5 overflow-hidden">
                    <div
                      className="h-1.5 rounded-full transition-all duration-500"
                      style={{
                        width: `${percent}%`,
                        backgroundColor: tokens.primary,
                      }}
                    />
                  </div>

                  {/* Habits quick toggles */}
                  <div className="flex flex-wrap gap-1.5">
                    {childHabits.map((habit) => {
                      const isDone = habit.completedDates.includes(todayStr);
                      return (
                        <button
                          key={habit.id}
                          onClick={() => toggleHabitForToday(habit.id, todayStr)}
                          className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold border transition-all cursor-pointer ${
                            isDone
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                          }`}
                          style={{ borderRadius: isMinimalista ? '0.375rem' : tokens.badgeRadius }}
                        >
                          {isDone ? (
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Circle className="w-3 h-3 text-stone-400" />
                          )}
                          <span className="truncate max-w-[130px]">{habit.title}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
