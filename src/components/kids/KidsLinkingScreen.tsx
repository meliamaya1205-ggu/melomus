import React, { useState, useEffect, useRef } from 'react';
import { kidAuthService } from '../../services/kidAuthService';
import { KidDeviceInviteDetails } from '../../types/kids';
import { Avatar } from '../common/Avatar';
import { triggerConfetti } from '../common/ConfettiCelebration';
import {
  Sparkles,
  ShieldCheck,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Clock,
  ArrowLeft,
} from 'lucide-react';

interface KidsLinkingScreenProps {
  inviteToken: string;
  onLinkedSuccess: () => void;
  onCancel: () => void;
}

export const KidsLinkingScreen: React.FC<KidsLinkingScreenProps> = ({
  inviteToken,
  onLinkedSuccess,
  onCancel,
}) => {
  const [step, setStep] = useState<'loading' | 'form' | 'waiting_approval' | 'error'>('loading');
  const [inviteDetails, setInviteDetails] = useState<KidDeviceInviteDetails | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form states
  const [deviceName, setDeviceName] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Polling ref for waiting step
  const pollIntervalRef = useRef<number | null>(null);

  // 1. Load invite token details
  useEffect(() => {
    let isMounted = true;

    async function loadDetails() {
      setStep('loading');
      setErrorMessage(null);

      const result = await kidAuthService.getInviteDetails(inviteToken);
      if (!isMounted) return;

      if (result.success && result.data) {
        setInviteDetails(result.data);
        setDeviceName(result.data.deviceNameHint || `Dispositivo de ${result.data.childName}`);
        setStep('form');
      } else {
        setErrorMessage(result.error || 'El enlace de vinculación no es válido o ya caducó.');
        setStep('error');
      }
    }

    if (inviteToken) {
      loadDetails();
    } else {
      setErrorMessage('No se proporcionó ningún token de vinculación.');
      setStep('error');
    }

    return () => {
      isMounted = false;
    };
  }, [inviteToken]);

  // 2. Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // 3. Start polling once in waiting_approval
  const startApprovalPolling = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    pollIntervalRef.current = window.setInterval(async () => {
      const res = await kidAuthService.checkActivation();
      if (res.status === 'active') {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        triggerConfetti();
        setTimeout(() => {
          onLinkedSuccess();
        }, 1200);
      }
    }, 3000);
  };

  const handleManualCheck = async () => {
    setIsSubmitting(true);
    try {
      const res = await kidAuthService.checkActivation();
      if (res.status === 'active') {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        triggerConfetti();
        setTimeout(() => {
          onLinkedSuccess();
        }, 800);
      } else {
        alert('Aún estamos esperando que mamá o papá aprueben la solicitud desde su celular ⏳');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!deviceName.trim()) {
      setFormError('Por favor escribe un nombre para este dispositivo');
      return;
    }

    if (!/^\d{4}$/.test(pin)) {
      setFormError('El PIN debe tener exactamente 4 números');
      return;
    }

    if (pin !== confirmPin) {
      setFormError('Los dos PIN no coinciden. Escríbelos iguales');
      return;
    }

    if (!inviteDetails) return;

    setIsSubmitting(true);
    try {
      const result = await kidAuthService.registerDeviceRequest({
        token: inviteToken,
        pin,
        deviceName: deviceName.trim(),
        childDetails: inviteDetails,
      });

      if (result.success) {
        setStep('waiting_approval');
        startApprovalPolling();
      } else {
        setFormError(result.error || 'No se pudo registrar la solicitud de vinculación');
      }
    } catch {
      setFormError('Error de conexión al enviar la solicitud');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 via-indigo-950 to-stone-950 text-white flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Glow decoration */}
        <div className="absolute -top-20 -right-20 w-44 h-44 bg-pink-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-44 h-44 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Step: Loading */}
        {step === 'loading' && (
          <div className="py-12 flex flex-col items-center text-center space-y-4">
            <RefreshCw className="w-10 h-10 text-amber-300 animate-spin" />
            <h2 className="text-xl font-black text-white">Verificando enlace...</h2>
            <p className="text-xs text-purple-200/70">
              Conectando con el espacio familiar seguro de Melomus
            </p>
          </div>
        )}

        {/* Step: Error */}
        {step === 'error' && (
          <div className="py-8 flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-300">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-white">Enlace no válido</h2>
            <p className="text-xs text-rose-200/90 bg-rose-950/60 p-3 rounded-2xl border border-rose-800">
              {errorMessage}
            </p>
            <p className="text-xs text-purple-200/70">
              Pídele a mamá o a papá que te envíen un nuevo enlace desde la sección de Familia en su aplicación.
            </p>
            <button
              onClick={onCancel}
              className="mt-4 px-6 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-xs font-bold transition cursor-pointer"
            >
              Volver al Inicio
            </button>
          </div>
        )}

        {/* Step: Form */}
        {step === 'form' && inviteDetails && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <button
                type="button"
                onClick={onCancel}
                className="flex items-center gap-1.5 text-xs text-purple-200/70 hover:text-white transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Cancelar</span>
              </button>
              <span className="text-[11px] font-bold tracking-wide uppercase text-amber-300 bg-amber-400/20 px-2.5 py-1 rounded-full border border-amber-300/30">
                Acceso Infantil
              </span>
            </div>

            {/* Child Profile Banner */}
            <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
              <Avatar
                name={inviteDetails.childName}
                emoji={inviteDetails.avatarEmoji}
                color={inviteDetails.avatarColor}
                size="lg"
                className="ring-2 ring-white/30"
              />
              <div>
                <h3 className="text-lg font-black text-white">
                  ¡Hola, {inviteDetails.childName}! 👋
                </h3>
                <p className="text-xs text-purple-200/80">
                  {inviteDetails.familyName}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-purple-200 mb-1 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-amber-400" />
                  <span>Nombre para este celular o tablet</span>
                </label>
                <input
                  type="text"
                  required
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  placeholder="Ej: Tablet de Annie, Celular de Axel"
                  className="w-full px-4 py-2.5 bg-black/30 border border-white/20 rounded-xl text-sm text-white placeholder-purple-300/40 focus:outline-hidden focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-purple-200 mb-1 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    <span>Crea tu PIN (4 dígitos)</span>
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    pattern="[0-9]*"
                    required
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    className="w-full px-4 py-2.5 bg-black/30 border border-white/20 rounded-xl text-center text-lg font-black tracking-widest text-amber-300 focus:outline-hidden focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-purple-200 mb-1">
                    Repite tu PIN
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    pattern="[0-9]*"
                    required
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    className="w-full px-4 py-2.5 bg-black/30 border border-white/20 rounded-xl text-center text-lg font-black tracking-widest text-amber-300 focus:outline-hidden focus:border-amber-400"
                  />
                </div>
              </div>

              {formError && (
                <p className="text-xs text-rose-300 bg-rose-950/60 p-2.5 rounded-xl border border-rose-800">
                  {formError}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting || pin.length !== 4 || confirmPin.length !== 4}
                className="w-full py-3.5 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 active:scale-98 text-stone-950 font-black text-sm rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Guardando PIN...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Guardar y Solicitar Aprobación</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Step: Waiting for Parent Approval */}
        {step === 'waiting_approval' && (
          <div className="py-6 flex flex-col items-center text-center space-y-5">
            <div className="relative">
              <div className="w-20 h-20 rounded-3xl bg-amber-400/20 border-2 border-amber-400/40 flex items-center justify-center text-amber-300 animate-pulse">
                <Clock className="w-10 h-10" />
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500" />
              </span>
            </div>

            <div>
              <h2 className="text-xl font-black text-white mb-1">
                Esperando aprobación de mamá o papá 🌟
              </h2>
              <p className="text-xs text-purple-200/80 max-w-xs mx-auto">
                Tu PIN ya está guardado en este dispositivo. Por seguridad, mamá o papá deben abrir su aplicación y presionar{' '}
                <strong className="text-amber-300 font-bold">«Aprobar dispositivo»</strong>.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 w-full text-left space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>PIN de 4 dígitos creado</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-300 animate-pulse">
                <Clock className="w-4 h-4 shrink-0" />
                <span>Esperando confirmación de un adulto...</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 w-full pt-2">
              <button
                type="button"
                onClick={handleManualCheck}
                disabled={isSubmitting}
                className="w-full py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <span>Comprobar aprobación ahora</span>
                )}
              </button>

              <button
                type="button"
                onClick={onCancel}
                className="text-xs text-purple-300/60 hover:text-white transition py-1 cursor-pointer"
              >
                Cancelar y salir
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
