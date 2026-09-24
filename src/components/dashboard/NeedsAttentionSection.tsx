import React from 'react';
import { useFamily } from '../../context/FamilyContext';
import { useTheme } from '../../context/ThemeContext';
import { Avatar } from '../common/Avatar';
import { formatFriendlyDate, getTodayString } from '../../services/dateUtils';
import {
  AlertCircle,
  Circle,
  ShoppingCart,
  HeartPulse,
  Sparkles,
  ArrowRight,
  CheckSquare,
} from 'lucide-react';

export const NeedsAttentionSection: React.FC = () => {
  const {
    tasks,
    toggleTaskComplete,
    shoppingItems,
    toggleShoppingItem,
    appointments,
    reminders,
    toggleReminderCompleted,
    getMember,
    activeProfileId,
    isAdultView,
    setCurrentTab,
  } = useFamily();
  const { tokens, isPremium, isMinimalista } = useTheme();

  const todayStr = getTodayString();
  const adultKey = activeProfileId === 'papa' ? 'papa' : 'mama';

  // 1. Critical Tasks (high priority or in progress)
  const criticalTasks = tasks
    .filter((t) => {
      if (t.status === 'completed') return false;
      if (!isAdultView && t.responsibleId !== activeProfileId) return false;
      return t.priority === 'high' || t.status === 'in_progress' || (t.date === todayStr && t.priority === 'medium');
    })
    .map((t) => {
      const member = getMember(t.responsibleId);
      return {
        id: `task-${t.id}`,
        title: t.title,
        context: `${member ? member.name : 'Familia'} · ${t.time ? t.time : 'Hoy'}`,
        member,
        completed: false,
        onToggle: () => toggleTaskComplete(t.id),
        type: 'task' as const,
        priority: t.priority,
        badgeText: 'Tarea prioritaria',
        badgeBg: 'bg-rose-50 text-rose-700 border-rose-200/60',
      };
    });

  // 2. Urgent Shopping Items
  const urgentShopping = shoppingItems
    .filter((s) => !s.completed && s.urgent)
    .map((s) => ({
      id: `shop-${s.id}`,
      title: s.name,
      context: `Despensa ${s.quantity ? `(${s.quantity})` : ''} · Para comprar hoy`,
      member: undefined,
      completed: false,
      onToggle: () => toggleShoppingItem(s.id),
      type: 'shopping' as const,
      priority: 'high' as const,
      badgeText: 'Compra urgente',
      badgeBg: 'bg-amber-50 text-amber-800 border-amber-200/60',
    }));

  // 3. Imminent Medical Appointments (Upcoming)
  const imminentAppointments = appointments
    .filter((a) => a.status === 'upcoming')
    .slice(0, 1)
    .map((a) => {
      const member = getMember(a.memberId);
      return {
        id: `app-${a.id}`,
        title: `Cita: ${a.professional}`,
        context: `${member ? member.name : 'Salud'} · ${formatFriendlyDate(a.date)} ${a.time ? `· ${a.time}` : ''}`,
        member,
        completed: false,
        onToggle: () => setCurrentTab('health'),
        type: 'appointment' as const,
        priority: 'high' as const,
        badgeText: 'Control médico',
        badgeBg: 'bg-sky-50 text-sky-800 border-sky-200/60',
      };
    });

  // 4. Today's Reminders
  const criticalReminders = reminders
    .filter((r) => {
      if (r.completed) return false;
      if (!isAdultView && r.responsibleId !== activeProfileId) return false;
      if (r.isPrivate && r.responsibleId !== adultKey && r.responsibleId !== 'both' && r.responsibleId !== 'family') {
        return false;
      }
      return r.date === todayStr;
    })
    .slice(0, 2)
    .map((r) => {
      const member = getMember(r.responsibleId);
      return {
        id: `rem-${r.id}`,
        title: r.title,
        context: `Recordatorio · ${r.time}`,
        member,
        completed: false,
        onToggle: () => toggleReminderCompleted(r.id),
        type: 'reminder' as const,
        priority: 'medium' as const,
        badgeText: 'Aviso del día',
        badgeBg: 'bg-purple-50 text-purple-800 border-purple-200/60',
      };
    });

  const allAttentionItems = [
    ...urgentShopping,
    ...criticalTasks,
    ...imminentAppointments,
    ...criticalReminders,
  ].slice(0, 4);

  return (
    <div
      className="theme-card p-5 space-y-4 transition-all duration-300"
      style={{
        backgroundColor: tokens.cardBg,
        border: tokens.cardBorder,
        borderRadius: tokens.cardRadius,
        boxShadow: tokens.cardShadow,
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="p-2 flex items-center justify-center text-white"
            style={{
              backgroundColor: tokens.primary,
              borderRadius: isMinimalista ? '0.375rem' : tokens.badgeRadius,
            }}
          >
            <AlertCircle className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-stone-900">
                Necesita tu atención
              </h3>
              {allAttentionItems.length > 0 && (
                <span
                  className="text-[10px] font-bold px-2 py-0.5"
                  style={{
                    backgroundColor: tokens.primarySoft,
                    color: tokens.primary,
                    borderRadius: tokens.badgeRadius,
                  }}
                >
                  {allAttentionItems.length} pendientes
                </span>
              )}
            </div>
            <p className="text-xs text-stone-400">
              Prioridades clave seleccionadas para resolver hoy
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setCurrentTab('tasks')}
          className="text-xs font-bold hover:underline transition-all flex items-center gap-1 cursor-pointer"
          style={{ color: tokens.primary }}
        >
          <span>Ver agenda</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {allAttentionItems.length === 0 ? (
        <div
          className="py-6 px-4 text-center border border-dashed border-stone-200"
          style={{
            backgroundColor: tokens.surfaceSecondary,
            borderRadius: tokens.innerRadius,
          }}
        >
          <div className="w-10 h-10 mx-auto rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
            <Sparkles className="w-5 h-5" />
          </div>
          <p className="text-xs font-bold text-stone-800">
            Todo en calma y al día
          </p>
          <p className="text-[11px] text-stone-500 mt-0.5">
            No tienes tareas urgentes ni compras críticas pendientes por atender en este momento.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {allAttentionItems.map((item) => (
            <div
              key={item.id}
              onClick={item.onToggle}
              className="p-3 transition-all flex items-center justify-between gap-3 cursor-pointer select-none group"
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
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                {/* Visual Icon / Avatar */}
                <div className="shrink-0">
                  {item.member ? (
                    <Avatar
                      name={item.member.name}
                      emoji={item.member.avatarEmoji}
                      color={item.member.avatarColor}
                      size="sm"
                    />
                  ) : item.type === 'shopping' ? (
                    <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                      <ShoppingCart className="w-4 h-4" />
                    </div>
                  ) : item.type === 'appointment' ? (
                    <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
                      <HeartPulse className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                      <CheckSquare className="w-4 h-4" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-stone-900 leading-snug truncate">
                    {item.title}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.2 border ${item.badgeBg}`}
                      style={{ borderRadius: tokens.badgeRadius }}
                    >
                      {item.badgeText}
                    </span>
                    <span className="text-[11px] text-stone-500 font-medium truncate">
                      {item.context}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Circle */}
              <button
                type="button"
                className="text-stone-400 group-hover:text-stone-700 transition-colors shrink-0"
              >
                {item.type === 'appointment' ? (
                  <ArrowRight className="w-4 h-4 text-sky-600" />
                ) : (
                  <Circle className="w-4 h-4" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
