import React, { useState, useEffect } from 'react';
import { useFamily } from '../../context/FamilyContext';
import { notificationService } from '../../services/notificationService';
import { buildGoogleCalendarUrl, reminderToExport } from '../../services/googleCalendar';
import {
  Bell,
  CheckCircle2,
  Circle,
  Trash2,
  Plus,
  ExternalLink,
  Settings,
  X,
  Clock,
  Shield,
  Calendar,
  Sparkles,
} from 'lucide-react';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({ isOpen, onClose }) => {
  const {
    reminders,
    toggleReminderCompleted,
    deleteReminder,
    activeProfileId,
    isAdultView,
    members,
    setCurrentTab,
    setQuickActionModalOpen,
    notificationPreferences,
    currentUser,
    familyAccount,
  } = useFamily();

  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [permStatus, setPermStatus] = useState<NotificationPermission>(() =>
    notificationService.getPermissionStatus()
  );

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Filter reminders respecting privacy & profile
  const adultKey = activeProfileId === 'papa' ? 'papa' : 'mama';
  const prefs = isAdultView ? notificationPreferences[adultKey] : undefined;

  const filteredReminders = reminders.filter((r) => {
    // 1. Completion filter
    if (activeTab === 'pending' && r.completed) return false;
    if (activeTab === 'completed' && !r.completed) return false;

    // 2. Kid view privacy filter
    if (!isAdultView) {
      return r.responsibleId === activeProfileId;
    }

    // 3. Adult view privacy filter
    if (r.isPrivate && r.responsibleId !== adultKey && r.responsibleId !== 'both' && r.responsibleId !== 'family') {
      return false;
    }

    // Adult sees items assigned to them, both, family, or children
    return (
      r.responsibleId === adultKey ||
      r.responsibleId === 'both' ||
      r.responsibleId === 'family' ||
      members.some((m) => m.id === r.responsibleId && m.role === 'child')
    );
  });

  const pendingCount = reminders.filter((r) => {
    if (r.completed) return false;
    if (!isAdultView) return r.responsibleId === activeProfileId;
    if (r.isPrivate && r.responsibleId !== adultKey && r.responsibleId !== 'both' && r.responsibleId !== 'family') {
      return false;
    }
    return (
      r.responsibleId === adultKey ||
      r.responsibleId === 'both' ||
      r.responsibleId === 'family' ||
      members.some((m) => m.id === r.responsibleId && m.role === 'child')
    );
  }).length;

  const getCategoryEmoji = (category: string) => {
    switch (category) {
      case 'tasks':
        return '📝';
      case 'events':
        return '📅';
      case 'appointments':
        return '🏥';
      case 'medications':
        return '💊';
      case 'shopping':
        return '🛒';
      case 'habits':
        return '🌱';
      case 'finance':
        return '💰';
      case 'couple':
        return '💕';
      case 'cuquiTime':
        return '🔒';
      default:
        return '🔔';
    }
  };

  const getAnticipationLabel = (ant: string) => {
    switch (ant) {
      case '5_min':
        return '5m antes';
      case '15_min':
        return '15m antes';
      case '30_min':
        return '30m antes';
      case '1_hour':
        return '1h antes';
      case '1_day':
        return '24h antes';
      default:
        return 'Al momento';
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs z-50 animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 bottom-0 w-full sm:max-w-md h-[100dvh] bg-white z-50 shadow-2xl flex flex-col border-l border-stone-200 animate-in slide-in-from-right duration-250">
        {/* Header with Safe Area Inset Top */}
        <div className="px-4 pt-[max(1rem,env(safe-area-inset-top,0px))] pb-3.5 border-b border-stone-100 flex items-center justify-between gap-3 bg-stone-50/70 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-stone-900 truncate">Recordatorios</h3>
                {pendingCount > 0 && (
                  <span className="text-[11px] font-bold bg-amber-500 text-white px-2 py-0.5 rounded-full shrink-0">
                    {pendingCount}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-stone-500 truncate">
                {isAdultView ? `Para ${adultKey === 'mama' ? 'Mamá' : 'Papá'} y la familia` : 'Tus deberes y hábitos'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {isAdultView && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  setCurrentTab('settings');
                }}
                className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-xl transition-colors cursor-pointer"
                title="Ajustes de Notificaciones"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Permission Callout if default */}
        {permStatus !== 'granted' && isAdultView && (
          <div className="p-3 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <Shield className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="text-[11px] font-medium leading-tight truncate">
                Notificaciones del navegador inactivas.
              </span>
            </div>
            <button
              type="button"
              onClick={async () => {
                const res = await notificationService.requestPermission();
                setPermStatus(res);
                if (res === 'granted' && currentUser?.id && familyAccount?.id) {
                  const sub = await notificationService.subscribeToPush();
                  if (sub) {
                    await notificationService.savePushSubscription(currentUser.id, familyAccount.id, sub);
                  }
                }
              }}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-bold cursor-pointer whitespace-nowrap shrink-0"
            >
              Activar
            </button>
          </div>
        )}

        {/* Quick action button & Tabs */}
        <div className="p-3 border-b border-stone-100 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1 p-0.5 bg-stone-100 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('pending')}
              className={`px-2.5 sm:px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'pending'
                  ? 'bg-white text-stone-900 shadow-2xs font-bold'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              Pendientes ({pendingCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('completed')}
              className={`px-2.5 sm:px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'completed'
                  ? 'bg-white text-stone-900 shadow-2xs font-bold'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              Listos
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              setQuickActionModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-2xs transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nuevo</span>
          </button>
        </div>

        {/* Reminders List */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-2.5 overscroll-contain">
          {filteredReminders.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-14 h-14 mx-auto rounded-3xl bg-amber-50 text-amber-500 flex items-center justify-center text-2xl mb-3">
                <Sparkles className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-bold text-stone-900">
                {activeTab === 'pending' ? '¡Todo al día y en calma!' : 'Sin recordatorios completados'}
              </h4>
              <p className="text-xs text-stone-500 max-w-xs mx-auto mt-1">
                {activeTab === 'pending'
                  ? 'No tienes recordatorios pendientes para esta vista. Toca "+ Nuevo" para agendar uno rápido.'
                  : 'Los recordatorios que vayas completando aparecerán aquí.'}
              </p>
            </div>
          ) : (
            filteredReminders.map((rem) => {
              const targetMember = members.find((m) => m.id === rem.responsibleId);
              const isDiscrete = prefs?.discreteMode;

              const displayTitle =
                isDiscrete && rem.category
                  ? notificationService.formatDiscreteText(rem.category, rem.title).title
                  : rem.title;

              return (
                <div
                  key={rem.id}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    rem.completed
                      ? 'bg-stone-50/70 border-stone-200/60 opacity-60'
                      : 'bg-white border-stone-200 shadow-2xs hover:border-amber-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => toggleReminderCompleted(rem.id)}
                      className="mt-0.5 text-stone-400 hover:text-amber-500 cursor-pointer shrink-0 transition-colors"
                    >
                      {rem.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <Circle className="w-5 h-5 text-stone-300 hover:text-amber-500" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm">{getCategoryEmoji(rem.category)}</span>
                        <h5
                          className={`text-xs font-bold text-stone-900 truncate ${
                            rem.completed ? 'line-through text-stone-400' : ''
                          }`}
                        >
                          {displayTitle}
                        </h5>
                      </div>

                      {rem.notes && !isDiscrete && (
                        <p className="text-[11px] text-stone-500 mt-1 line-clamp-2">
                          {rem.notes}
                        </p>
                      )}

                      <div className="flex items-center gap-2 mt-2 flex-wrap text-[10px] text-stone-400">
                        <span className="flex items-center gap-1 font-semibold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md">
                          <Calendar className="w-3 h-3 text-stone-400" />
                          {rem.date}
                        </span>
                        <span className="flex items-center gap-1 font-semibold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md">
                          <Clock className="w-3 h-3 text-stone-400" />
                          {rem.time}
                        </span>
                        <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md font-medium">
                          🔔 {getAnticipationLabel(rem.anticipation)}
                        </span>
                        {targetMember && (
                          <span className="font-semibold text-stone-500">
                            {targetMember.avatarEmoji} {targetMember.name}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <a
                        href={buildGoogleCalendarUrl(reminderToExport(rem))}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-stone-300 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                        title="Agregar a Google Calendar"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        type="button"
                        onClick={() => deleteReminder(rem.id)}
                        className="p-1.5 text-stone-300 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Eliminar recordatorio"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info with Safe Area Inset Bottom */}
        <div className="px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom,0px))] bg-stone-50/80 border-t border-stone-100 text-[11px] text-stone-400 text-center shrink-0">
          MELOMUS — Organiza tu hogar, conecta a tu familia y simplifica tu día 🏡
        </div>
      </div>
    </>
  );
};
