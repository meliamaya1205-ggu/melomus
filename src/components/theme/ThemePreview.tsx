import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import {
  Sparkles,
  CheckCircle2,
  Circle,
  ArrowRight,
  Heart,
  Feather,
  Home,
  Sun,
  Smile,
  CheckSquare,
  HeartPulse,
  ShoppingCart,
} from 'lucide-react';

interface ThemePreviewProps {
  memberName?: string;
  className?: string;
}

export const ThemePreview: React.FC<ThemePreviewProps> = ({
  memberName = 'Mamá',
  className = '',
}) => {
  const {
    tokens,
    themeStyle,
    themeColor,
    isPremium,
    isMinimalista,
    isFamiliar,
    isAlegre,
  } = useTheme();
  const [sampleChecked, setSampleChecked] = useState(false);

  // Style badge config
  const styleBadge = () => {
    if (isPremium) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-200 border border-amber-400/30 text-[11px] font-semibold tracking-wide">
          <Sparkles className="w-3 h-3 text-amber-300" />
          <span>✨ PREMIUM · {themeColor.toUpperCase()}</span>
        </span>
      );
    }
    if (isMinimalista) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-stone-100 text-stone-700 border border-stone-200 text-[11px] font-medium tracking-tight">
          <Feather className="w-3 h-3 text-stone-500" />
          <span>🫧 MINIMALISTA · {themeColor.toUpperCase()}</span>
        </span>
      );
    }
    if (isFamiliar) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/25 text-white border border-white/30 text-[11px] font-bold">
          <Home className="w-3 h-3" />
          <span>🏡 FAMILIAR · {themeColor.toUpperCase()}</span>
        </span>
      );
    }
    if (isAlegre) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/30 text-white border border-white/40 text-[11px] font-black shadow-xs">
          <Sun className="w-3.5 h-3.5 text-amber-200 animate-spin-slow" />
          <span>🌈 ALEGRE · {themeColor.toUpperCase()}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/30 text-white text-[11px] font-bold">
        <Smile className="w-3.5 h-3.5" />
        <span>🧸 {themeStyle.toUpperCase()} · {themeColor.toUpperCase()}</span>
      </span>
    );
  };

  return (
    <div
      className={`theme-card p-5 sm:p-6 transition-all duration-300 relative overflow-hidden select-none ${className}`}
      style={{
        backgroundColor: tokens.cardBg,
        borderColor: isPremium ? '#e4dfd7' : isMinimalista ? '#e4e4e7' : isAlegre ? '#fed7aa' : tokens.cardBorder,
        borderRadius: tokens.cardRadius,
        boxShadow: tokens.cardShadow,
      }}
    >
      {/* 1. Sample Hero Banner */}
      <div
        className="p-5 relative overflow-hidden mb-4 transition-all duration-300"
        style={{
          background: tokens.banner.background,
          color: tokens.banner.textColor,
          borderRadius: tokens.innerRadius,
          border: tokens.banner.border,
          boxShadow: tokens.banner.shadow,
        }}
      >
        {/* Decorative elements based on style */}
        {isPremium && (
          <>
            <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-amber-400/10 blur-xl pointer-events-none" />
            <div className="absolute top-2 right-4 text-amber-300/30 text-xs font-mono tracking-widest uppercase">
              LUXE COLLECTION
            </div>
          </>
        )}
        {isFamiliar && (
          <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-orange-400/20 blur-xl pointer-events-none" />
        )}
        {isAlegre && (
          <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-yellow-300/30 blur-lg pointer-events-none" />
        )}

        <div className="relative z-10 flex items-start justify-between gap-3">
          <div>
            <div className="mb-2">{styleBadge()}</div>
            <h3
              className={`text-xl sm:text-2xl font-black tracking-tight leading-tight ${
                isMinimalista ? 'text-stone-900 font-extrabold' : 'text-white'
              }`}
            >
              ¡Hola, {memberName}! 👋
            </h3>
            <p
              className="text-xs sm:text-sm mt-1 max-w-sm font-medium"
              style={{ color: tokens.banner.subtitleColor }}
            >
              {isMinimalista
                ? '3 prioridades programadas para hoy.'
                : isPremium
                ? 'Tu hogar en armonía y con balance ejecutivo impecable.'
                : isAlegre
                ? '¡Hoy es un día brillante para lograrlo todo en equipo! ✨'
                : 'Todo se encuentra al día y en calma en casa.'}
            </p>
          </div>

          <div className="hidden xs:block text-right">
            <span
              className="text-[10px] uppercase font-bold tracking-wider block"
              style={{ color: tokens.banner.subtitleColor }}
            >
              Estado
            </span>
            <span
              className="text-xs sm:text-sm font-black"
              style={{ color: isMinimalista ? tokens.primary : '#ffffff' }}
            >
              {isMinimalista ? 'Al día' : '100% en orden'}
            </span>
          </div>
        </div>

        {/* Metric Pills */}
        <div
          className={`grid grid-cols-3 gap-2 mt-4 pt-3 ${
            isMinimalista ? 'border-t border-stone-200' : 'border-t border-white/20'
          }`}
        >
          <div
            className="p-2 text-center transition-all"
            style={{
              backgroundColor: tokens.banner.metricCardBg,
              borderRadius: isMinimalista ? '0.375rem' : tokens.badgeRadius,
              border: tokens.banner.metricBorder,
            }}
          >
            <div className="flex items-center justify-center gap-1">
              <CheckSquare className="w-3.5 h-3.5 opacity-80" />
              <span className="text-base font-black leading-none" style={{ color: tokens.banner.metricTextColor }}>
                4
              </span>
            </div>
            <span className="text-[10px] opacity-80 block mt-0.5 font-medium">Tareas</span>
          </div>

          <div
            className="p-2 text-center transition-all"
            style={{
              backgroundColor: tokens.banner.metricCardBg,
              borderRadius: isMinimalista ? '0.375rem' : tokens.badgeRadius,
              border: tokens.banner.metricBorder,
            }}
          >
            <div className="flex items-center justify-center gap-1">
              <HeartPulse className="w-3.5 h-3.5 opacity-80" />
              <span className="text-base font-black leading-none" style={{ color: tokens.banner.metricTextColor }}>
                1
              </span>
            </div>
            <span className="text-[10px] opacity-80 block mt-0.5 font-medium">Cita médica</span>
          </div>

          <div
            className="p-2 text-center transition-all"
            style={{
              backgroundColor: tokens.banner.metricCardBg,
              borderRadius: isMinimalista ? '0.375rem' : tokens.badgeRadius,
              border: tokens.banner.metricBorder,
            }}
          >
            <div className="flex items-center justify-center gap-1">
              <ShoppingCart className="w-3.5 h-3.5 opacity-80" />
              <span className="text-base font-black leading-none" style={{ color: tokens.banner.metricTextColor }}>
                2
              </span>
            </div>
            <span className="text-[10px] opacity-80 block mt-0.5 font-medium">Compras</span>
          </div>
        </div>
      </div>

      {/* 2. Interactive Sample Task */}
      <div className="space-y-3">
        <div
          onClick={() => setSampleChecked(!sampleChecked)}
          className={`flex items-center justify-between p-3.5 border transition-all cursor-pointer ${
            isPremium ? 'shadow-xs' : ''
          }`}
          style={{
            backgroundColor: isMinimalista ? '#ffffff' : tokens.itemBg,
            borderColor: isMinimalista ? '#f4f4f5' : isPremium ? '#ede8e1' : tokens.itemBorder,
            borderRadius: tokens.innerRadius,
            boxShadow: isPremium ? '0 2px 8px -2px rgba(28,25,23,0.06)' : undefined,
          }}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              type="button"
              className="transition-transform active:scale-90"
              style={{ color: tokens.primary }}
            >
              {sampleChecked ? (
                <CheckCircle2 className="w-5 h-5 fill-current text-white" style={{ color: tokens.primary }} />
              ) : (
                <Circle className="w-5 h-5" style={{ color: tokens.primary }} />
              )}
            </button>
            <div className="min-w-0 flex-1">
              <p
                className={`text-xs font-bold leading-tight truncate ${
                  sampleChecked ? 'line-through text-stone-400' : 'text-stone-900'
                }`}
              >
                Comprar materiales escolares para la semana
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className="text-[10px] font-bold px-2 py-0.5"
                  style={{
                    backgroundColor: tokens.primarySoft,
                    color: tokens.primary,
                    borderRadius: tokens.badgeRadius,
                  }}
                >
                  Urgente
                </span>
                <span className="text-[11px] text-stone-400 font-medium">
                  Hoy · 17:30
                </span>
              </div>
            </div>
          </div>

          <div
            className="w-7 h-7 flex items-center justify-center text-xs font-bold text-white shrink-0 ml-2"
            style={{
              backgroundColor: tokens.primary,
              borderRadius: isMinimalista ? '0.375rem' : tokens.buttonRadius,
            }}
          >
            M
          </div>
        </div>

        {/* 3. Sample Action Buttons */}
        <div className="flex items-center gap-2.5 pt-1">
          <button
            type="button"
            className="flex-1 py-2.5 px-4 text-xs font-bold text-white transition-all flex items-center justify-center gap-2 cursor-pointer"
            style={{
              backgroundColor: isMinimalista ? '#18181b' : tokens.primary,
              borderRadius: tokens.buttonRadius,
              boxShadow: isMinimalista ? 'none' : isPremium ? '0 4px 14px -2px rgba(28,25,23,0.2)' : tokens.buttonShadow,
            }}
          >
            <span>Botón Principal</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            className="py-2.5 px-3.5 text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer"
            style={{
              backgroundColor: tokens.surface,
              borderColor: isPremium ? 'rgba(217, 119, 6, 0.4)' : isMinimalista ? '#e4e4e7' : tokens.border,
              color: isPremium ? '#78350f' : tokens.textMain,
              borderRadius: tokens.buttonRadius,
            }}
          >
            <Heart className="w-3.5 h-3.5" style={{ color: tokens.primary }} />
            <span>Favorito</span>
          </button>
        </div>
      </div>
    </div>
  );
};
