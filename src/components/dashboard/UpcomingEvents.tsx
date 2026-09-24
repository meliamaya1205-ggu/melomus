import React from 'react';
import { useFamily } from '../../context/FamilyContext';
import { useTheme } from '../../context/ThemeContext';
import { Avatar } from '../common/Avatar';
import { Badge } from '../common/Badge';
import { Calendar, HeartPulse, Clock, MapPin } from 'lucide-react';
import { formatFriendlyDate } from '../../services/dateUtils';

export const UpcomingEvents: React.FC = () => {
  const { events, appointments, getMember, setCurrentTab } = useFamily();
  const { tokens, isPremium, isMinimalista } = useTheme();

  // Sort upcoming events
  const nextEvents = [...events].slice(0, 3);
  const nextAppointments = appointments
    .filter((a) => a.status === 'upcoming')
    .slice(0, 2);

  return (
    <div
      className="theme-card p-5 space-y-5 transition-all duration-300"
      style={{
        backgroundColor: tokens.cardBg,
        border: tokens.cardBorder,
        borderRadius: tokens.cardRadius,
        boxShadow: tokens.cardShadow,
      }}
    >
      {/* Citas Médicas / Salud */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className="p-2 bg-sky-50 text-sky-600 flex items-center justify-center"
              style={{ borderRadius: isMinimalista ? '0.375rem' : tokens.badgeRadius }}
            >
              <HeartPulse className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-800">Citas Médicas Próximas</h3>
              <p className="text-xs text-stone-400">Controles y especialistas</p>
            </div>
          </div>
          <button
            onClick={() => setCurrentTab('health')}
            className="text-xs font-bold text-sky-600 hover:text-sky-700 transition-colors cursor-pointer"
          >
            Ver salud →
          </button>
        </div>

        {nextAppointments.length === 0 ? (
          <p
            className="text-xs text-stone-400 p-3 border border-dashed border-stone-200 text-center"
            style={{
              backgroundColor: tokens.surfaceSecondary,
              borderRadius: tokens.innerRadius,
            }}
          >
            No hay citas médicas agendadas para los próximos días
          </p>
        ) : (
          <div className="space-y-2">
            {nextAppointments.map((app) => {
              const member = getMember(app.memberId);
              return (
                <div
                  key={app.id}
                  className="p-3 transition-colors"
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
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <Avatar
                        name={member ? member.name : 'Familia'}
                        emoji={member?.avatarEmoji}
                        color={member?.avatarColor}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-stone-900">
                            {member ? member.name : 'Familiar'}
                          </span>
                          <Badge variant="info" size="sm">
                            {app.time}
                          </Badge>
                          <span className="text-[11px] font-medium text-stone-500">
                            {formatFriendlyDate(app.date)}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-sky-950 mt-1 truncate">
                          {app.professional}
                        </p>
                        <p className="text-[11px] text-stone-500 flex items-center gap-1 mt-0.5 truncate">
                          <MapPin className="w-3 h-3 text-stone-400 shrink-0" />
                          <span className="truncate">{app.location}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Próximos Eventos */}
      <div className="pt-2 border-t border-stone-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className="p-2 bg-amber-50 text-amber-600 flex items-center justify-center"
              style={{ borderRadius: isMinimalista ? '0.375rem' : tokens.badgeRadius }}
            >
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-800">Próximos Eventos</h3>
              <p className="text-xs text-stone-400">Colegio y compromisos</p>
            </div>
          </div>
          <button
            onClick={() => setCurrentTab('calendar')}
            className="text-xs font-bold text-amber-600 hover:text-amber-700 transition-colors cursor-pointer"
          >
            Ver calendario →
          </button>
        </div>

        {nextEvents.length === 0 ? (
          <p
            className="text-xs text-stone-400 p-3 border border-dashed border-stone-200 text-center"
            style={{
              backgroundColor: tokens.surfaceSecondary,
              borderRadius: tokens.innerRadius,
            }}
          >
            No hay eventos agendados
          </p>
        ) : (
          <div className="space-y-2">
            {nextEvents.map((event) => {
              const member = getMember(event.memberId);
              return (
                <div
                  key={event.id}
                  className="p-3 transition-colors flex items-center justify-between gap-3"
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
                    <Avatar
                      name={member ? member.name : 'Familia'}
                      emoji={member?.avatarEmoji || '🏡'}
                      color={member?.avatarColor || tokens.primary}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-stone-800 leading-snug truncate">
                        {event.title}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-stone-400 mt-0.5 truncate">
                        <span>{formatFriendlyDate(event.date)}</span>
                        {event.startTime && (
                          <span className="flex items-center gap-0.5 shrink-0">
                            <Clock className="w-3 h-3" /> {event.startTime}
                          </span>
                        )}
                        {event.location && <span className="truncate">• {event.location}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
