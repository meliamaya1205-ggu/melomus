import React from 'react';
import { useFamily } from '../../context/FamilyContext';
import { ModuleKey } from '../../types/config';
import {
  Home,
  CheckSquare,
  Calendar,
  Wallet,
  Users,
  HeartPulse,
  Sparkles,
  Timer,
  Smile,
  Award,
  Settings,
  Lock,
  ArrowLeftCircle,
  Heart,
} from 'lucide-react';

const MODULE_ICONS: Record<string, React.ReactNode> = {
  Home: <Home className="w-5 h-5" />,
  CheckSquare: <CheckSquare className="w-5 h-5" />,
  Calendar: <Calendar className="w-5 h-5" />,
  Wallet: <Wallet className="w-5 h-5" />,
  Users: <Users className="w-5 h-5" />,
  Heart: <Heart className="w-5 h-5" />,
  HeartPulse: <HeartPulse className="w-5 h-5" />,
  Sparkles: <Sparkles className="w-5 h-5" />,
  Timer: <Timer className="w-5 h-5" />,
  Smile: <Smile className="w-5 h-5" />,
  Award: <Award className="w-5 h-5" />,
  Settings: <Settings className="w-5 h-5" />,
};

export const Sidebar: React.FC = () => {
  const {
    currentTab,
    setCurrentTab,
    getModuleTitle,
    config,
    isAdultView,
    isKidView,
    activeMember,
    setActiveProfileId,
    tasks,
    shoppingItems,
    appointments,
    setFamilyResetModalOpen,
  } = useFamily();

  // Badges calculations
  const pendingTasksCount = tasks.filter((t) => t.status !== 'completed').length;
  const pendingShoppingCount = shoppingItems.filter((s) => !s.completed).length;
  const upcomingAppointmentsCount = appointments.filter((a) => a.status === 'upcoming').length;

  // Adult navigation items
  const adultNavItems: ModuleKey[] = [
    'dashboard',
    'tasks',
    'calendar',
    'finance',
    'family',
    'couple',
    'health',
    'home',
    'reset',
    'habits',
    'rewards',
    'settings',
  ];

  // Kids navigation items
  const kidNavItems: ModuleKey[] = [
    'dashboard',
    'habits',
    'rewards',
    'reset',
  ];

  const visibleItems = isKidView ? kidNavItems : adultNavItems;

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-stone-200/80 min-h-[calc(100vh-65px)] p-4 select-none">
      {/* Kids banner notice if kid profile */}
      {isKidView && (
        <div className="mb-4 p-3 bg-purple-50 rounded-2xl border border-purple-100 text-purple-950">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">{activeMember?.avatarEmoji}</span>
            <p className="text-xs font-bold">{config.kidInterface.welcomeTitle}</p>
          </div>
          <p className="text-[11px] text-purple-700 leading-tight">
            Viendo la interfaz infantil de {activeMember?.name}.
          </p>
          <button
            onClick={() => setActiveProfileId('mama')}
            className="mt-2.5 w-full flex items-center justify-center gap-1.5 py-1.5 bg-white text-purple-800 hover:bg-purple-100 rounded-xl text-xs font-semibold border border-purple-200 transition-colors cursor-pointer"
          >
            <ArrowLeftCircle className="w-3.5 h-3.5" />
            <span>Volver a vista Adultos</span>
          </button>
        </div>
      )}

      {/* Navigation List */}
      <nav className="flex-1 space-y-1">
        {visibleItems.map((key) => {
          const mod = config.modules[key];
          const isActive = currentTab === key;
          const isFinance = key === 'finance';
          const isReset = key === 'reset';

          return (
            <button
              key={key}
              onClick={() => {
                if (isReset) {
                  setFamilyResetModalOpen(true);
                } else {
                  setCurrentTab(key);
                }
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-sm font-medium transition-all cursor-pointer ${
                isActive && !isReset
                  ? 'bg-amber-50 text-amber-900 font-bold'
                  : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`${
                    isActive && !isReset ? 'text-amber-600' : 'text-stone-400 group-hover:text-stone-600'
                  }`}
                >
                  {mod?.icon && MODULE_ICONS[mod.icon] ? MODULE_ICONS[mod.icon] : <Sparkles className="w-5 h-5" />}
                </span>
                <span>{getModuleTitle(key)}</span>
              </div>

              {/* Special Badges */}
              <div className="flex items-center gap-1.5">
                {(isFinance || key === 'couple') && isAdultView && (
                  <span className="flex items-center gap-0.5 text-[10px] text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded-md font-medium" title="Privado para adultos">
                    <Lock className="w-2.5 h-2.5" />
                  </span>
                )}
                {key === 'tasks' && pendingTasksCount > 0 && (
                  <span className="text-[11px] font-semibold bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full">
                    {pendingTasksCount}
                  </span>
                )}
                {key === 'home' && pendingShoppingCount > 0 && (
                  <span className="text-[11px] font-semibold bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full">
                    {pendingShoppingCount}
                  </span>
                )}
                {key === 'health' && upcomingAppointmentsCount > 0 && (
                  <span className="text-[11px] font-semibold bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full">
                    {upcomingAppointmentsCount}
                  </span>
                )}
                {isReset && (
                  <span className="text-[10px] bg-amber-500 text-white font-bold px-1.5 py-0.5 rounded-md">
                    10m
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </nav>

      {/* Bottom Quick Card: Reset Familiar */}
      <div className="mt-4 pt-4 border-t border-stone-100">
        <div className="bg-gradient-to-br from-amber-500/10 via-rose-500/10 to-purple-500/10 rounded-2xl p-3.5 border border-amber-200/60 text-stone-800 shadow-2xs">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="p-1.5 bg-amber-500 text-white rounded-xl">
              <Timer className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-bold leading-none text-stone-900">Reset Familiar</p>
              <p className="text-[10px] text-stone-500 mt-0.5">10 min de orden en equipo</p>
            </div>
          </div>
          <button
            onClick={() => setFamilyResetModalOpen(true)}
            className="mt-2.5 w-full py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-xl transition-colors shadow-2xs cursor-pointer text-center"
          >
            Iniciar Sesión
          </button>
        </div>
      </div>
    </aside>
  );
};
