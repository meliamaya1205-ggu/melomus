import React, { useState } from 'react';
import { useFamily } from '../context/FamilyContext';
import { ModuleKey } from '../types/config';
import {
  Sliders,
  Palette,
  Baby,
  Download,
  Upload,
  RotateCcw,
  CheckCircle,
  Lock,
  Sparkles,
  Tag,
  Bell,
  Shield,
  Clock,
  Moon,
  ShieldCheck,
  Link,
  LogOut,
  Cloud,
  UserPlus,
} from 'lucide-react';
import { NotificationCategory, AnticipationOption } from '../types/notifications';
import { notificationService } from '../services/notificationService';
import { ThemeSelector } from '../components/theme/ThemeSelector';

export const SettingsView: React.FC = () => {
  const {
    config,
    updateConfig,
    isAdultView,
    resetAllToDemo,
    exportBackup,
    importBackup,
    setActiveProfileId,
    notificationPreferences,
    updateNotificationPreferences,
    updateCategoryPreference,
    testNotification,
    openAuthModal,
    openLinkCoAdminModal,
    logoutAuthUser,
    isSupabaseAuthActive,
    currentUser,
  } = useFamily();

  const [activeSubTab, setActiveSubTab] = useState<'account' | 'personalization' | 'app' | 'notifications' | 'modules' | 'categories' | 'kids' | 'data'>('personalization');
  const [selectedAdultForNotif, setSelectedAdultForNotif] = useState<'mama' | 'papa'>('mama');
  const [permStatus, setPermStatus] = useState<NotificationPermission>(() => notificationService.getPermissionStatus());
  const [testResultMsg, setTestResultMsg] = useState<string | null>(null);
  const [saveAlert, setSaveAlert] = useState<string | null>(null);

  // App & Family name local states
  const [appName, setAppName] = useState(config.appName);
  const [familyName, setFamilyName] = useState(config.familyName);

  // Kids texts local states
  const [kidWelcome, setKidWelcome] = useState(config.kidInterface.welcomeTitle);
  const [kidHabits, setKidHabits] = useState(config.kidInterface.habitsTitle);
  const [kidRewards, setKidRewards] = useState(config.kidInterface.rewardsTitle);
  const [kidQuote, setKidQuote] = useState(config.kidInterface.positiveQuote);

  // Modules local state
  const [moduleTitles, setModuleTitles] = useState<Record<ModuleKey, string>>(() => {
    const map: Record<string, string> = {};
    (Object.keys(config.modules) as ModuleKey[]).forEach((k) => {
      map[k] = config.modules[k]?.displayName || k;
    });
    return map as Record<ModuleKey, string>;
  });

  // Task categories local state
  const [taskCats, setTaskCats] = useState(config.taskCategories);
  // Expense categories local state
  const [expCats, setExpCats] = useState(config.expenseCategories);
  // Income sources local state
  const [incSources, setIncSources] = useState(config.incomeSources);

  // Guard for adults only
  if (!isAdultView) {
    return (
      <div className="bg-white rounded-3xl p-10 border border-stone-200/80 text-center max-w-md mx-auto my-12 shadow-sm">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center text-3xl mb-4">
          <Lock className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-stone-900">Ajustes Protegidos</h3>
        <p className="text-xs text-stone-500 mt-2">
          La configuración global de MELOMUS solo puede ser administrada por Mamá o Papá.
        </p>
        <button
          onClick={() => setActiveProfileId('mama')}
          className="mt-6 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
        >
          Volver a perfil Adulto
        </button>
      </div>
    );
  }

  const handleSaveAppInfo = (e: React.FormEvent) => {
    e.preventDefault();
    updateConfig({
      appName: appName.trim() || 'MELOMUS',
      familyName: familyName.trim() || 'Nuestra Familia',
    });
    showSaveNotification('¡Nombre de la aplicación y familia guardados exitosamente!');
  };

  const handleSaveModuleTitles = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedModules = { ...config.modules };
    (Object.keys(moduleTitles) as ModuleKey[]).forEach((key) => {
      if (updatedModules[key]) {
        updatedModules[key] = {
          ...updatedModules[key],
          displayName: moduleTitles[key].trim() || updatedModules[key].displayName,
        };
      }
    });

    updateConfig({ modules: updatedModules });
    showSaveNotification('¡Nombres visibles de módulos actualizados en toda la app!');
  };

  const handleSaveCategories = (e: React.FormEvent) => {
    e.preventDefault();
    updateConfig({
      taskCategories: taskCats,
      expenseCategories: expCats,
      incomeSources: incSources,
    });
    showSaveNotification('¡Categorías personalizadas guardadas con éxito!');
  };

  const handleSaveKidsTexts = (e: React.FormEvent) => {
    e.preventDefault();
    updateConfig({
      kidInterface: {
        welcomeTitle: kidWelcome.trim() || config.kidInterface.welcomeTitle,
        habitsTitle: kidHabits.trim() || config.kidInterface.habitsTitle,
        rewardsTitle: kidRewards.trim() || config.kidInterface.rewardsTitle,
        positiveQuote: kidQuote.trim() || config.kidInterface.positiveQuote,
        resetTitle: config.kidInterface.resetTitle,
      },
    });
    showSaveNotification('¡Textos de la interfaz infantil actualizados!');
  };

  const showSaveNotification = (msg: string) => {
    setSaveAlert(msg);
    setTimeout(() => setSaveAlert(null), 4000);
  };

  const handleExportData = () => {
    const json = exportBackup();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nuestro-hogar-respaldo-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = importBackup(content);
      if (success) {
        showSaveNotification('¡Datos de respaldo restaurados con éxito!');
      } else {
        alert('El archivo no tiene un formato válido para MELOMUS');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-stone-900">
            {config.modules.settings.displayName}
          </h2>
          <span className="text-xs bg-stone-100 text-stone-700 font-semibold px-2.5 py-0.5 rounded-full">
            Personalizar Sistema
          </span>
        </div>
        <p className="text-xs text-stone-500 mt-0.5">
          Configuración global del hogar: renombra módulos, ajusta categorías y administra tus datos
        </p>
      </div>

      {/* Save Notification */}
      {saveAlert && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-3xl flex items-center gap-3 text-emerald-900 text-xs font-bold animate-in fade-in duration-200">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{saveAlert}</span>
        </div>
      )}

      {/* Sub Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-2xl overflow-x-auto text-xs font-bold">
        {[
          { id: 'account', label: 'Cuenta & Coadministración 👥', icon: <ShieldCheck className="w-3.5 h-3.5 text-blue-500" /> },
          { id: 'personalization', label: 'Personalización 🎨', icon: <Palette className="w-3.5 h-3.5 text-rose-500" /> },
          { id: 'app', label: 'Nombre & Familia', icon: <Sparkles className="w-3.5 h-3.5 text-amber-500" /> },
          { id: 'notifications', label: 'Notificaciones 🔔', icon: <Bell className="w-3.5 h-3.5 text-amber-500" /> },
          { id: 'modules', label: 'Títulos de Módulos', icon: <Sliders className="w-3.5 h-3.5 text-purple-500" /> },
          { id: 'categories', label: 'Categorías del Sistema', icon: <Tag className="w-3.5 h-3.5 text-rose-500" /> },
          { id: 'kids', label: 'Textos Vista Infantil', icon: <Baby className="w-3.5 h-3.5 text-emerald-500" /> },
          { id: 'data', label: 'Copia & Respaldo', icon: <Download className="w-3.5 h-3.5 text-sky-500" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl whitespace-nowrap transition-colors cursor-pointer ${
              activeSubTab === tab.id
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* CUENTA & COADMINISTRACIÓN (PARIDAD TOTAL MAMÁ + PAPÁ) */}
      {activeSubTab === 'account' && (
        <div className="space-y-6">
          {/* Tarjeta de Estado de Sesión */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-blue-500" />
                  <span>Estado de la Cuenta Familiar</span>
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Conexión segura multiusuario con Supabase
                </p>
              </div>
              {isSupabaseAuthActive ? (
                <span className="text-[11px] font-bold px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Sesión Activa
                </span>
              ) : (
                <span className="text-[11px] font-bold px-2.5 py-1 bg-stone-100 text-stone-600 rounded-full">
                  Modo Local
                </span>
              )}
            </div>

            {isSupabaseAuthActive ? (
              <div className="bg-stone-50 rounded-2xl p-4 space-y-3 text-xs">
                <div className="flex justify-between py-1 border-b border-stone-200/70">
                  <span className="text-stone-500">Usuario Autenticado:</span>
                  <span className="font-bold text-stone-800">{currentUser?.name} ({currentUser?.email})</span>
                </div>
                <div className="flex justify-between py-1 border-b border-stone-200/70">
                  <span className="text-stone-500">Rol en el Hogar:</span>
                  <span className="font-bold text-stone-800">
                    Adulto Principal Coadministrador ({currentUser?.relationship === 'papa' ? '🌿 Papá' : '🌸 Mamá'})
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-stone-200/70">
                  <span className="text-stone-500">Familia Asociada:</span>
                  <span className="font-bold text-stone-800">{config.familyName}</span>
                </div>
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={logoutAuthUser}
                    className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Cerrar Sesión</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-amber-50/70 rounded-2xl p-4 space-y-3 text-xs border border-amber-200/70">
                <p className="text-amber-900 leading-relaxed">
                  Actualmente estás utilizando la app en modo local. Inicia sesión o crea tu cuenta familiar en la nube para sincronizar en tiempo real con tu pareja.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => openAuthModal('signin')}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Iniciar Sesión / Crear Cuenta</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Tarjeta de Co-administración Paritaria */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-gradient-to-tr from-amber-400 to-rose-400 text-white rounded-2xl shrink-0 mt-0.5">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-stone-900">
                  Vincular al Segundo Adulto Principal
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  En MELOMUS, <strong>Mamá y Papá son coadministradores de igual jerarquía</strong>. Genera un enlace seguro temporal de 48 horas de un solo uso para que tu pareja se vincule desde su propio teléfono sin invitaciones secundarias ni roles de invitado.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={openLinkCoAdminModal}
                className="w-full sm:w-auto px-5 py-3 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Link className="w-4 h-4" />
                <span>Generar Enlace Seguro de Vinculación</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 0. PERSONALIZACIÓN VISUAL (ESTILOS Y COLORES) */}
      {activeSubTab === 'personalization' && <ThemeSelector />}

      {/* 1. APP & FAMILY NAME */}
      {activeSubTab === 'app' && (
        <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-5">
          <div>
            <h3 className="text-sm font-bold text-stone-900">Identidad del Hogar</h3>
            <p className="text-xs text-stone-500">
              Personaliza el nombre de la app y cómo se nombra tu familia en las pantallas
            </p>
          </div>

          <form onSubmit={handleSaveAppInfo} className="space-y-4 max-w-lg">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Nombre de la Aplicación
              </label>
              <input
                type="text"
                required
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                placeholder="Ej: MELOMUS, Casa Tranquila..."
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Nombre de la Familia
              </label>
              <input
                type="text"
                required
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                placeholder="Ej: Familia González, Los Rodríguez..."
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:bg-white"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                Guardar Identidad
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 2. NOTIFICATIONS & REMINDERS CENTER */}
      {activeSubTab === 'notifications' && (
        <div className="space-y-6">
          {/* Permission Status Banner */}
          <div
            className={`p-4 rounded-3xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
              permStatus === 'granted'
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                : permStatus === 'denied'
                ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                : 'bg-amber-50/70 border-amber-200 text-amber-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold shrink-0 ${
                  permStatus === 'granted'
                    ? 'bg-emerald-100 text-emerald-700'
                    : permStatus === 'denied'
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold">
                  {permStatus === 'granted'
                    ? 'Notificaciones activas en este navegador'
                    : permStatus === 'denied'
                    ? 'Notificaciones bloqueadas en el navegador'
                    : 'Permiso de notificaciones pendiente'}
                </p>
                <p className="text-[11px] opacity-80 mt-0.5">
                  {permStatus === 'granted'
                    ? 'Tu navegador recibirá recordatorios de medicamentos, tareas y citas según las preferencias de abajo.'
                    : permStatus === 'denied'
                    ? 'Debes hacer clic en el candado junto a la URL del navegador y seleccionar "Permitir" notificaciones.'
                    : 'Autoriza el navegador para recibir recordatorios incluso con la aplicación en segundo plano.'}
                </p>
              </div>
            </div>

            {permStatus !== 'granted' && (
              <button
                type="button"
                onClick={async () => {
                  const result = await notificationService.requestPermission();
                  setPermStatus(result);
                  if (result === 'granted') {
                    showSaveNotification('¡Permiso de notificaciones concedido con éxito!');
                  }
                }}
                className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-bold whitespace-nowrap cursor-pointer shadow-xs"
              >
                Activar Notificaciones
              </button>
            )}
          </div>

          {/* Adult Tab Selector (Coadministración Paritaria) */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-4">
              <div>
                <h3 className="text-sm font-bold text-stone-900">Centro de Notificaciones Personal</h3>
                <p className="text-xs text-stone-500">
                  Cada adulto principal configura de forma autónoma sus avisos y niveles de anticipación
                </p>
              </div>

              {/* Adult selector tabs */}
              <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-2xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setSelectedAdultForNotif('mama')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-colors cursor-pointer ${
                    selectedAdultForNotif === 'mama'
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-500 hover:text-stone-900'
                  }`}
                >
                  <span>👩</span>
                  <span>Mamá</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedAdultForNotif('papa')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-colors cursor-pointer ${
                    selectedAdultForNotif === 'papa'
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-500 hover:text-stone-900'
                  }`}
                >
                  <span>👨</span>
                  <span>Papá</span>
                </button>
              </div>
            </div>

            {/* Current Adult Preferences */}
            {(() => {
              const currentPrefs = notificationPreferences[selectedAdultForNotif];
              const adultLabel = selectedAdultForNotif === 'mama' ? 'Mamá' : 'Papá';

              const NOTIF_CATEGORIES: {
                key: NotificationCategory;
                label: string;
                icon: string;
                desc: string;
              }[] = [
                {
                  key: 'tasks',
                  label: 'Tareas y Deberes',
                  icon: '📝',
                  desc: 'Recordatorios de pendientes del hogar y deberes escolares',
                },
                {
                  key: 'events',
                  label: 'Eventos del Calendario',
                  icon: '📅',
                  desc: 'Actividades familiares, colegios, cumpleaños y paseos',
                },
                {
                  key: 'appointments',
                  label: 'Citas Médicas y Controles',
                  icon: '🏥',
                  desc: 'Controles pediátricos, consultas y doctores',
                },
                {
                  key: 'medications',
                  label: 'Medicamentos y Tomas',
                  icon: '💊',
                  desc: 'Horarios de tomas de medicamentos activos indicados',
                },
                {
                  key: 'shopping',
                  label: 'Lista de Compras',
                  icon: '🛒',
                  desc: 'Artículos urgentes de despensa, aseo y farmacia',
                },
                {
                  key: 'habits',
                  label: 'Hábitos y Rutinas',
                  icon: '🌱',
                  desc: 'Avisos para completar hábitos familiares y de los niños',
                },
                {
                  key: 'finance',
                  label: 'Finanzas y Cuentas',
                  icon: '💰',
                  desc: 'Vencimiento de cuentas por pagar, deudas y presupuestos',
                },
                {
                  key: 'couple',
                  label: 'Pareja y Conexión',
                  icon: '💕',
                  desc: 'Citas programadas, conversaciones pendientes y gestos',
                },
                {
                  key: 'cuquiTime',
                  label: 'Cuqui Time (Intimidad)',
                  icon: '🔒',
                  desc: 'Encuentros de intimidad (siempre discreto si se activa el modo discreto)',
                },
                {
                  key: 'reminders',
                  label: 'Recordatorios Familiares',
                  icon: '🔔',
                  desc: 'Avisos personalizados creados con "¿Qué necesitas recordar?"',
                },
              ];

              const ANTICIPATION_OPTIONS: { value: AnticipationOption; label: string }[] = [
                { value: 'at_time', label: 'En el momento' },
                { value: '5_min', label: '5 minutos antes' },
                { value: '15_min', label: '15 minutos antes' },
                { value: '30_min', label: '30 minutos antes' },
                { value: '1_hour', label: '1 hora antes' },
                { value: '1_day', label: '1 día antes' },
              ];

              return (
                <div className="space-y-6">
                  {/* Master & Discrete Mode Toggles */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Master Toggle */}
                    <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Bell className="w-4 h-4 text-amber-500" />
                          <span className="text-xs font-bold text-stone-900">
                            Activar Notificaciones para {adultLabel}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-500 mt-1">
                          Interruptor principal para recibir avisos en este dispositivo
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={currentPrefs?.masterEnabled ?? true}
                          onChange={(e) =>
                            updateNotificationPreferences(selectedAdultForNotif, {
                              masterEnabled: e.target.checked,
                            })
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-stone-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                      </label>
                    </div>

                    {/* Discrete Mode */}
                    <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-emerald-600" />
                          <span className="text-xs font-bold text-stone-900">
                            Notificaciones Discretas
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-500 mt-1">
                          Oculta nombres de fármacos, finanzas y notas de pareja en pantalla de bloqueo
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={currentPrefs?.discreteMode ?? false}
                          onChange={(e) =>
                            updateNotificationPreferences(selectedAdultForNotif, {
                              discreteMode: e.target.checked,
                            })
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-stone-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>

                    {/* Quiet Hours */}
                    <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 md:col-span-2">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <Moon className="w-4 h-4 text-indigo-500" />
                            <span className="text-xs font-bold text-stone-900">
                              Horas de Silencio ({adultLabel})
                            </span>
                          </div>
                          <p className="text-[11px] text-stone-500 mt-1">
                            Silencia alertas emergentes y sonidos en este horario nocturno
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                          <input
                            type="checkbox"
                            checked={currentPrefs?.quietHoursEnabled ?? false}
                            onChange={(e) =>
                              updateNotificationPreferences(selectedAdultForNotif, {
                                quietHoursEnabled: e.target.checked,
                              })
                            }
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-stone-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
                        </label>
                      </div>

                      {currentPrefs?.quietHoursEnabled && (
                        <div className="mt-3 pt-3 border-t border-stone-200/60 flex flex-wrap items-center gap-4 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-stone-600 font-medium">Desde:</span>
                            <input
                              type="time"
                              value={currentPrefs?.quietHoursStart || '22:00'}
                              onChange={(e) =>
                                updateNotificationPreferences(selectedAdultForNotif, {
                                  quietHoursStart: e.target.value,
                                })
                              }
                              className="px-2.5 py-1 bg-white border border-stone-200 rounded-lg text-xs font-semibold text-stone-800"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-stone-600 font-medium">Hasta:</span>
                            <input
                              type="time"
                              value={currentPrefs?.quietHoursEnd || '07:00'}
                              onChange={(e) =>
                                updateNotificationPreferences(selectedAdultForNotif, {
                                  quietHoursEnd: e.target.value,
                                })
                              }
                              className="px-2.5 py-1 bg-white border border-stone-200 rounded-lg text-xs font-semibold text-stone-800"
                            />
                          </div>
                          <span className="text-[11px] text-stone-400">
                            (No se emitirán ruidos ni avisos invasivos entre estas horas)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 10 Categories List */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                      Canales y Anticipación de Aviso ({adultLabel})
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {NOTIF_CATEGORIES.map((cat) => {
                        const catPref = currentPrefs?.categories?.[cat.key] || {
                          enabled: true,
                          defaultAnticipation: '1_hour',
                        };

                        return (
                          <div
                            key={cat.key}
                            className={`p-3.5 rounded-2xl border transition-all ${
                              catPref.enabled
                                ? 'bg-white border-stone-200 shadow-2xs'
                                : 'bg-stone-50/60 border-stone-200/60 opacity-60'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-2.5">
                                <span className="text-lg leading-none shrink-0">{cat.icon}</span>
                                <div>
                                  <h5 className="text-xs font-bold text-stone-900">{cat.label}</h5>
                                  <p className="text-[11px] text-stone-500 leading-tight mt-0.5">
                                    {cat.desc}
                                  </p>
                                </div>
                              </div>

                              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                <input
                                  type="checkbox"
                                  checked={catPref.enabled}
                                  onChange={(e) =>
                                    updateCategoryPreference(selectedAdultForNotif, cat.key, {
                                      enabled: e.target.checked,
                                    })
                                  }
                                  className="sr-only peer"
                                />
                                <div className="w-8 h-4 bg-stone-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-amber-500"></div>
                              </label>
                            </div>

                            {/* Anticipation select */}
                            {catPref.enabled && (
                              <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between gap-2">
                                <span className="text-[11px] font-medium text-stone-500 flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-stone-400" />
                                  Avisar con:
                                </span>
                                <select
                                  value={catPref.defaultAnticipation}
                                  onChange={(e) =>
                                    updateCategoryPreference(selectedAdultForNotif, cat.key, {
                                      defaultAnticipation: e.target.value as AnticipationOption,
                                    })
                                  }
                                  className="text-xs font-semibold bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1 text-stone-800 focus:outline-hidden focus:bg-white"
                                >
                                  {ANTICIPATION_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Test notification button */}
                  <div className="pt-4 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <p className="text-[11px] text-stone-500">
                      Envía una alerta de verificación instantánea a este dispositivo para validar sonido y pantalla.
                    </p>

                    <button
                      type="button"
                      onClick={async () => {
                        setTestResultMsg(null);
                        const ok = await testNotification(selectedAdultForNotif);
                        if (ok) {
                          setTestResultMsg('¡Notificación de prueba enviada con éxito!');
                          showSaveNotification('¡Notificación de prueba enviada al dispositivo!');
                        } else {
                          setTestResultMsg('No se pudo enviar. Verifica los permisos del navegador.');
                        }
                      }}
                      className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Bell className="w-3.5 h-3.5 text-amber-500" />
                      <span>Probar Notificación Ahora</span>
                    </button>
                  </div>

                  {testResultMsg && (
                    <div className="text-xs font-semibold text-stone-700 bg-stone-50 p-2.5 rounded-xl border border-stone-200">
                      {testResultMsg}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* 3. MODULE TITLES CUSTOMIZATION */}
      {activeSubTab === 'modules' && (
        <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-5">
          <div>
            <h3 className="text-sm font-bold text-stone-900">Personalizar Títulos de Módulos</h3>
            <p className="text-xs text-stone-500">
              Cambia los nombres visibles de las secciones sin afectar la lógica interna del sistema
              (Claves técnicas inmutables).
            </p>
          </div>

          <form onSubmit={handleSaveModuleTitles} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(Object.keys(config.modules) as ModuleKey[]).map((key) => {
                const mod = config.modules[key];
                return (
                  <div key={key} className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200/60">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-stone-800">
                        {mod.displayName}
                      </span>
                      <span className="text-[10px] font-mono text-stone-400 bg-white px-2 py-0.5 rounded-md border border-stone-200">
                        key: {mod.technicalKey}
                      </span>
                    </div>

                    <label className="block text-[11px] text-stone-500 mb-1">Nombre visible en menús:</label>
                    <input
                      type="text"
                      value={moduleTitles[key] ?? mod.displayName}
                      onChange={(e) =>
                        setModuleTitles({ ...moduleTitles, [key]: e.target.value })
                      }
                      className="w-full px-3 py-1.5 bg-white border border-stone-200 rounded-xl text-xs font-medium text-stone-900"
                    />
                  </div>
                );
              })}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                Guardar Títulos de Módulos
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. CATEGORIES CUSTOMIZATION */}
      {activeSubTab === 'categories' && (
        <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-6">
          <div>
            <h3 className="text-sm font-bold text-stone-900">Categorías del Sistema</h3>
            <p className="text-xs text-stone-500">
              Personaliza las etiquetas visibles de las tareas, gastos y fuentes de ingreso
            </p>
          </div>

          <form onSubmit={handleSaveCategories} className="space-y-6">
            {/* Task categories */}
            <div>
              <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                Categorías de Tareas ({taskCats.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {taskCats.map((cat, idx) => (
                  <div key={cat.technicalKey} className="p-2.5 bg-stone-50 rounded-xl border border-stone-200">
                    <span className="text-[10px] text-stone-400 block font-mono">
                      technicalKey: {cat.technicalKey}
                    </span>
                    <input
                      type="text"
                      value={cat.displayName}
                      onChange={(e) => {
                        const updated = [...taskCats];
                        updated[idx].displayName = e.target.value;
                        setTaskCats(updated);
                      }}
                      className="w-full mt-1 px-2.5 py-1 bg-white border border-stone-200 rounded-lg text-xs font-semibold text-stone-900"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Expense categories */}
            <div>
              <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                Categorías de Gastos ({expCats.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {expCats.map((cat, idx) => (
                  <div key={cat.technicalKey} className="p-2.5 bg-stone-50 rounded-xl border border-stone-200">
                    <span className="text-[10px] text-stone-400 block font-mono">
                      technicalKey: {cat.technicalKey}
                    </span>
                    <input
                      type="text"
                      value={cat.displayName}
                      onChange={(e) => {
                        const updated = [...expCats];
                        updated[idx].displayName = e.target.value;
                        setExpCats(updated);
                      }}
                      className="w-full mt-1 px-2.5 py-1 bg-white border border-stone-200 rounded-lg text-xs font-semibold text-stone-900"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Income sources */}
            <div>
              <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                Fuentes de Ingresos ({incSources.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {incSources.map((src, idx) => (
                  <div key={src.technicalKey} className="p-2.5 bg-stone-50 rounded-xl border border-stone-200">
                    <span className="text-[10px] text-stone-400 block font-mono">
                      technicalKey: {src.technicalKey}
                    </span>
                    <input
                      type="text"
                      value={src.displayName}
                      onChange={(e) => {
                        const updated = [...incSources];
                        updated[idx].displayName = e.target.value;
                        setIncSources(updated);
                      }}
                      className="w-full mt-1 px-2.5 py-1 bg-white border border-stone-200 rounded-lg text-xs font-semibold text-stone-900"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                Guardar Categorías
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 4. KIDS INTERFACE TEXTS */}
      {activeSubTab === 'kids' && (
        <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-5">
          <div>
            <h3 className="text-sm font-bold text-stone-900">Personalizar Mensajes Infantiles</h3>
            <p className="text-xs text-stone-500">
              Modifica los títulos, saludos y frases motivacionales con lenguaje positivo
            </p>
          </div>

          <form onSubmit={handleSaveKidsTexts} className="space-y-4 max-w-lg">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Título de Bienvenida Infantil
              </label>
              <input
                type="text"
                value={kidWelcome}
                onChange={(e) => setKidWelcome(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Título del Módulo de Hábitos para Niños
              </label>
              <input
                type="text"
                value={kidHabits}
                onChange={(e) => setKidHabits(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Título del Módulo de Recompensas para Niños
              </label>
              <input
                type="text"
                value={kidRewards}
                onChange={(e) => setKidRewards(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Frase Formativa Positiva
              </label>
              <textarea
                rows={2}
                value={kidQuote}
                onChange={(e) => setKidQuote(e.target.value)}
                className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                Guardar Textos Infantiles
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 5. DATA BACKUP & RESET */}
      {activeSubTab === 'data' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-stone-900">Copia de Seguridad y Restauración</h3>
            <p className="text-xs text-stone-500">
              Guarda un archivo JSON con todas las tareas, finanzas, miembros y hábitos familiares para transferirlo a otro dispositivo o conservarlo como respaldo.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={handleExportData}
                className="flex items-center gap-2 px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4 text-amber-300" />
                <span>Exportar Copia de Seguridad (JSON)</span>
              </button>

              <label className="flex items-center gap-2 px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-stone-200">
                <Upload className="w-4 h-4 text-stone-500" />
                <span>Restaurar Copia (JSON)</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportData}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="bg-rose-50/60 rounded-3xl p-6 border border-rose-200/70 space-y-3">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-rose-600" />
              <h3 className="text-sm font-bold text-rose-950">Restablecer Datos de Demostración</h3>
            </div>
            <p className="text-xs text-rose-800">
              Reinicia toda la información de la aplicación al estado inicial con la familia de ejemplo (Mamá, Papá, Annie, Derek, Axel) y las tareas/finanzas precargadas.
            </p>
            <button
              onClick={() => {
                if (window.confirm('¿Seguro que deseas reiniciar todos los datos a la demostración inicial?')) {
                  resetAllToDemo();
                  showSaveNotification('¡Datos restablecidos a la demo inicial!');
                }
              }}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Restablecer Datos Demo
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
