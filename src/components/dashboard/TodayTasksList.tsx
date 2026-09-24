import React from 'react';
import { useFamily } from '../../context/FamilyContext';
import { useTheme } from '../../context/ThemeContext';
import { Avatar } from '../common/Avatar';
import { Badge } from '../common/Badge';
import { CheckCircle2, Circle, Clock, CheckSquare } from 'lucide-react';
import { getTodayString } from '../../services/dateUtils';

export const TodayTasksList: React.FC = () => {
  const {
    tasks,
    toggleTaskComplete,
    getCategoryName,
    getMember,
    activeProfileId,
    setCurrentTab,
  } = useFamily();
  const { tokens, isPremium, isMinimalista } = useTheme();

  const todayStr = getTodayString();

  // Tasks for today (or pending)
  const todayTasks = tasks.filter((t) => t.date === todayStr || t.status === 'in_progress');

  // Filter if user selected a specific member
  const userTasks = activeProfileId === 'family' || activeProfileId === 'mama' || activeProfileId === 'papa'
    ? todayTasks
    : todayTasks.filter((t) => t.responsibleId === activeProfileId || t.relatedMemberId === activeProfileId);

  const pending = userTasks.filter((t) => t.status !== 'completed');
  const completed = userTasks.filter((t) => t.status === 'completed');

  const priorityBadge = (priority: string) => {
    if (priority === 'high') return <Badge variant="danger" size="sm">Alta</Badge>;
    if (priority === 'medium') return <Badge variant="warning" size="sm">Media</Badge>;
    return <Badge variant="neutral" size="sm">Baja</Badge>;
  };

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
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className="p-2 flex items-center justify-center"
            style={{
              backgroundColor: tokens.primarySoft,
              color: tokens.primary,
              borderRadius: isMinimalista ? '0.375rem' : tokens.badgeRadius,
            }}
          >
            <CheckSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-stone-900">Tareas para Hoy</h3>
            <p className="text-xs text-stone-400">
              {pending.length} pendiente{pending.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setCurrentTab('tasks')}
          className="text-xs font-bold hover:underline transition-colors cursor-pointer"
          style={{ color: tokens.primary }}
        >
          Ver todas →
        </button>
      </div>

      {userTasks.length === 0 ? (
        <div
          className="text-center py-8 border border-dashed border-stone-200"
          style={{
            backgroundColor: tokens.surfaceSecondary,
            borderRadius: tokens.innerRadius,
          }}
        >
          <p className="text-xs text-stone-400">¡Todo listo por hoy! No hay tareas pendientes</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Pending tasks */}
          {pending.map((task) => {
            const member = getMember(task.responsibleId);
            return (
              <div
                key={task.id}
                className="group flex items-start justify-between p-3 transition-all cursor-pointer select-none"
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
                onClick={() => toggleTaskComplete(task.id)}
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <button
                    type="button"
                    className="mt-0.5 transition-colors shrink-0 cursor-pointer"
                    style={{ color: tokens.primary }}
                    aria-label="Marcar como completada"
                  >
                    <Circle className="w-5 h-5 opacity-70 group-hover:opacity-100" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-stone-800 leading-snug break-words">
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {priorityBadge(task.priority)}
                      <span
                        className="text-[10px] font-medium px-2 py-0.5 bg-stone-100 text-stone-600"
                        style={{ borderRadius: tokens.badgeRadius }}
                      >
                        {getCategoryName('task', task.categoryKey)}
                      </span>
                      {task.time && (
                        <span className="flex items-center gap-1 text-[11px] text-stone-400">
                          <Clock className="w-3 h-3" /> {task.time}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex-shrink-0 ml-2">
                  <Avatar
                    name={member ? member.name : task.responsibleId === 'both' ? 'Ambos' : 'Familia'}
                    emoji={member?.avatarEmoji || (task.responsibleId === 'both' ? '👫' : '🏡')}
                    color={member?.avatarColor || tokens.primary}
                    size="sm"
                  />
                </div>
              </div>
            );
          })}

          {/* Completed tasks */}
          {completed.map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between p-2.5 border border-transparent opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
              style={{
                backgroundColor: tokens.surfaceSecondary,
                borderRadius: tokens.innerRadius,
              }}
              onClick={() => toggleTaskComplete(task.id)}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-100 shrink-0" />
                <span className="text-xs text-stone-500 line-through font-medium truncate">
                  {task.title}
                </span>
              </div>
              <span className="text-[10px] text-stone-400 shrink-0 ml-2">Completada</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
