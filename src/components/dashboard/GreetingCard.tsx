import React from 'react';
import { useFamily } from '../../context/FamilyContext';
import { useTheme } from '../../context/ThemeContext';
import { getGreeting } from '../../services/dateUtils';
import { Timer, ArrowRight, Sparkles, CheckSquare, HeartPulse, ShoppingCart, Feather, Home, Sun } from 'lucide-react';

export const GreetingCard: React.FC = () => {
  const {
    activeMember,
    setFamilyResetModalOpen,
    tasks,
    appointments,
    shoppingItems,
    config,
  } = useFamily();
  const { tokens, isPremium, isMinimalista, isFamiliar, isAlegre } = useTheme();

  const greeting = getGreeting();
  const userName = activeMember ? activeMember.name : 'Familia';

  const pendingTasks = tasks.filter((t) => t.status !== 'completed').length;
  const upcomingAppointments = appointments.filter((a) => a.status === 'upcoming').length;
  const urgentShopping = shoppingItems.filter((s) => !s.completed && s.urgent).length;
  const totalAttentionCount = pendingTasks + urgentShopping + (upcomingAppointments > 0 ? 1 : 0);

  const styleBadgeIcon = () => {
    if (isPremium) return <Sparkles className="w-3.5 h-3.5 text-amber-300" />;
    if (isMinimalista) return <Feather className="w-3.5 h-3.5 text-stone-500" />;
    if (isFamiliar) return <Home className="w-3.5 h-3.5 text-amber-200" />;
    if (isAlegre) return <Sun className="w-3.5 h-3.5 text-amber-200" />;
    return <Sparkles className="w-3.5 h-3.5 text-amber-200" />;
  };

  return (
    <div className="space-y-4">
      {/* Dynamic Theme Banner */}
      <div
        className="p-5 sm:p-7 relative overflow-hidden transition-all duration-300"
        style={{
          background: tokens.banner.background,
          color: tokens.banner.textColor,
          borderRadius: tokens.cardRadius,
          border: tokens.banner.border,
          boxShadow: tokens.banner.shadow,
        }}
      >
        {/* Style-specific atmospheric details */}
        {isPremium && (
          <>
            <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-amber-400/10 blur-xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-44 h-44 rounded-full bg-black/20 blur-lg pointer-events-none" />
            <div className="absolute top-3 right-6 text-amber-300/30 text-[10px] font-mono tracking-widest uppercase hidden sm:block">
              MELOMUS · LUXE
            </div>
          </>
        )}
        {isFamiliar && (
          <>
            <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-amber-400/15 blur-xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-44 h-44 rounded-full bg-orange-400/20 blur-lg pointer-events-none" />
          </>
        )}
        {isAlegre && (
          <>
            <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-yellow-300/25 blur-lg pointer-events-none" />
            <div className="absolute -bottom-8 -left-8 w-44 h-44 rounded-full bg-pink-400/20 blur-lg pointer-events-none" />
          </>
        )}

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold mb-2 transition-all"
              style={{
                backgroundColor: tokens.banner.badgeBg,
                color: tokens.banner.badgeTextColor,
                borderRadius: tokens.badgeRadius,
                border: isMinimalista ? '1px solid #e4e4e7' : '1px solid rgba(255,255,255,0.2)',
              }}
            >
              {styleBadgeIcon()}
              <span>Hogar dulce hogar · {config.familyName}</span>
            </div>

            <h2
              className={`text-2xl sm:text-3xl lg:text-4xl tracking-tight leading-tight ${
                isMinimalista ? 'font-extrabold text-stone-900' : 'font-black text-white'
              }`}
            >
              {greeting}, <span className="underline decoration-white/40 decoration-wavy decoration-2">{userName}</span>! 👋
            </h2>

            <p
              className="text-xs sm:text-sm mt-1 max-w-lg font-medium leading-relaxed"
              style={{ color: tokens.banner.subtitleColor }}
            >
              {totalAttentionCount > 0
                ? `Hoy tenemos ${totalAttentionCount} ${totalAttentionCount === 1 ? 'cosa que necesita atención' : 'cosas que necesitan atención'} para mantener el hogar en armonía.`
                : 'Todo se encuentra al día y en calma en casa. ¡Gran trabajo en equipo!'}
            </p>
          </div>

          {/* Quick Action: Family Reset Sprint */}
          <div className="shrink-0 flex items-center gap-2">
            <button
              onClick={() => setFamilyResetModalOpen(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-4 sm:px-5 py-3 font-bold text-xs sm:text-sm transition-all transform hover:scale-102 active:scale-98 cursor-pointer"
              style={{
                backgroundColor: tokens.banner.buttonBg,
                color: tokens.banner.buttonTextColor,
                borderRadius: tokens.buttonRadius,
                border: isMinimalista ? '1px solid #e4e4e7' : isPremium ? '1px solid rgba(245, 158, 11, 0.4)' : undefined,
                boxShadow: isMinimalista ? 'none' : isPremium ? '0 4px 14px -2px rgba(0, 0, 0, 0.25)' : tokens.buttonShadow,
              }}
            >
              <div
                className="p-1.5 rounded-xl flex items-center justify-center"
                style={{
                  backgroundColor: isMinimalista ? '#f4f4f5' : tokens.primary,
                  color: isMinimalista ? '#18181b' : '#ffffff',
                }}
              >
                <Timer className="w-4 h-4 animate-pulse" />
              </div>
              <div className="text-left">
                <span className="block leading-none font-bold">Reset Familiar</span>
                <span className="text-[10px] opacity-75 font-normal">10 min de orden</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 opacity-60 ml-1" />
            </button>
          </div>
        </div>

        {/* Quick count pills */}
        <div
          className={`relative z-10 grid grid-cols-3 gap-2 sm:gap-4 mt-5 pt-4 ${
            isMinimalista ? 'border-t border-stone-200' : 'border-t border-white/20'
          }`}
        >
          <div
            className="p-2.5 text-center transition-all"
            style={{
              backgroundColor: tokens.banner.metricCardBg,
              borderRadius: isMinimalista ? '0.5rem' : tokens.badgeRadius,
              border: tokens.banner.metricBorder,
            }}
          >
            <div className="flex items-center justify-center gap-1.5 mb-0.5">
              <CheckSquare className="w-3.5 h-3.5 opacity-80" />
              <span
                className="text-xl sm:text-2xl font-black block leading-none"
                style={{ color: tokens.banner.metricTextColor }}
              >
                {pendingTasks}
              </span>
            </div>
            <span
              className="text-[10px] sm:text-xs font-medium block"
              style={{ color: tokens.banner.subtitleColor }}
            >
              Tareas pendientes
            </span>
          </div>

          <div
            className="p-2.5 text-center transition-all"
            style={{
              backgroundColor: tokens.banner.metricCardBg,
              borderRadius: isMinimalista ? '0.5rem' : tokens.badgeRadius,
              border: tokens.banner.metricBorder,
            }}
          >
            <div className="flex items-center justify-center gap-1.5 mb-0.5">
              <HeartPulse className="w-3.5 h-3.5 opacity-80" />
              <span
                className="text-xl sm:text-2xl font-black block leading-none"
                style={{ color: tokens.banner.metricTextColor }}
              >
                {upcomingAppointments}
              </span>
            </div>
            <span
              className="text-[10px] sm:text-xs font-medium block"
              style={{ color: tokens.banner.subtitleColor }}
            >
              Citas médicas
            </span>
          </div>

          <div
            className="p-2.5 text-center transition-all"
            style={{
              backgroundColor: tokens.banner.metricCardBg,
              borderRadius: isMinimalista ? '0.5rem' : tokens.badgeRadius,
              border: tokens.banner.metricBorder,
            }}
          >
            <div className="flex items-center justify-center gap-1.5 mb-0.5">
              <ShoppingCart className="w-3.5 h-3.5 opacity-80" />
              <span
                className="text-xl sm:text-2xl font-black block leading-none"
                style={{ color: tokens.banner.metricTextColor }}
              >
                {urgentShopping}
              </span>
            </div>
            <span
              className="text-[10px] sm:text-xs font-medium block"
              style={{ color: tokens.banner.subtitleColor }}
            >
              Compras urgentes
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
