import React, { useState, useEffect } from 'react';
import { Avatar } from '../common/Avatar';
import { Delete, Lock, AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react';

interface KidsPinpadScreenProps {
  childName: string;
  avatarEmoji?: string;
  avatarColor?: string;
  familyName?: string;
  onVerifyPin: (pin: string) => Promise<{
    success: boolean;
    isLocked?: boolean;
    remainingAttempts?: number;
    error?: string;
  }>;
  onSuccess: () => void;
  onSwitchToAdult: () => void;
  onResetDevice?: () => void;
}

export const KidsPinpadScreen: React.FC<KidsPinpadScreenProps> = ({
  childName,
  avatarEmoji = '🌟',
  avatarColor = '#8b5cf6',
  familyName = 'Mi Hogar',
  onVerifyPin,
  onSuccess,
  onSwitchToAdult,
  onResetDevice,
}) => {
  const [pin, setPin] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [shake, setShake] = useState(false);

  // Auto-verify when 4 digits are entered
  useEffect(() => {
    if (pin.length === 4 && !isVerifying && !isLocked) {
      handlePinSubmit(pin);
    }
  }, [pin]);

  const handlePinSubmit = async (fullPin: string) => {
    setIsVerifying(true);
    setErrorMessage(null);

    try {
      const result = await onVerifyPin(fullPin);
      if (result.success) {
        onSuccess();
      } else {
        setShake(true);
        setTimeout(() => setShake(false), 500);
        setPin('');

        if (result.isLocked) {
          setIsLocked(true);
          setErrorMessage('Demasiados intentos fallidos. Dispositivo bloqueado temporalmente por seguridad (15 minutos).');
        } else {
          setErrorMessage(result.error || 'PIN incorrecto. ¡Inténtalo de nuevo!');
          if (result.remainingAttempts !== undefined) {
            setRemainingAttempts(result.remainingAttempts);
          }
        }
      }
    } catch {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setPin('');
      setErrorMessage('Error al verificar. Revisa tu conexión.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDigitPress = (digit: string) => {
    if (isVerifying || isLocked || pin.length >= 4) return;
    setErrorMessage(null);
    setPin((prev) => prev + digit);
  };

  const handleDelete = () => {
    if (isVerifying || isLocked) return;
    setPin((prev) => prev.slice(0, -1));
    setErrorMessage(null);
  };

  const handleClear = () => {
    if (isVerifying || isLocked) return;
    setPin('');
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 via-indigo-950 to-stone-950 text-white flex flex-col justify-between items-center p-6 select-none font-sans">
      {/* Top Header */}
      <div className="w-full max-w-sm flex items-center justify-between pt-2">
        <button
          onClick={onSwitchToAdult}
          className="flex items-center gap-1.5 text-xs font-semibold text-purple-200/80 hover:text-white px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-xs transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Acceso Padres</span>
        </button>

        <span className="text-xs font-medium text-purple-200/60 truncate max-w-[150px]">
          {familyName}
        </span>
      </div>

      {/* Main Avatar & Greeting */}
      <div className="flex flex-col items-center text-center my-auto w-full max-w-sm">
        <div className="relative mb-3 animate-in zoom-in-95 duration-200">
          <div
            className="w-24 h-24 rounded-3xl p-1 shadow-2xl flex items-center justify-center ring-4 ring-white/30"
            style={{ backgroundColor: avatarColor }}
          >
            <Avatar
              name={childName}
              emoji={avatarEmoji}
              color={avatarColor}
              size="xl"
              className="w-20 h-20 text-4xl"
            />
          </div>
          <span className="absolute -bottom-2 -right-2 text-2xl filter drop-shadow">
            ⭐
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-1">
          ¡Hola, {childName}!
        </h1>
        <p className="text-xs sm:text-sm text-purple-200/80 font-medium max-w-xs mb-6">
          Ingresa tu PIN secreto de 4 dígitos para ver tus misiones y estrellitas
        </p>

        {/* 4 Dot Indicators */}
        <div
          className={`flex items-center justify-center gap-4 mb-4 ${
            shake ? 'animate-bounce text-rose-400' : ''
          }`}
        >
          {[0, 1, 2, 3].map((index) => {
            const isFilled = pin.length > index;
            return (
              <div
                key={index}
                className={`w-5 h-5 rounded-full transition-all duration-200 flex items-center justify-center ${
                  isFilled
                    ? 'bg-amber-400 scale-110 shadow-lg shadow-amber-400/50 ring-2 ring-white'
                    : 'bg-white/20 border-2 border-white/40'
                }`}
              >
                {isFilled && <div className="w-2 h-2 rounded-full bg-amber-950" />}
              </div>
            );
          })}
        </div>

        {/* Feedback Messages */}
        <div className="min-h-[2.5rem] flex flex-col items-center justify-center text-center px-4">
          {isVerifying ? (
            <div className="flex items-center gap-2 text-xs font-bold text-amber-300 animate-pulse">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Verificando tu PIN...</span>
            </div>
          ) : errorMessage ? (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-300 bg-rose-950/60 border border-rose-800/80 px-3 py-1.5 rounded-xl animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          ) : remainingAttempts !== null && remainingAttempts < 5 ? (
            <span className="text-xs font-medium text-amber-300/90">
              Te quedan {remainingAttempts} intento{remainingAttempts === 1 ? '' : 's'}
            </span>
          ) : (
            <span className="text-xs text-purple-200/40">🔒 Acceso Infantil Protegido</span>
          )}
        </div>

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 w-full max-w-[280px] mt-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              disabled={isVerifying || isLocked}
              onClick={() => handleDigitPress(digit)}
              className="h-16 sm:h-18 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 active:bg-white/30 text-2xl font-bold text-white shadow-lg backdrop-blur-md border border-white/15 transition-all cursor-pointer flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {digit}
            </button>
          ))}

          {/* Bottom row: Clear, 0, Backspace */}
          <button
            type="button"
            disabled={isVerifying || isLocked || pin.length === 0}
            onClick={handleClear}
            className="h-16 sm:h-18 rounded-2xl bg-white/5 hover:bg-white/15 active:scale-95 text-xs font-bold text-purple-200 shadow-md backdrop-blur-md border border-white/10 transition cursor-pointer flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Borrar
          </button>

          <button
            type="button"
            disabled={isVerifying || isLocked}
            onClick={() => handleDigitPress('0')}
            className="h-16 sm:h-18 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 active:bg-white/30 text-2xl font-bold text-white shadow-lg backdrop-blur-md border border-white/15 transition-all cursor-pointer flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
          >
            0
          </button>

          <button
            type="button"
            disabled={isVerifying || isLocked || pin.length === 0}
            onClick={handleDelete}
            className="h-16 sm:h-18 rounded-2xl bg-white/5 hover:bg-white/15 active:scale-95 text-purple-200 shadow-md backdrop-blur-md border border-white/10 transition cursor-pointer flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
            title="Borrar dígito"
          >
            <Delete className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Bottom Footer Options */}
      <div className="w-full max-w-sm flex items-center justify-center pt-4 pb-2 text-center text-xs text-purple-300/60">
        {onResetDevice && (
          <button
            onClick={onResetDevice}
            className="hover:text-purple-200 underline transition cursor-pointer"
          >
            ¿No es tu tablet o celular? Desvincular dispositivo
          </button>
        )}
      </div>
    </div>
  );
};
