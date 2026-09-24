import React from 'react';
import { useFamily } from '../../context/FamilyContext';
import { useTheme } from '../../context/ThemeContext';
import { Avatar } from '../common/Avatar';
import { Users, Trophy } from 'lucide-react';

export const FamilyMembersSummary: React.FC = () => {
  const { members, activeProfileId, setActiveProfileId, tasks, isAdultView } = useFamily();
  const { tokens, isPremium, isMinimalista } = useTheme();

  return (
    <div
      className="theme-card p-4 sm:p-5 space-y-3 transition-all duration-300"
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
            className="p-1.5 flex items-center justify-center text-white"
            style={{
              backgroundColor: tokens.primary,
              borderRadius: isMinimalista ? '0.375rem' : tokens.badgeRadius,
            }}
          >
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-stone-900 leading-tight">
              Nuestra Familia
            </h3>
            <p className="text-[11px] text-stone-400 font-medium">
              Integrantes y estado de actividades
            </p>
          </div>
        </div>

        <span
          className="text-[10px] font-semibold px-2 py-0.5"
          style={{
            backgroundColor: tokens.surfaceSecondary,
            color: tokens.textMuted,
            borderRadius: tokens.badgeRadius,
            border: isPremium ? '1px solid rgba(217, 119, 6, 0.2)' : undefined,
          }}
        >
          {members.length} miembros
        </span>
      </div>

      {/* Horizontal Avatar Bar */}
      <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-5 gap-2.5 pt-1">
        {members.map((member) => {
          const isActive = activeProfileId === member.id;
          const isChild = member.role === 'child';
          const memberTasks = tasks.filter(
            (t) => t.responsibleId === member.id && t.status !== 'completed'
          ).length;

          return (
            <div
              key={member.id}
              onClick={() => {
                if (isAdultView || member.id === activeProfileId) {
                  setActiveProfileId(member.id);
                }
              }}
              className={`p-2.5 transition-all text-center select-none ${
                isAdultView ? 'cursor-pointer hover:scale-102 active:scale-98' : ''
              }`}
              style={{
                backgroundColor: isActive ? tokens.primarySoft : tokens.itemBg,
                border: isActive
                  ? `2px solid ${tokens.primary}`
                  : tokens.itemBorder,
                borderRadius: tokens.buttonRadius,
                boxShadow: isMinimalista
                  ? 'none'
                  : isPremium
                  ? '0 2px 8px -2px rgba(28,25,23,0.06)'
                  : undefined,
              }}
            >
              <div className="flex justify-center mb-1.5">
                <Avatar
                  name={member.name}
                  emoji={member.avatarEmoji}
                  color={member.avatarColor}
                  size="md"
                />
              </div>

              <h4 className="text-xs font-bold text-stone-900 truncate">
                {member.name}
              </h4>

              <div className="mt-1 flex items-center justify-center">
                {isChild ? (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-100/70 px-1.5 py-0.2 rounded-md">
                    <Trophy className="w-2.5 h-2.5" />
                    <span>{member.points} pts</span>
                  </span>
                ) : (
                  <span className="text-[10px] font-medium text-stone-500">
                    {memberTasks === 0 ? 'Al día ✨' : `${memberTasks} pendientes`}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
