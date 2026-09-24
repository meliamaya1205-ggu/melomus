import React, { useState } from 'react';
import { useFamily } from '../../context/FamilyContext';
import { useTheme } from '../../context/ThemeContext';
import { ModuleKey } from '../../types/config';
import {
  Home,
  CheckSquare,
  Calendar,
  Wallet,
  Sparkles,
  Smile,
  MoreHorizontal,
  Users,
  HeartPulse,
  Settings,
  Timer,
  X,
  Award,
  Heart,
} from 'lucide-react';

export const BottomNav: React.FC = () => {
  const {
    currentTab,
    setCurrentTab,
    getModuleTitle,
    isAdultView,
    isKidView,
    setFamilyResetModalOpen,
  } = useFamily();
  const { tokens } = useTheme();

  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  const handleNavClick = (key: ModuleKey) => {
    setCurrentTab(key);
    setMoreMenuOpen(false);
  };

  return (
    <>
      {/* Mobile Drawer for "Más" */}
      {moreMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden animate-in fade-in duration-150">
          <div
            className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs"
            onClick={() => setMoreMenuOpen(false)}
          />
          <div className="fixed bottom-[calc(3.75rem+env(safe-area-inset-bottom,0px))] inset-x-0 bg-white rounded-t-3xl shadow-2xl p-5 border-t border-stone-200 z-45 max-h-[75dvh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-3">
              <span className="text-sm font-bold text-stone-800">Más Secciones</span>
              <button
                onClick={() => setMoreMenuOpen(false)}
                className="p-1 text-stone-400 hover:text-stone-700 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <button
                onClick={() => {
                  setFamilyResetModalOpen(true);
                  setMoreMenuOpen(false);
                }}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-amber-50 text-amber-900 border border-amber-200/80 hover:bg-amber-100 transition-colors cursor-pointer"
              >
                <Timer className="w-5 h-5 text-amber-600 mb-1 stroke-[1.75]" />
                <span className="text-[11px] font-semibold">Reset 10m</span>
              </button>

              <button
                onClick={() => handleNavClick('rewards')}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-stone-50 text-stone-800 border border-stone-200/60 hover:bg-stone-100 transition-colors cursor-pointer"
              >
                <Award className="w-5 h-5 text-stone-600 mb-1 stroke-[1.75]" />
                <span className="text-[11px] font-semibold">{getModuleTitle('rewards')}</span>
              </button>

              {isAdultView && (
                <>
                  <button
                    onClick={() => handleNavClick('family')}
                    className="flex flex-col items-center justify-center p-3 rounded-2xl bg-stone-50 text-stone-800 border border-stone-200/60 hover:bg-stone-100 transition-colors cursor-pointer"
                  >
                    <Users className="w-5 h-5 text-stone-600 mb-1 stroke-[1.75]" />
                    <span className="text-[11px] font-medium">{getModuleTitle('family')}</span>
                  </button>

                  <button
                    onClick={() => handleNavClick('couple')}
                    className="flex flex-col items-center justify-center p-3 rounded-2xl bg-stone-50 text-stone-800 border border-stone-200/60 hover:bg-stone-100 transition-colors cursor-pointer"
                  >
                    <Heart className="w-5 h-5 text-stone-600 mb-1 stroke-[1.75]" />
                    <span className="text-[11px] font-medium">{getModuleTitle('couple')}</span>
                  </button>

                  <button
                    onClick={() => handleNavClick('health')}
                    className="flex flex-col items-center justify-center p-3 rounded-2xl bg-stone-50 text-stone-800 border border-stone-200/60 hover:bg-stone-100 transition-colors cursor-pointer"
                  >
                    <HeartPulse className="w-5 h-5 text-stone-600 mb-1 stroke-[1.75]" />
                    <span className="text-[11px] font-medium">{getModuleTitle('health')}</span>
                  </button>

                  <button
                    onClick={() => handleNavClick('finance')}
                    className="flex flex-col items-center justify-center p-3 rounded-2xl bg-stone-50 text-stone-800 border border-stone-200/60 hover:bg-stone-100 transition-colors cursor-pointer"
                  >
                    <Wallet className="w-5 h-5 text-stone-600 mb-1 stroke-[1.75]" />
                    <span className="text-[11px] font-medium">{getModuleTitle('finance')}</span>
                  </button>

                  <button
                    onClick={() => handleNavClick('settings')}
                    className="flex flex-col items-center justify-center p-3 rounded-2xl bg-stone-50 text-stone-800 border border-stone-200/60 hover:bg-stone-100 transition-colors cursor-pointer"
                  >
                    <Settings className="w-5 h-5 text-stone-600 mb-1 stroke-[1.75]" />
                    <span className="text-[11px] font-medium">{getModuleTitle('settings')}</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Fixed Bottom Bar */}
      <nav className="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-stone-200/70 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] flex items-center justify-around md:hidden">
        <button
          onClick={() => handleNavClick('dashboard')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition-colors cursor-pointer ${
            currentTab === 'dashboard' ? 'font-bold' : 'text-stone-400 hover:text-stone-600'
          }`}
          style={{ color: currentTab === 'dashboard' ? tokens.primary : undefined }}
        >
          <Home className="w-5 h-5 stroke-[1.75]" />
          <span className="text-[10px]">{getModuleTitle('dashboard')}</span>
          {currentTab === 'dashboard' && (
            <span className="w-1 h-1 rounded-full" style={{ backgroundColor: tokens.primary }} />
          )}
        </button>

        {!isKidView && (
          <>
            <button
              onClick={() => handleNavClick('tasks')}
              className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition-colors cursor-pointer ${
                currentTab === 'tasks' ? 'font-bold' : 'text-stone-400 hover:text-stone-600'
              }`}
              style={{ color: currentTab === 'tasks' ? tokens.primary : undefined }}
            >
              <CheckSquare className="w-5 h-5 stroke-[1.75]" />
              <span className="text-[10px]">{getModuleTitle('tasks')}</span>
              {currentTab === 'tasks' && (
                <span className="w-1 h-1 rounded-full" style={{ backgroundColor: tokens.primary }} />
              )}
            </button>

            <button
              onClick={() => handleNavClick('calendar')}
              className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition-colors cursor-pointer ${
                currentTab === 'calendar' ? 'font-bold' : 'text-stone-400 hover:text-stone-600'
              }`}
              style={{ color: currentTab === 'calendar' ? tokens.primary : undefined }}
            >
              <Calendar className="w-5 h-5 stroke-[1.75]" />
              <span className="text-[10px]">{getModuleTitle('calendar')}</span>
              {currentTab === 'calendar' && (
                <span className="w-1 h-1 rounded-full" style={{ backgroundColor: tokens.primary }} />
              )}
            </button>

            <button
              onClick={() => handleNavClick('home')}
              className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition-colors cursor-pointer ${
                currentTab === 'home' ? 'font-bold' : 'text-stone-400 hover:text-stone-600'
              }`}
              style={{ color: currentTab === 'home' ? tokens.primary : undefined }}
            >
              <Sparkles className="w-5 h-5 stroke-[1.75]" />
              <span className="text-[10px]">{getModuleTitle('home')}</span>
              {currentTab === 'home' && (
                <span className="w-1 h-1 rounded-full" style={{ backgroundColor: tokens.primary }} />
              )}
            </button>
          </>
        )}

        <button
          onClick={() => handleNavClick('habits')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition-colors cursor-pointer ${
            currentTab === 'habits' ? 'font-bold' : 'text-stone-400 hover:text-stone-600'
          }`}
          style={{ color: currentTab === 'habits' ? tokens.primary : undefined }}
        >
          <Smile className="w-5 h-5 stroke-[1.75]" />
          <span className="text-[10px]">{getModuleTitle('habits')}</span>
          {currentTab === 'habits' && (
            <span className="w-1 h-1 rounded-full" style={{ backgroundColor: tokens.primary }} />
          )}
        </button>

        <button
          onClick={() => setMoreMenuOpen(!moreMenuOpen)}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition-colors cursor-pointer ${
            moreMenuOpen ? 'font-bold' : 'text-stone-400 hover:text-stone-600'
          }`}
          style={{ color: moreMenuOpen ? tokens.primary : undefined }}
        >
          <MoreHorizontal className="w-5 h-5 stroke-[1.75]" />
          <span className="text-[10px]">Más</span>
          {moreMenuOpen && (
            <span className="w-1 h-1 rounded-full" style={{ backgroundColor: tokens.primary }} />
          )}
        </button>
      </nav>
    </>
  );
};
