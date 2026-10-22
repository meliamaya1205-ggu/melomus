import React, { useState, useEffect } from 'react';
import { useFamily } from '../../context/FamilyContext';
import { Modal } from '../common/Modal';
import { Avatar } from '../common/Avatar';
import { triggerConfetti } from '../common/ConfettiCelebration';
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Sparkles,
  Award,
  Clock,
  Edit2,
  ChevronDown,
  ChevronUp,
  Calendar,
  Timer,
  Check,
} from 'lucide-react';
import {
  DURATION_PRESETS,
  DurationPreset,
  ResetDurationUnit,
  durationToMinutes,
  formatFriendlyDuration,
  formatFriendlyRemaining,
} from '../../types/reset';

function formatFriendlyDateTime(isoString?: string): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  return new Intl.DateTimeFormat('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export const FamilyResetModal: React.FC = () => {
  const {
    familyResetModalOpen,
    setFamilyResetModalOpen,
    resetMissions,
    toggleResetMission,
    resetMissionsStatus,
    resetSession,
    startResetSession,
    pauseResetSession,
    resumeResetSession,
    updateResetDuration,
    finishResetSession,
    cancelResetSession,
    getMember,
  } = useFamily();

  // Selection states (for creating or editing duration)
  const [selectedPresetId, setSelectedPresetId] = useState<string>('30m');
  const [isCustom, setIsCustom] = useState<boolean>(false);
  const [customValue, setCustomValue] = useState<number>(30);
  const [customUnit, setCustomUnit] = useState<ResetDurationUnit>('minutes');
  const [showMorePresets, setShowMorePresets] = useState<boolean>(false);
  const [isEditingDuration, setIsEditingDuration] = useState<boolean>(false);

  // 1-second ticker to recompute exact remaining time from timestamps
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Quick primary presets explicitly requested in the prompt UI
  const primaryPresetIds = ['15m', '30m', '1h', '2h', '4h', '8h', '24h'];
  const primaryPresets = DURATION_PRESETS.filter((p) => primaryPresetIds.includes(p.id));
  const otherPresets = DURATION_PRESETS.filter((p) => !primaryPresetIds.includes(p.id));

  // Determine current active configuration (either from custom inputs or selected preset)
  const currentDurationConfig = (): {
    value: number;
    unit: ResetDurationUnit;
    minutes: number;
  } => {
    if (isCustom) {
      const v = Math.max(1, Number(customValue) || 1);
      return {
        value: v,
        unit: customUnit,
        minutes: durationToMinutes(v, customUnit),
      };
    }
    const preset = DURATION_PRESETS.find((p) => p.id === selectedPresetId) || DURATION_PRESETS[1];
    return {
      value: preset.value,
      unit: preset.unit,
      minutes: preset.minutes,
    };
  };

  const activeConfig = currentDurationConfig();
  const previewEndsAt = new Date(nowMs + activeConfig.minutes * 60 * 1000).toISOString();

  // Compute exact real-time seconds left based on actual timestamps
  const getSecondsLeft = (): number => {
    if (!resetSession) return activeConfig.minutes * 60;
    if (resetSession.status === 'active' && resetSession.endsAt) {
      const end = new Date(resetSession.endsAt).getTime();
      return Math.max(0, Math.floor((end - nowMs) / 1000));
    }
    if (resetSession.status === 'paused') {
      return Math.max(0, resetSession.remainingSeconds);
    }
    if (resetSession.status === 'completed') {
      return 0;
    }
    return activeConfig.minutes * 60;
  };

  const secondsLeft = getSecondsLeft();
  const isSessionActive = resetSession?.status === 'active';
  const isSessionPaused = resetSession?.status === 'paused';
  const isSessionCompleted = resetSession?.status === 'completed';
  const isRunning = isSessionActive || isSessionPaused;

  // Total duration in seconds for progress bar
  const totalDurationSeconds =
    (resetSession?.durationMinutes ? resetSession.durationMinutes * 60 : activeConfig.minutes * 60) || 1;
  const elapsedSeconds = Math.max(0, totalDurationSeconds - secondsLeft);
  const progressPercent = Math.min(100, Math.max(0, (elapsedSeconds / totalDurationSeconds) * 100));

  // Check if all missions are completed
  const allMissionsCompleted = resetMissions.length > 0 && resetMissions.every((m) => m.completed);

  // Trigger celebration on completion
  useEffect(() => {
    if (isSessionCompleted) {
      triggerConfetti();
    }
  }, [isSessionCompleted]);

  // Handlers
  const handleStartReset = () => {
    startResetSession({
      durationValue: activeConfig.value,
      durationUnit: activeConfig.unit,
      durationMinutes: activeConfig.minutes,
    });
    setIsEditingDuration(false);
  };

  const handleApplyDurationChange = () => {
    updateResetDuration({
      durationValue: activeConfig.value,
      durationUnit: activeConfig.unit,
      durationMinutes: activeConfig.minutes,
    });
    setIsEditingDuration(false);
  };

  const handleCancel = () => {
    if (window.confirm('¿Deseas reiniciar o cancelar este Family Reset?')) {
      cancelResetSession();
      setIsEditingDuration(false);
    }
  };

  const handleSelectPreset = (preset: DurationPreset) => {
    setIsCustom(false);
    setSelectedPresetId(preset.id);
  };

  const handleSelectCustom = () => {
    setIsCustom(true);
  };

  return (
    <Modal
      isOpen={familyResetModalOpen}
      onClose={() => setFamilyResetModalOpen(false)}
      title="🧹 Family Reset"
      subtitle="¡Toda la familia colaborando en equipo con tiempo flexible y personalizado!"
      maxWidth="lg"
    >
      {/* 1. CELEBRATION STATE (Completed) */}
      {isSessionCompleted ? (
        <div className="text-center py-6 animate-in zoom-in-95 duration-200 space-y-4">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-amber-400 via-rose-400 to-emerald-400 flex items-center justify-center text-white text-4xl shadow-lg animate-bounce">
            🌟
          </div>
          <h2 className="text-2xl font-black text-stone-900 tracking-tight">
            ¡Casa Lista y Armonizada!
          </h2>
          <p className="text-stone-600 text-sm max-w-sm mx-auto leading-relaxed">
            ¡Excelente trabajo en equipo! Logramos dedicar el tiempo planificado para dejar nuestro hogar limpio, ordenado y tranquilo.
          </p>

          {resetSession?.completedAt && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-full border border-emerald-200">
              <Check className="w-3.5 h-3.5" />
              <span>Finalizado: {formatFriendlyDateTime(resetSession.completedAt)}</span>
            </div>
          )}

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => {
                resetMissionsStatus();
                cancelResetSession();
              }}
              className="w-full sm:w-auto px-5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Nuevo Family Reset</span>
            </button>
            <button
              onClick={() => setFamilyResetModalOpen(false)}
              className="w-full sm:w-auto px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-md transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <Award className="w-4 h-4" />
              <span>Volver al Inicio</span>
            </button>
          </div>
        </div>
      ) : isRunning && !isEditingDuration ? (
        /* 2. ACTIVE OR PAUSED SESSION */
        <div className="space-y-6">
          <div
            className={`p-6 rounded-3xl border text-center transition-all ${
              isSessionPaused
                ? 'bg-gradient-to-b from-stone-50 to-amber-50/40 border-stone-300 shadow-xs'
                : 'bg-gradient-to-b from-amber-50/90 via-orange-50/50 to-white border-amber-300 shadow-sm'
            }`}
          >
            {/* Status Badge */}
            <div className="flex items-center justify-center mb-2">
              <span
                className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                  isSessionPaused
                    ? 'bg-stone-200 text-stone-800'
                    : 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                }`}
              >
                {isSessionPaused ? (
                  <>
                    <Pause className="w-3.5 h-3.5" />
                    <span>Family Reset en pausa</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span>Family Reset activo</span>
                  </>
                )}
              </span>
            </div>

            {/* Big Countdown Timer based on real timestamps */}
            <div className="my-2">
              <span className="text-[11px] font-bold text-stone-400 uppercase tracking-widest block">
                Tiempo restante
              </span>
              <div className="text-5xl sm:text-6xl font-black tracking-tight text-stone-900 font-mono my-1">
                {formatFriendlyRemaining(secondsLeft)}
              </div>
            </div>

            {/* Ending timestamp and duration info */}
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-stone-600 font-medium mt-1">
              <span className="inline-flex items-center gap-1 bg-white/80 px-2.5 py-1 rounded-lg border border-stone-200/80">
                <Timer className="w-3.5 h-3.5 text-amber-500" />
                <span>
                  Duración:{' '}
                  <strong>
                    {formatFriendlyDuration(
                      resetSession?.durationValue || activeConfig.value,
                      resetSession?.durationUnit || activeConfig.unit
                    )}
                  </strong>
                </span>
              </span>

              {resetSession?.endsAt && isSessionActive && (
                <span className="inline-flex items-center gap-1 bg-white/80 px-2.5 py-1 rounded-lg border border-stone-200/80">
                  <Calendar className="w-3.5 h-3.5 text-sky-500" />
                  <span>
                    Finaliza: <strong>{formatFriendlyDateTime(resetSession.endsAt)}</strong>
                  </span>
                </span>
              )}

              {isSessionPaused && (
                <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-900 px-2.5 py-1 rounded-lg border border-amber-200">
                  <span>El tiempo está detenido • Guardado al pausar</span>
                </span>
              )}
            </div>

            {/* Progress bar */}
            <div className="w-full bg-stone-200/80 rounded-full h-3 my-4 overflow-hidden shadow-inner">
              <div
                className={`h-3 rounded-full transition-all duration-1000 ${
                  isSessionPaused
                    ? 'bg-stone-400'
                    : 'bg-gradient-to-r from-amber-400 via-orange-400 to-emerald-500'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Controls: Pause / Resume, Edit Duration, Finish Now, Cancel */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 mt-4">
              {isSessionActive ? (
                <button
                  onClick={pauseResetSession}
                  className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-2xl shadow-sm transition-transform cursor-pointer hover:scale-102 active:scale-98"
                  title="Pausar conteo de tiempo"
                >
                  <Pause className="w-4 h-4 fill-white" />
                  <span>Pausar</span>
                </button>
              ) : (
                <button
                  onClick={resumeResetSession}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-2xl shadow-sm transition-transform cursor-pointer hover:scale-102 active:scale-98"
                  title="Reanudar conteo de tiempo"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Reanudar</span>
                </button>
              )}

              <button
                onClick={() => setIsEditingDuration(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-white hover:bg-stone-100 text-stone-700 text-xs font-bold rounded-2xl border border-stone-200 shadow-xs transition-colors cursor-pointer"
                title="Modificar duración sin reiniciar"
              >
                <Edit2 className="w-3.5 h-3.5 text-stone-500" />
                <span>Editar duración</span>
              </button>

              <button
                onClick={finishResetSession}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-2xl border border-emerald-200 transition-colors cursor-pointer"
                title="Marcar como terminado"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Finalizar ahora</span>
              </button>

              <button
                onClick={handleCancel}
                className="p-2.5 bg-white text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-2xl border border-stone-200 transition-colors cursor-pointer"
                title="Cancelar Family Reset"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* 3. DURATION CONFIGURATION (Initial Setup or Editing Duration) */
        <div className="space-y-6">
          <div className="bg-gradient-to-b from-amber-50/80 to-orange-50/40 p-5 rounded-3xl border border-amber-200/80 space-y-4">
            <div>
              <span className="text-[11px] font-black uppercase tracking-widest text-amber-800 block mb-1">
                FAMILY RESET
              </span>
              <h3 className="text-base font-bold text-stone-900">
                ¿Cuánto tiempo quieren dedicar?
              </h3>
              <p className="text-xs text-stone-500">
                Elige libremente la duración para que la familia colabore sin prisas.
              </p>
            </div>

            {/* Requested Quick Presets */}
            <div className="flex flex-wrap items-center gap-2">
              {primaryPresets.map((preset) => {
                const isSelected = !isCustom && selectedPresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500 text-white shadow-xs scale-105'
                        : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    {preset.shortLabel}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={handleSelectCustom}
                className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                  isCustom
                    ? 'bg-amber-500 text-white shadow-xs scale-105'
                    : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50'
                }`}
              >
                Personalizado
              </button>
            </div>

            {/* Expandable toggle for the rest of preset durations */}
            <div>
              <button
                type="button"
                onClick={() => setShowMorePresets(!showMorePresets)}
                className="text-xs font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer select-none"
              >
                <span>Otras duraciones (45 min, 1.5h, 3h, 5h, 6h, 12h, 2d, 3d, 7d, 14d, 30d)</span>
                {showMorePresets ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showMorePresets && (
                <div className="mt-2.5 p-3 bg-white/90 rounded-2xl border border-amber-200/60 flex flex-wrap gap-2 animate-in fade-in duration-150">
                  {otherPresets.map((preset) => {
                    const isSelected = !isCustom && selectedPresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectPreset(preset)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'bg-stone-50 text-stone-700 border border-stone-200 hover:bg-white'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Custom Duration Inputs */}
            {isCustom && (
              <div className="p-4 bg-white rounded-2xl border border-amber-200 space-y-3 animate-in fade-in duration-200">
                <div className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span>Duración personalizada a medida</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                      Cantidad
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={customValue}
                      onChange={(e) => setCustomValue(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold focus:bg-white"
                      placeholder="Ej. 3, 10, 45..."
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                      Unidad
                    </label>
                    <select
                      value={customUnit}
                      onChange={(e) => setCustomUnit(e.target.value as ResetDurationUnit)}
                      className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold focus:bg-white"
                    >
                      <option value="minutes">minutos</option>
                      <option value="hours">horas</option>
                      <option value="days">días</option>
                      <option value="weeks">semanas</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Summary preview of duration and calculated end time */}
            <div className="p-3.5 bg-amber-100/60 rounded-2xl border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <Timer className="w-4 h-4 text-amber-700 shrink-0" />
                <span className="text-stone-800">
                  Duración:{' '}
                  <strong className="text-amber-900">
                    {formatFriendlyDuration(activeConfig.value, activeConfig.unit)}
                  </strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-700 shrink-0" />
                <span className="text-stone-800">
                  Finaliza: <strong className="text-amber-900">{formatFriendlyDateTime(previewEndsAt)}</strong>
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2 pt-2">
              {isEditingDuration && (
                <button
                  type="button"
                  onClick={() => setIsEditingDuration(false)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar edición
                </button>
              )}

              {isEditingDuration ? (
                <button
                  type="button"
                  onClick={handleApplyDurationChange}
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Guardar nueva duración</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStartReset}
                  className="w-full sm:w-auto px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-2xl shadow-md transition-all transform hover:scale-102 active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>¡Comenzar Reset!</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. MISSIONS CHECKLIST BY FAMILY MEMBER (Always available) */}
      <div className="mt-6 pt-5 border-t border-stone-200/70">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" /> Misiones de cada integrante
            </h4>
            <p className="text-[11px] text-stone-400">
              Cada miembro puede tocar su tarjeta para marcar su tarea lista
            </p>
          </div>

          <span
            className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              allMissionsCompleted
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-stone-100 text-stone-600'
            }`}
          >
            {resetMissions.filter((m) => m.completed).length} de {resetMissions.length} listas
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {resetMissions.map((mission) => {
            const member = getMember(mission.memberId);
            return (
              <div
                key={mission.id}
                onClick={() => toggleResetMission(mission.id)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none flex items-start justify-between gap-3 ${
                  mission.completed
                    ? 'bg-emerald-50/70 border-emerald-200/80 shadow-xs'
                    : 'bg-stone-50/70 border-stone-200/80 hover:bg-white hover:border-amber-200'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <Avatar
                    name={member ? member.name : mission.memberId}
                    emoji={member?.avatarEmoji}
                    color={member?.avatarColor}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-stone-900 truncate">
                        {member ? member.name : mission.memberId}
                      </span>
                      <span className="text-[10px] bg-white text-stone-600 font-semibold px-2 py-0.5 rounded-md border border-stone-200">
                        {mission.area}
                      </span>
                    </div>
                    <p
                      className={`text-xs mt-1 leading-snug ${
                        mission.completed ? 'text-emerald-800 line-through' : 'text-stone-600'
                      }`}
                    >
                      {mission.taskDescription}
                    </p>
                  </div>
                </div>

                <div className="pt-0.5 shrink-0">
                  <CheckCircle2
                    className={`w-5 h-5 ${
                      mission.completed ? 'text-emerald-600 fill-emerald-100' : 'text-stone-300'
                    }`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
};
