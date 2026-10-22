import React, { useState } from 'react';
import { useFamily } from '../../context/FamilyContext';
import { useTheme } from '../../context/ThemeContext';
import { formatFullDate } from '../../services/dateUtils';
import { Avatar } from '../common/Avatar';
import { Plus, Timer, ChevronDown, ShieldCheck, Baby, Bell, Link, LogOut, Cloud, UserPlus, RefreshCw, WifiOff, AlertTriangle } from 'lucide-react';

export const Navbar: React.FC = () => {
  const {
    config,
    members,
    activeProfileId,
    setActiveProfileId,
    activeMember,
    isAdultView,
    setQuickActionModalOpen,
    setFamilyResetModalOpen,
    setNotificationDrawerOpen,
    reminders,
    openAuthModal,
    openLinkCoAdminModal,
    logoutAuthUser,
    isSupabaseAuthActive,
    currentUser,
    dataMode,
    syncStatus,
    pendingSyncCount,
    flushSyncOutbox,
  } = useFamily();
  const { tokens, isMinimalista, isPremium } = useTheme();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const todayFormatted = formatFullDate();

  const adultKey = activeProfileId === 'papa' ? 'papa' : 'mama';
  const pendingRemindersCount = reminders.filter((r) => {
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

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-stone-200/70 px-2.5 sm:px-4 lg:px-8 py-2.5 sm:py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Logo & App/Family Name */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-2xl overflow-hidden shadow-xs border border-stone-200/60 bg-white flex items-center justify-center">
            <img src="/logo.png" alt="MELOMUS" className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-base sm:text-lg font-bold text-stone-900 leading-tight tracking-tight truncate max-w-[110px] xs:max-w-[150px] sm:max-w-none">
                {config.appName}
              </h1>
              <span className="text-xs bg-amber-50 text-amber-800 font-medium px-2 py-0.5 rounded-full border border-amber-200/60 hidden sm:inline-block shrink-0">
                {config.familyName}
              </span>

              {/* Indicador de Sincronización Discreto */}
              {dataMode === 'local_demo' ? (
                <div
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-100 text-stone-600 border border-stone-200/80 cursor-default select-none shrink-0"
                  title="Modo local: Los cambios se guardan solo en este dispositivo."
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
                  <span className="hidden xs:inline">Modo Local</span>
                </div>
              ) : syncStatus === 'syncing' ? (
                <button
                  type="button"
                  onClick={flushSyncOutbox}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-sky-50 text-sky-700 border border-sky-200/80 transition-all cursor-pointer shrink-0"
                  title="Sincronizando cambios con Supabase..."
                >
                  <RefreshCw className="w-3 h-3 text-sky-600 animate-spin" />
                  <span className="hidden xs:inline">Sincronizando...</span>
                </button>
              ) : syncStatus === 'offline' ? (
                <div
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200/80 cursor-default shrink-0"
                  title="Sin conexión a internet. Los cambios se guardarán automáticamente al reconectar."
                >
                  <WifiOff className="w-3 h-3 text-amber-600" />
                  <span className="hidden xs:inline">Sin conexión</span>
                  {pendingSyncCount > 0 && <span className="font-bold">({pendingSyncCount})</span>}
                </div>
              ) : syncStatus === 'pending' || pendingSyncCount > 0 ? (
                <button
                  type="button"
                  onClick={flushSyncOutbox}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 transition-all cursor-pointer shrink-0"
                  title={`${pendingSyncCount} cambio(s) pendientes de subir a la nube. Clic para forzar sincronización.`}
                >
                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                  <span className="hidden xs:inline">Cambios pendientes</span>
                  <span className="font-bold">({pendingSyncCount})</span>
                </button>
              ) : syncStatus === 'error' ? (
                <button
                  type="button"
                  onClick={flushSyncOutbox}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100 transition-all cursor-pointer shrink-0"
                  title="Hubo un error al guardar en Supabase. Clic para reintentar."
                >
                  <AlertTriangle className="w-3 h-3 text-rose-600" />
                  <span className="hidden xs:inline">Error al sincronizar</span>
                </button>
              ) : (
                <div
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60 cursor-default select-none shrink-0"
                  title="Todos los datos están sincronizados en tiempo real con la nube."
                >
                  <Cloud className="w-3 h-3 text-emerald-600" />
                  <span className="hidden xs:inline">Sincronizado</span>
                </div>
              )}
            </div>
            <p className="text-[10px] sm:text-xs text-stone-500 capitalize truncate mt-0.5">{todayFormatted}</p>
          </div>
        </div>

        {/* Action Buttons & Profile Switcher */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Reset Familiar quick trigger */}
          <button
            onClick={() => setFamilyResetModalOpen(true)}
            className="hidden md:flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold rounded-xl border border-amber-200/70 transition-all shadow-xs cursor-pointer"
            title="Iniciar Reset Familiar de 10 min"
          >
            <Timer className="w-4 h-4 text-amber-600 animate-pulse" />
            <span>Reset Familiar</span>
          </button>

          {/* Notification Bell */}
          <button
            type="button"
            onClick={() => setNotificationDrawerOpen(true)}
            className="relative p-2 rounded-xl text-stone-600 hover:text-stone-900 hover:bg-stone-100/80 transition-colors cursor-pointer border border-stone-200/80 bg-white"
            title="Abrir Recordatorios y Notificaciones"
          >
            <Bell className="w-4 h-4 text-stone-700" />
            {pendingRemindersCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                {pendingRemindersCount > 9 ? '9+' : pendingRemindersCount}
              </span>
            )}
          </button>

          {/* Quick Action Button (+ Nuevo) */}
          <button
            onClick={() => setQuickActionModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-white text-xs font-bold transition-all cursor-pointer hover:opacity-95"
            style={{
              backgroundColor: tokens.primary,
              borderRadius: tokens.buttonRadius,
              boxShadow: isMinimalista ? 'none' : isPremium ? '0 4px 14px -2px rgba(0, 0, 0, 0.25)' : tokens.buttonShadow,
            }}
            title="Crear nueva tarea, evento o compra"
          >
            <Plus className="w-4 h-4 text-white" />
            <span className="hidden sm:inline">Nuevo</span>
          </button>

          {/* Member Profile Switcher */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 p-1.5 pl-2 pr-2.5 rounded-2xl hover:bg-stone-100 border border-stone-200/80 transition-all cursor-pointer bg-white"
              aria-label="Cambiar perfil familiar"
            >
              <Avatar
                name={activeMember ? activeMember.name : 'Familia'}
                emoji={activeMember ? activeMember.avatarEmoji : '🏡'}
                color={activeMember ? activeMember.avatarColor : '#f59e0b'}
                size="sm"
              />
              <div className="text-left hidden lg:block leading-tight">
                <span className="text-[10px] text-stone-400 uppercase tracking-wider block font-semibold">
                  {isAdultView ? 'Adulto' : 'Niño'}
                </span>
                <span className="text-xs font-bold text-stone-800 block truncate max-w-[90px]">
                  {activeMember ? activeMember.name : 'Familia'}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
            </button>

            {dropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-stone-200/90 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 border-b border-stone-100">
                    <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
                      Cambiar de perfil
                    </p>
                    <p className="text-xs text-stone-600">
                      Viendo como: <strong className="text-stone-900">{activeMember ? activeMember.name : 'Toda la familia'}</strong>
                    </p>
                  </div>

                  <div className="py-1">
                    <p className="px-3 py-1 text-[10px] font-bold text-stone-400 uppercase flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-stone-500" /> Adultos (Control total)
                    </p>
                    {members
                      .filter((m) => m.role === 'adult')
                      .map((member) => (
                        <button
                          key={member.id}
                          onClick={() => {
                            setActiveProfileId(member.id);
                            setDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-stone-50 transition-colors cursor-pointer ${
                            activeProfileId === member.id ? 'bg-amber-50/70 font-semibold' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Avatar
                              name={member.name}
                              emoji={member.avatarEmoji}
                              color={member.avatarColor}
                              size="sm"
                            />
                            <span className="text-xs text-stone-800">{member.name}</span>
                          </div>
                          {activeProfileId === member.id && (
                            <span className="text-[10px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full font-medium">
                              Activo
                            </span>
                          )}
                        </button>
                      ))}

                    <div className="border-t border-stone-100 my-1 pt-1">
                      <p className="px-3 py-1 text-[10px] font-bold text-stone-400 uppercase flex items-center gap-1">
                        <Baby className="w-3 h-3 text-stone-500" /> Perfiles Infantiles
                      </p>
                      {members
                        .filter((m) => m.role === 'child')
                        .map((member) => (
                          <button
                            key={member.id}
                            onClick={() => {
                              setActiveProfileId(member.id);
                              setDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-stone-50 transition-colors cursor-pointer ${
                              activeProfileId === member.id ? 'bg-purple-50/70 font-semibold' : ''
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <Avatar
                                name={member.name}
                                emoji={member.avatarEmoji}
                                color={member.avatarColor}
                                size="sm"
                              />
                              <div>
                                <span className="text-xs text-stone-800 block">{member.name}</span>
                                <span className="text-[10px] text-purple-600 block">
                                  ⭐ {member.points} puntos
                                </span>
                              </div>
                            </div>
                            {activeProfileId === member.id && (
                              <span className="text-[10px] text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full font-medium">
                                Activo
                              </span>
                            )}
                          </button>
                        ))}
                    </div>

                    {/* Co-administración & Cuenta Cloud */}
                    <div className="border-t border-stone-100 my-1 pt-1 space-y-0.5">
                      {isAdultView && (
                        <button
                          onClick={() => {
                            setDropdownOpen(false);
                            openLinkCoAdminModal();
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-amber-50/70 text-amber-900 transition-colors text-xs font-semibold cursor-pointer"
                        >
                          <Link className="w-3.5 h-3.5 text-amber-600" />
                          <span>Vincular Adulto Principal</span>
                        </button>
                      )}

                      {isSupabaseAuthActive ? (
                        <div className="px-3 py-1.5 space-y-1">
                          <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 font-medium">
                            <Cloud className="w-3 h-3 text-emerald-600" />
                            <span className="truncate">{currentUser?.email || 'Sesión iniciada'}</span>
                          </div>
                          <button
                            onClick={() => {
                              setDropdownOpen(false);
                              logoutAuthUser();
                            }}
                            className="w-full flex items-center gap-1.5 text-[11px] text-stone-500 hover:text-rose-600 transition-colors cursor-pointer py-1"
                          >
                            <LogOut className="w-3 h-3" />
                            <span>Cerrar Sesión</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setDropdownOpen(false);
                            openAuthModal('signin');
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-stone-50 text-stone-700 transition-colors text-xs font-semibold cursor-pointer"
                        >
                          <UserPlus className="w-3.5 h-3.5 text-stone-500" />
                          <span>Iniciar Sesión / Cuenta</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
