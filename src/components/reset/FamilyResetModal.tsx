import React, { useState, useEffect } from 'react';
import { useFamily } from '../../context/FamilyContext';
import { Modal } from '../common/Modal';
import { Avatar } from '../common/Avatar';
import { triggerConfetti } from '../common/ConfettiCelebration';
import { Play, Pause, RotateCcw, CheckCircle2, Sparkles, Award } from 'lucide-react';

export const FamilyResetModal: React.FC = () => {
  const {
    familyResetModalOpen,
    setFamilyResetModalOpen,
    resetMissions,
    toggleResetMission,
    resetMissionsStatus,
    getMember,
  } = useFamily();

  const [selectedMinutes, setSelectedMinutes] = useState<number>(10);
  const [secondsLeft, setSecondsLeft] = useState<number>(10 * 60);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [celebrationShown, setCelebrationShown] = useState<boolean>(false);

  // Timer countdown
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isActive && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft((sec) => sec - 1);
      }, 1000);
    } else if (secondsLeft === 0 && isActive) {
      setIsActive(false);
      triggerConfetti();
      setCelebrationShown(true);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, secondsLeft]);

  // Check if all missions are completed
  const allCompleted = resetMissions.length > 0 && resetMissions.every((m) => m.completed);

  useEffect(() => {
    if (allCompleted && !celebrationShown) {
      triggerConfetti();
      setCelebrationShown(true);
    }
  }, [allCompleted, celebrationShown]);

  const handleStartPause = () => {
    setIsActive(!isActive);
  };

  const handleResetTimer = (minutes: number = selectedMinutes) => {
    setIsActive(false);
    setSelectedMinutes(minutes);
    setSecondsLeft(minutes * 60);
    setCelebrationShown(false);
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const progressPercent = ((selectedMinutes * 60 - secondsLeft) / (selectedMinutes * 60)) * 100;

  return (
    <Modal
      isOpen={familyResetModalOpen}
      onClose={() => setFamilyResetModalOpen(false)}
      title="🧹 Reset Familiar Express"
      subtitle="¡Toda la familia colaborando en equipo por 10 minutos!"
      maxWidth="lg"
    >
      {/* Celebration state */}
      {celebrationShown ? (
        <div className="text-center py-6 animate-in zoom-in-95 duration-200">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-amber-400 via-rose-400 to-emerald-400 flex items-center justify-center text-white text-4xl shadow-lg mb-4 animate-bounce">
            🌟
          </div>
          <h2 className="text-2xl font-black text-stone-900 tracking-tight">
            ¡Casa Lista!
          </h2>
          <p className="text-stone-600 text-sm max-w-sm mx-auto mt-2 leading-relaxed">
            ¡Excelente trabajo en equipo! En solo unos minutos logramos dejar nuestro hogar ordenado, tranquilo y hermoso.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => {
                resetMissionsStatus();
                handleResetTimer(10);
              }}
              className="px-5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Reiniciar Misiones
            </button>
            <button
              onClick={() => setFamilyResetModalOpen(false)}
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-md transition-colors cursor-pointer flex items-center gap-2"
            >
              <Award className="w-4 h-4" />
              <span>¡Completado! Volver al Inicio</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Preset Buttons & Timer Display */}
          <div className="bg-gradient-to-b from-amber-50/80 to-orange-50/50 p-5 rounded-3xl border border-amber-200/70 text-center">
            {/* Presets */}
            <div className="flex items-center justify-center gap-2 mb-3">
              {[5, 10, 15].map((m) => (
                <button
                  key={m}
                  onClick={() => handleResetTimer(m)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedMinutes === m
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  {m} Minutos
                </button>
              ))}
            </div>

            {/* Timer visual */}
            <div className="text-5xl font-black tracking-tight text-stone-800 font-mono my-2">
              {formatTime(secondsLeft)}
            </div>

            {/* Progress bar */}
            <div className="w-full bg-stone-200/80 rounded-full h-2.5 my-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-amber-400 to-rose-500 h-2.5 rounded-full transition-all duration-1000"
                style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
              />
            </div>

            {/* Play/Pause & Reset Controls */}
            <div className="flex items-center justify-center gap-3 mt-4">
              <button
                onClick={handleStartPause}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl text-xs font-bold text-white shadow-md transition-transform cursor-pointer hover:scale-105 active:scale-95 ${
                  isActive ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {isActive ? (
                  <>
                    <Pause className="w-4 h-4 fill-white" />
                    <span>Pausar</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    <span>{secondsLeft === selectedMinutes * 60 ? '¡Comenzar Reset!' : 'Reanudar'}</span>
                  </>
                )}
              </button>

              <button
                onClick={() => handleResetTimer(selectedMinutes)}
                className="p-2.5 bg-white text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-2xl border border-stone-200 transition-colors cursor-pointer"
                title="Reiniciar tiempo"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Missions by Family Member */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" /> Misiones de cada integrante
              </h4>
              <span className="text-xs font-semibold text-stone-500">
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
                    <div className="flex items-start gap-3">
                      <Avatar
                        name={member ? member.name : mission.memberId}
                        emoji={member?.avatarEmoji}
                        color={member?.avatarColor}
                        size="md"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-stone-900">
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

                    <div className="pt-0.5">
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
        </div>
      )}
    </Modal>
  );
};
