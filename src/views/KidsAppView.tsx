import React, { useState, useEffect } from 'react';
import { kidAuthService } from '../services/kidAuthService';
import { KidLocalDeviceAuth } from '../types/kids';
import { KidsPinpadScreen } from '../components/kids/KidsPinpadScreen';
import { KidsLinkingScreen } from '../components/kids/KidsLinkingScreen';
import { KidsDashboardView } from '../components/kids/KidsDashboardView';
import { Sparkles, Smartphone, ShieldCheck, RefreshCw, AlertCircle, ArrowLeft } from 'lucide-react';

interface KidsAppViewProps {
  onExitToAdult?: () => void;
}

export const KidsAppView: React.FC<KidsAppViewProps> = ({ onExitToAdult }) => {
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [linkedDevice, setLinkedDevice] = useState<KidLocalDeviceAuth | null>(null);
  const [deviceStatus, setDeviceStatus] = useState<'checking' | 'pending_approval' | 'active' | 'revoked' | 'unlinked'>('checking');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Check URL query parameters and local device auth on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let tokenFromUrl = params.get('token') || params.get('kid_token');
    if (!tokenFromUrl && window.location.hash) {
      const hashQuery = window.location.hash.split('?')[1];
      if (hashQuery) {
        const hashParams = new URLSearchParams(hashQuery);
        tokenFromUrl = hashParams.get('token') || hashParams.get('kid_token');
      }
    }

    if (tokenFromUrl) {
      setInviteToken(tokenFromUrl.trim());
      setDeviceStatus('checking');
      return;
    }

    checkStoredDevice();
  }, []);

  const checkStoredDevice = async () => {
    setDeviceStatus('checking');
    const device = kidAuthService.getLinkedDevice();

    if (!device) {
      setLinkedDevice(null);
      setDeviceStatus('unlinked');
      return;
    }

    setLinkedDevice(device);

    try {
      const activation = await kidAuthService.checkActivation();
      if (activation.status === 'active') {
        setDeviceStatus('active');
      } else if (activation.status === 'pending_approval') {
        setDeviceStatus('pending_approval');
      } else if (activation.status === 'revoked') {
        setDeviceStatus('revoked');
        setStatusMessage('Este dispositivo fue desvinculado por mamá o papá.');
      } else {
        setDeviceStatus('unlinked');
      }
    } catch {
      // In offline / network glitch, fallback to stored device
      setDeviceStatus('active');
    }
  };

  const handleLinkSuccess = () => {
    // Clear token from url query string without page reload
    const url = new URL(window.location.href);
    url.searchParams.delete('token');
    url.searchParams.delete('kid_token');
    window.history.replaceState({}, '', url.pathname);

    setInviteToken(null);
    checkStoredDevice();
  };

  const handleResetDevice = () => {
    if (confirm('¿Deseas desvincular este dispositivo? Tendrás que pedirle un nuevo enlace a mamá o papá.')) {
      kidAuthService.clearLinkedDevice();
      setLinkedDevice(null);
      setDeviceStatus('unlinked');
      setIsAuthenticated(false);
    }
  };

  const handleExit = () => {
    if (onExitToAdult) {
      onExitToAdult();
    } else {
      window.location.href = '/';
    }
  };

  // 1. Loading check
  if (deviceStatus === 'checking') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-950 via-indigo-950 to-stone-950 text-white flex flex-col items-center justify-center p-6 space-y-4">
        <RefreshCw className="w-10 h-10 text-amber-400 animate-spin" />
        <h2 className="text-xl font-black">Cargando Melomus Kids...</h2>
        <p className="text-xs text-purple-200/70">Comprobando credenciales del dispositivo</p>
      </div>
    );
  }

  // 2. Newly received invite link flow
  if (inviteToken) {
    return (
      <KidsLinkingScreen
        inviteToken={inviteToken}
        onLinkedSuccess={handleLinkSuccess}
        onCancel={() => {
          setInviteToken(null);
          handleExit();
        }}
      />
    );
  }

  // 3. Device registered but waiting for Mom/Dad's explicit approval
  if (deviceStatus === 'pending_approval') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-950 via-indigo-950 to-stone-950 text-white flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300 mx-auto animate-pulse">
            <Smartphone className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white mb-2">
              Esperando aprobación de Mamá o Papá ⏳
            </h2>
            <p className="text-xs sm:text-sm text-purple-200/80 leading-relaxed">
              El dispositivo de <strong className="text-white">{linkedDevice?.childName}</strong> ya fue registrado.
              Para activarlo por seguridad, mamá o papá deben abrir su panel de familia y presionar{' '}
              <strong className="text-amber-300">«Aprobar dispositivo»</strong>.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <button
              onClick={checkStoredDevice}
              className="w-full py-3 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-stone-950 font-black text-xs sm:text-sm rounded-2xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Comprobar aprobación ahora</span>
            </button>

            <button
              onClick={handleResetDevice}
              className="text-xs text-purple-300/60 hover:text-white underline transition cursor-pointer"
            >
              Cancelar o usar otro enlace
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 4. Device revoked
  if (deviceStatus === 'revoked') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-950 via-indigo-950 to-stone-950 text-white flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-300 mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-xl font-black text-white mb-2">
              Dispositivo Desvinculado
            </h2>
            <p className="text-xs text-purple-200/80 leading-relaxed">
              {statusMessage || 'Este dispositivo fue revocado desde el panel de administración familiar.'}
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <button
              onClick={() => {
                kidAuthService.clearLinkedDevice();
                setLinkedDevice(null);
                setDeviceStatus('unlinked');
              }}
              className="w-full py-2.5 bg-white/20 hover:bg-white/30 text-white font-bold text-xs rounded-xl transition cursor-pointer"
            >
              Vincular de nuevo
            </button>

            <button
              onClick={handleExit}
              className="text-xs text-purple-300/60 hover:text-white transition cursor-pointer"
            >
              Volver al inicio
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 5. Unlinked device (no device in localStorage and no token in URL)
  if (deviceStatus === 'unlinked' || !linkedDevice) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-950 via-indigo-950 to-stone-950 text-white flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="w-20 h-20 rounded-3xl bg-amber-400/20 border-2 border-amber-400/40 flex items-center justify-center text-amber-300 mx-auto shadow-inner">
            <Sparkles className="w-10 h-10" />
          </div>

          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-amber-300 bg-amber-400/20 px-3 py-1 rounded-full border border-amber-300/30 inline-block mb-2">
              Melomus Kids
            </span>
            <h2 className="text-2xl font-black text-white mb-2">
              ¡Bienvenido a tu espacio!
            </h2>
            <p className="text-xs sm:text-sm text-purple-200/80 leading-relaxed">
              Para usar este dispositivo (tablet o celular), pídele a mamá o a papá que te envíen un enlace de vinculación desde su celular.
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-left space-y-2 text-xs text-purple-200/90">
            <p className="font-bold text-white flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>¿Cómo funciona?</span>
            </p>
            <ol className="list-decimal list-inside space-y-1 text-purple-200/70">
              <li>Mamá o papá van a Familia &gt; Ficha del niño</li>
              <li>Presionan «Vincular dispositivo infantil»</li>
              <li>Te envían el enlace por WhatsApp</li>
              <li>Abres el enlace, eliges tu PIN y listo</li>
            </ol>
          </div>

          <div className="pt-2">
            <button
              onClick={handleExit}
              className="w-full py-3 bg-white/15 hover:bg-white/25 active:scale-98 text-white font-bold text-xs rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Ir al acceso para adultos</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 6. Active device, but PIN is locked (requires PIN entry to access dashboard)
  if (!isAuthenticated) {
    return (
      <KidsPinpadScreen
        childName={linkedDevice.childName}
        avatarEmoji={linkedDevice.avatarEmoji}
        avatarColor={linkedDevice.avatarColor}
        familyName={linkedDevice.familyName}
        onVerifyPin={(pin) => kidAuthService.verifyPin(pin)}
        onSuccess={() => setIsAuthenticated(true)}
        onSwitchToAdult={handleExit}
        onResetDevice={handleResetDevice}
      />
    );
  }

  // 7. Active device and authenticated: render Dashboard
  return (
    <KidsDashboardView
      onLockScreen={() => setIsAuthenticated(false)}
    />
  );
};
